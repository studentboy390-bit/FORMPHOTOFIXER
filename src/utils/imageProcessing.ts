import { jsPDF } from 'jspdf';
import type {
  AppMode,
  CompressionResult,
  DimensionUnit,
  ProcessingSettings,
  SharpnessReport,
  SignatureInkColor,
  TransformState,
} from '../types/fixer';
import { binarySearchCompression, CM_PER_INCH, MM_PER_INCH, sanitizeDpi } from './unitsAndPresets';

/**
 * Computes Laplacian variance on grayscale luminance to estimate image sharpness.
 */
export function computeLaplacianSharpness(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): SharpnessReport {
  if (width < 4 || height < 4) {
    return { variance: 0, status: 'blurry', label: 'Too small to measure' };
  }

  // Sample onto a max 256px grid for fast deterministic performance
  const step = Math.max(1, Math.floor(Math.max(width, height) / 256));
  const sw = Math.floor(width / step);
  const sh = Math.floor(height / step);
  if (sw < 4 || sh < 4) {
    return { variance: 0, status: 'blurry', label: 'Too small to measure' };
  }

  const gray = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    const sy = y * step;
    for (let x = 0; x < sw; x++) {
      const sx = x * step;
      const idx = (sy * width + sx) * 4;
      gray[y * sw + x] = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
    }
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const lap =
        gray[i - sw] +
        gray[i + sw] +
        gray[i - 1] +
        gray[i + 1] -
        4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);

  if (variance >= 140) {
    return {
      variance: Math.round(variance),
      status: 'sharp',
      label: `Sharp (${Math.round(variance)} score)`,
    };
  }
  if (variance >= 45) {
    return {
      variance: Math.round(variance),
      status: 'acceptable',
      label: `Acceptable (${Math.round(variance)} score)`,
    };
  }
  return {
    variance: Math.round(variance),
    status: 'blurry',
    label: `Soft / Blurry (${Math.round(variance)} score)`,
  };
}

/**
 * Integral-image adaptive thresholding for handwritten signatures.
 * Eliminates shadows, yellowish paper, and faint lined paper while keeping crisp ink.
 */
export function applyAdaptiveSignatureFilter(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  inkColor: SignatureInkColor
): void {
  const n = width * height;
  const gray = new Float32Array(n);
  const integral = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      // Favor blue/dark ink contrast over pale ruled lines
      const lum = 0.34 * r + 0.50 * g + 0.16 * b;
      gray[y * width + x] = lum;
      rowSum += lum;
      integral[(y + 1) * (width + 1) + (x + 1)] =
        integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  const radius = Math.max(8, Math.round(Math.min(width, height) * 0.06));
  const inkRgb = inkColor === 'blue' ? [22, 54, 148] : [15, 23, 42];

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);

      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (width + 1) + (x1 + 1)] -
        integral[y0 * (width + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (width + 1) + x0] +
        integral[y0 * (width + 1) + x0];
      const localMean = sum / area;

      const lum = gray[y * width + x];
      const diff = localMean - lum;
      const idx = (y * width + x) * 4;

      // Smooth ramp between pure background (#FFFFFF) and crisp ink;
      // suppresses faint ruled notebook lines while preserving pen strokes
      const threshold = 24;
      const feather = 14;
      if (diff <= threshold || lum > 218) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;
      } else if (diff >= threshold + feather) {
        rgba[idx] = inkRgb[0];
        rgba[idx + 1] = inkRgb[1];
        rgba[idx + 2] = inkRgb[2];
        rgba[idx + 3] = 255;
      } else {
        const t = (diff - threshold) / feather;
        rgba[idx] = Math.round(255 + (inkRgb[0] - 255) * t);
        rgba[idx + 1] = Math.round(255 + (inkRgb[1] - 255) * t);
        rgba[idx + 2] = Math.round(255 + (inkRgb[2] - 255) * t);
        rgba[idx + 3] = 255;
      }
    }
  }
}

/**
 * Edge-protected background lightener/whitener for passport photos & documents.
 * Samples border backdrop tone and smoothly whitens outer non-subject regions
 * while preserving portrait details, hair edges, and text strokes.
 */
export function applyEdgeProtectedBackgroundClean(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  mode: AppMode
): void {
  if (strength <= 0) return;
  const factor = Math.min(1, Math.max(0, strength / 100));

  // Estimate dominant border background color from top/left/right edges
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let sampleCount = 0;
  const borderRows = Math.max(2, Math.floor(height * 0.1));
  for (let y = 0; y < borderRows; y += 2) {
    for (let x = 0; x < width; x += 4) {
      if (x < width * 0.25 || x > width * 0.75 || y < borderRows * 0.5) {
        const idx = (y * width + x) * 4;
        bgR += rgba[idx];
        bgG += rgba[idx + 1];
        bgB += rgba[idx + 2];
        sampleCount++;
      }
    }
  }
  if (sampleCount > 0) {
    bgR /= sampleCount;
    bgG /= sampleCount;
    bgB /= sampleCount;
  } else {
    bgR = 230;
    bgG = 230;
    bgB = 230;
  }

  // Compute luminance + edge gradient for edge protection
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    lum[i] = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
  }

  const smoothstep = (edge0: number, edge1: number, val: number) => {
    const t = Math.max(0, Math.min(1, (val - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const idx = i * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      // Local gradient magnitude
      const lx = x > 0 && x < width - 1 ? Math.abs(lum[i + 1] - lum[i - 1]) : 0;
      const ly = y > 0 && y < height - 1 ? Math.abs(lum[i + width] - lum[i - width]) : 0;
      const grad = lx + ly;

      // Color similarity to sampled background with smooth falloff
      const colorDist = Math.sqrt(
        (r - bgR) * (r - bgR) + (g - bgG) * (g - bgG) + (b - bgB) * (b - bgB)
      );
      const maxDist = 115 + factor * 85;
      const bgSimilarity = 1 - smoothstep(18, maxDist, colorDist);

      // Protect central portrait silhouette with smooth elliptical feathering
      let subjectProtection = 0;
      if (mode === 'photo') {
        const nx = (x / width - 0.5) / 0.32;
        const ny = (y / height - 0.56) / 0.42;
        const radial = Math.sqrt(nx * nx + ny * ny);
        subjectProtection = (1 - smoothstep(0.72, 1.38, radial)) * 0.94;
      }

      // Skin-tone protection (YCbCr)
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkin = cb >= 77 && cb <= 129 && cr >= 132 && cr <= 175;

      const edgeGuard = smoothstep(8, 52, grad);

      let whitenWeight = 0;
      if (mode === 'document') {
        const paperScore = smoothstep(135, 205, lum[i]);
        whitenWeight = paperScore * (1 - edgeGuard * 0.85) * factor;
      } else {
        whitenWeight =
          bgSimilarity *
          (1 - edgeGuard * 0.9) *
          (1 - subjectProtection) *
          (isSkin ? 0.1 : 1) *
          factor;
      }

      if (whitenWeight > 0.005) {
        rgba[idx] = Math.round(r + (255 - r) * whitenWeight);
        rgba[idx + 1] = Math.round(g + (255 - g) * whitenWeight);
        rgba[idx + 2] = Math.round(b + (255 - b) * whitenWeight);
      }
    }
  }
}

/**
 * Pure skin-tone + upper-body centroid detector for offline face centering.
 * Returns normalized bounding box of detected face/head in [0..1] image coordinates.
 */
export function detectSkinToneFaceBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): { cx: number; cy: number; boxW: number; boxH: number; detected: boolean } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  // Focus on upper 75% of image where face normally appears in portraits
  const yLimit = Math.floor(height * 0.78);
  const step = Math.max(1, Math.floor(Math.min(width, height) / 140));

  for (let y = Math.floor(height * 0.04); y < yLimit; y += step) {
    for (let x = Math.floor(width * 0.08); x < Math.floor(width * 0.92); x += step) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (cb >= 78 && cb <= 127 && cr >= 133 && cr <= 173 && lum > 45 && lum < 240) {
        sumX += x;
        sumY += y;
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 24) {
    return { cx: 0.5, cy: 0.42, boxW: 0.35, boxH: 0.42, detected: false };
  }

  const cx = sumX / count / width;
  const cy = sumY / count / height;
  const boxW = Math.max(0.18, Math.min(0.75, (maxX - minX) / width));
  const boxH = Math.max(0.20, Math.min(0.75, (maxY - minY) / height));

  return { cx, cy, boxW, boxH, detected: true };
}

interface NativeFaceDetectorResult {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface NativeFaceDetectorCtor {
  new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }): {
    detect: (img: HTMLImageElement | HTMLCanvasElement) => Promise<NativeFaceDetectorResult[]>;
  };
}

/**
 * Automatically detects the face using browser FaceDetector API (if available)
 * with deterministic skin-tone centroid fallback, returning ideal TransformState
 * to center the face inside the passport oval guide with proper headroom.
 */
export async function computeAutoCenterTransform(
  img: HTMLImageElement,
  targetAspectRatio: number
): Promise<{ transform: TransformState; method: 'FaceDetector API' | 'Skin-Tone Centroid' }> {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  let faceCx = 0.5;
  let faceCy = 0.42;
  let faceH = 0.42;
  let method: 'FaceDetector API' | 'Skin-Tone Centroid' = 'Skin-Tone Centroid';

  const maybeWindow = window as unknown as { FaceDetector?: NativeFaceDetectorCtor };
  if (typeof maybeWindow.FaceDetector === 'function') {
    try {
      const detector = new maybeWindow.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        faceCx = (box.x + box.width / 2) / iw;
        faceCy = (box.y + box.height / 2) / ih;
        faceH = box.height / ih;
        method = 'FaceDetector API';
      }
    } catch {
      // Fallback gracefully below
    }
  }

  if (method === 'Skin-Tone Centroid') {
    const tmp = document.createElement('canvas');
    const maxDim = 240;
    const scale = Math.min(1, maxDim / Math.max(iw, ih));
    tmp.width = Math.max(16, Math.round(iw * scale));
    tmp.height = Math.max(16, Math.round(ih * scale));
    const ctx = tmp.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
      const data = ctx.getImageData(0, 0, tmp.width, tmp.height);
      const bounds = detectSkinToneFaceBounds(data.data, tmp.width, tmp.height);
      if (bounds.detected) {
        faceCx = bounds.cx;
        faceCy = bounds.cy;
        faceH = bounds.boxH;
      }
    }
  }

  // Desired face center inside passport frame: horizontal 0.5, vertical ~0.41 (leaves ~12-16% headroom)
  // Desired face height ~0.48 of crop height
  const desiredZoom = Math.min(2.2, Math.max(1.0, 0.48 / Math.max(0.22, faceH)));

  // Convert normalized image center shift to normalized crop offset
  const imgAspect = iw / ih;
  const coverWidthRatio = imgAspect > targetAspectRatio ? imgAspect / targetAspectRatio : 1;
  const coverHeightRatio = imgAspect < targetAspectRatio ? targetAspectRatio / imgAspect : 1;

  const offsetX = Math.max(-0.6, Math.min(0.6, (0.5 - faceCx) * desiredZoom * coverWidthRatio));
  const offsetY = Math.max(-0.6, Math.min(0.6, (0.41 - faceCy) * desiredZoom * coverHeightRatio));

  return {
    transform: {
      zoom: Number(desiredZoom.toFixed(2)),
      offsetX: Number(offsetX.toFixed(3)),
      offsetY: Number(offsetY.toFixed(3)),
      rotate90: 0,
      tiltDeg: 0,
    },
    method,
  };
}

function formatDopDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Renders the cropped, rotated, AI-enhanced, and optionally DOP-stamped output canvas.
 */
export function renderOutputCanvas(
  img: HTMLImageElement,
  targetWidthPx: number,
  targetHeightPx: number,
  transform: TransformState,
  settings: ProcessingSettings,
  mode: AppMode
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidthPx));
  canvas.height = Math.max(1, Math.round(targetHeightPx));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Fill pure white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const showDop = mode === 'photo' && settings.dopEnabled;
  const dopStripHeight = showDop ? Math.max(36, Math.round(canvas.height * 0.16)) : 0;
  const photoAreaH = Math.max(1, canvas.height - dopStripHeight);
  const photoAreaW = canvas.width;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const isOddRot = Math.abs(transform.rotate90 % 180) === 90;
  const effW = isOddRot ? ih : iw;
  const effH = isOddRot ? iw : ih;

  // Cover scale for photoAreaW x photoAreaH
  const baseScale = Math.max(photoAreaW / effW, photoAreaH / effH);
  const totalScale = baseScale * transform.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, photoAreaW, photoAreaH);
  ctx.clip();

  const centerX = photoAreaW / 2 + transform.offsetX * photoAreaW;
  const centerY = photoAreaH / 2 + transform.offsetY * photoAreaH;
  ctx.translate(centerX, centerY);

  const totalRad = ((transform.rotate90 + transform.tiltDeg) * Math.PI) / 180;
  ctx.rotate(totalRad);
  ctx.scale(totalScale, totalScale);
  ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  ctx.restore();

  // Apply pixel-level AI enhancements to photo/signature area
  const needBackgroundClean = settings.backgroundCleanStrength > 0 && !(mode === 'signature' && settings.signatureEnhance);
  const needSignatureEnhance = mode === 'signature' && settings.signatureEnhance;

  if (needBackgroundClean || needSignatureEnhance) {
    const imgData = ctx.getImageData(0, 0, photoAreaW, photoAreaH);
    if (needSignatureEnhance) {
      applyAdaptiveSignatureFilter(imgData.data, photoAreaW, photoAreaH, settings.signatureInk);
    } else if (needBackgroundClean) {
      applyEdgeProtectedBackgroundClean(
        imgData.data,
        photoAreaW,
        photoAreaH,
        settings.backgroundCleanStrength,
        mode
      );
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Draw SSC-style white DOP strip at bottom
  if (showDop) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, photoAreaH, canvas.width, dopStripHeight);

    // Subtle hairline top separator
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, photoAreaH, canvas.width, 1);

    const candidateName = settings.dopName.trim().toUpperCase() || 'CANDIDATE NAME';
    const dateText = settings.dopDate ? `DOP: ${formatDopDate(settings.dopDate)}` : 'DOP: DD-MM-YYYY';

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxTextWidth = canvas.width * 0.92;
    let nameFontSize = Math.max(9, Math.round(dopStripHeight * 0.34));
    ctx.font = `700 ${nameFontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
    while (ctx.measureText(candidateName).width > maxTextWidth && nameFontSize > 7) {
      nameFontSize -= 1;
      ctx.font = `700 ${nameFontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
    }
    ctx.fillText(candidateName, canvas.width / 2, photoAreaH + dopStripHeight * 0.34);

    let dateFontSize = Math.max(8, Math.round(dopStripHeight * 0.29));
    ctx.font = `600 ${dateFontSize}px "JetBrains Mono", monospace`;
    while (ctx.measureText(dateText).width > maxTextWidth && dateFontSize > 7) {
      dateFontSize -= 1;
      ctx.font = `600 ${dateFontSize}px "JetBrains Mono", monospace`;
    }
    ctx.fillText(dateText, canvas.width / 2, photoAreaH + dopStripHeight * 0.72);
  }

  return canvas;
}

/**
 * Injects exact physical DPI (APP0 JFIF units=1) into a JPEG Uint8Array
 * and optionally inserts a benign COM metadata block if needed to meet strict minBytes floors.
 */
export function patchJpegDpiAndSize(
  jpegBytes: Uint8Array,
  dpi: number,
  minBytesForFloor?: number
): Uint8Array {
  const safeDpi = sanitizeDpi(dpi);
  const out = new Uint8Array(jpegBytes);

  // Verify JPEG SOI (FF D8) and JFIF APP0 (FF E0 ... 'JFIF\0')
  if (
    out.length >= 20 &&
    out[0] === 0xff &&
    out[1] === 0xd8 &&
    out[2] === 0xff &&
    out[3] === 0xe0 &&
    out[6] === 0x4a &&
    out[7] === 0x46 &&
    out[8] === 0x49 &&
    out[9] === 0x46 &&
    out[10] === 0x00
  ) {
    // Byte 13: units (1 = dots per inch)
    out[13] = 1;
    // Bytes 14..15: Xdensity big-endian
    out[14] = (safeDpi >> 8) & 0xff;
    out[15] = safeDpi & 0xff;
    // Bytes 16..17: Ydensity big-endian
    out[16] = (safeDpi >> 8) & 0xff;
    out[17] = safeDpi & 0xff;
  }

  // If minBytesForFloor is specified and image is slightly below minBytes (e.g., pure white signature),
  // insert a clean JFIF COM (FF FE) comment segment right after APP0 so it satisfies portal minimum KB.
  if (minBytesForFloor && out.length < minBytesForFloor && out.length >= 20) {
    const deficit = minBytesForFloor - out.length;
    if (deficit > 0 && deficit < 65000) {
      const commentDataLen = deficit + 4; // extra safety buffer
      const segmentLen = commentDataLen + 2; // includes 2-byte length field
      const padded = new Uint8Array(out.length + 2 + segmentLen);
      const insertPos = 2 + 2 + ((out[4] << 8) | out[5]); // right after APP0

      padded.set(out.subarray(0, insertPos), 0);
      padded[insertPos] = 0xff;
      padded[insertPos + 1] = 0xfe;
      padded[insertPos + 2] = (segmentLen >> 8) & 0xff;
      padded[insertPos + 3] = segmentLen & 0xff;
      // Fill comment bytes with ASCII spaces (0x20)
      padded.fill(0x20, insertPos + 4, insertPos + 2 + segmentLen);
      padded.set(out.subarray(insertPos), insertPos + 2 + segmentLen);
      return padded;
    }
  }

  return out;
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Canvas JPEG encoding failed'));
          return;
        }
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      'image/jpeg',
      quality
    );
  });
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Runs binary-search JPEG compression targeting [minBytes, maxBytes]
 * and injects exact DPI metadata into the final JPEG file.
 */
export async function compressCanvasToTarget(
  sourceCanvas: HTMLCanvasElement,
  minBytes: number,
  maxBytes: number,
  dpi: number
): Promise<CompressionResult> {
  const encodeAt = async (quality: number, scaleFactor: number) => {
    let workingCanvas = sourceCanvas;
    if (scaleFactor < 0.999) {
      workingCanvas = document.createElement('canvas');
      workingCanvas.width = Math.max(16, Math.round(sourceCanvas.width * scaleFactor));
      workingCanvas.height = Math.max(16, Math.round(sourceCanvas.height * scaleFactor));
      const wctx = workingCanvas.getContext('2d');
      if (wctx) {
        wctx.imageSmoothingEnabled = true;
        wctx.imageSmoothingQuality = 'high';
        wctx.drawImage(sourceCanvas, 0, 0, workingCanvas.width, workingCanvas.height);
      }
    }

    const rawBytes = await canvasToJpegBytes(workingCanvas, quality);
    const patched = patchJpegDpiAndSize(rawBytes, dpi);
    return {
      payload: {
        bytesArray: patched,
        widthPx: workingCanvas.width,
        heightPx: workingCanvas.height,
      },
      bytes: patched.byteLength,
    };
  };

  let result = await binarySearchCompression(minBytes, maxBytes, encodeAt);

  // If even quality 0.99 at 1.0 scale is below minBytes (e.g., clean signature),
  // apply clean JFIF COM floor padding so the JPG satisfies portal Min KB rules.
  if (result.bytes < minBytes && minBytes <= maxBytes) {
    const targetFloor = Math.min(maxBytes, minBytes + Math.min(1024, Math.floor((maxBytes - minBytes) * 0.25)));
    const padded = patchJpegDpiAndSize(result.payload.bytesArray, dpi, targetFloor);
    if (padded.byteLength >= minBytes && padded.byteLength <= maxBytes) {
      result = {
        ...result,
        payload: {
          ...result.payload,
          bytesArray: padded,
        },
        bytes: padded.byteLength,
        withinRange: true,
      };
    }
  }

  const blob = new Blob([result.payload.bytesArray.buffer as ArrayBuffer], { type: 'image/jpeg' });
  const dataUrl = await bytesToDataUrl(result.payload.bytesArray, 'image/jpeg');

  return {
    blob,
    dataUrl,
    bytes: result.bytes,
    quality: result.quality,
    scaleFactor: result.scaleFactor,
    widthPx: result.payload.widthPx,
    heightPx: result.payload.heightPx,
    withinRange: result.withinRange,
  };
}

export function exportCanvasAsPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('PNG export failed'));
      else resolve(blob);
    }, 'image/png');
  });
}

export function dimensionToCm(value: number, unit: DimensionUnit, dpi: number): number {
  const safeDpi = sanitizeDpi(dpi);
  switch (unit) {
    case 'cm':
      return value;
    case 'mm':
      return value / 10;
    case 'in':
      return value * CM_PER_INCH;
    case 'px':
      return (value / safeDpi) * CM_PER_INCH;
  }
}

export function dimensionToMm(value: number, unit: DimensionUnit, dpi: number): number {
  const safeDpi = sanitizeDpi(dpi);
  switch (unit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'in':
      return value * MM_PER_INCH;
    case 'px':
      return (value / safeDpi) * MM_PER_INCH;
  }
}

export function buildPdfBlob(
  jpegDataUrl: string,
  widthVal: number,
  heightVal: number,
  unit: DimensionUnit,
  dpi: number
): Blob {
  const wMm = Math.max(10, dimensionToMm(widthVal, unit, dpi));
  const hMm = Math.max(10, dimensionToMm(heightVal, unit, dpi));
  const orientation = wMm > hMm ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });

  doc.addImage(jpegDataUrl, 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  return doc.output('blob');
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
