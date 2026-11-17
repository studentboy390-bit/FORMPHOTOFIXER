import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CropperCanvas, SAMPLE_IMAGES } from './components/CropperCanvas';
import { CustomPresetModal } from './components/CustomPresetModal';
import { HeaderBar } from './components/HeaderBar';
import { OutputPanel } from './components/OutputPanel';
import type {
  AppMode,
  ComplianceReport,
  CompressionResult,
  DimensionUnit,
  ExamPreset,
  ProcessingSettings,
  SharpnessReport,
  SizeUnit,
  TransformState,
} from './types/fixer';
import {
  buildPdfBlob,
  compressCanvasToTarget,
  computeAutoCenterTransform,
  computeLaplacianSharpness,
  exportCanvasAsPng,
  renderOutputCanvas,
  triggerDownload,
} from './utils/imageProcessing';
import {
  computeLockedHeight,
  computeLockedWidth,
  convertDimension,
  deleteCustomPreset,
  loadCustomPresets,
  OFFICIAL_EXAM_PRESETS,
  sanitizeDpi,
  saveCustomPreset,
  toBytes,
  toPixels,
} from './utils/unitsAndPresets';

const THEME_STORAGE_KEY = 'form_photo_fixer_theme_v1';

const DEFAULT_TRANSFORM: TransformState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate90: 0,
  tiltDeg: 0,
};

const DEFAULT_SETTINGS: ProcessingSettings = {
  signatureEnhance: false,
  signatureInk: 'black',
  backgroundCleanStrength: 0,
  dopEnabled: false,
  dopName: '',
  dopDate: new Date().toISOString().slice(0, 10),
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage quota errors
    }
  }, [isDark]);

  // Presets (official + localStorage custom)
  const [customPresets, setCustomPresets] = useState<ExamPreset[]>(() => loadCustomPresets());
  const allPresets = useMemo(
    () => [...OFFICIAL_EXAM_PRESETS, ...customPresets],
    [customPresets]
  );

  // Active configuration state (defaults to SSC Photo)
  const initialPreset = OFFICIAL_EXAM_PRESETS[0];
  const [mode, setMode] = useState<AppMode>(initialPreset.mode);
  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [widthVal, setWidthVal] = useState<number>(initialPreset.width);
  const [heightVal, setHeightVal] = useState<number>(initialPreset.height);
  const [unit, setUnit] = useState<DimensionUnit>(initialPreset.unit);
  const [dpi, setDpi] = useState<number>(initialPreset.dpi);
  const [isCustomDpi, setIsCustomDpi] = useState<boolean>(false);
  const [aspectLocked, setAspectLocked] = useState<boolean>(true);
  const [minSize, setMinSize] = useState<number>(initialPreset.minSize);
  const [maxSize, setMaxSize] = useState<number>(initialPreset.maxSize);
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>(initialPreset.sizeUnit);

  // Cropper & Image state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState<string>('sample-photo.jpg');
  const [isUsingSample, setIsUsingSample] = useState<boolean>(true);
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_SETTINGS);
  const [autoCenterInfo, setAutoCenterInfo] = useState<string | null>(null);

  // Output & Compliance state
  const [compression, setCompression] = useState<CompressionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sharpness, setSharpness] = useState<SharpnessReport>({
    variance: 0,
    status: 'acceptable',
    label: 'Waiting for image',
  });

  // Modal state
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);

  // Keep latest output canvas ref for PNG download without re-rendering
  const latestCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compressionJobIdRef = useRef<number>(0);

  // Compute exact pixel canvas targets
  const targetWidthPx = useMemo(() => toPixels(widthVal, unit, dpi), [widthVal, unit, dpi]);
  const targetHeightPx = useMemo(() => toPixels(heightVal, unit, dpi), [heightVal, unit, dpi]);

  const loadImageFromUrl = useCallback((url: string, name: string, sampleFlag: boolean) => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(url);
      setImageEl(img);
      setImageName(name);
      setIsUsingSample(sampleFlag);
      setTransform(DEFAULT_TRANSFORM);
      setAutoCenterInfo(null);
    };
    img.src = url;
  }, []);

  // Load initial sample passport portrait on startup
  useEffect(() => {
    loadImageFromUrl(SAMPLE_IMAGES.photo.url, 'sample-passport-photo.jpg', true);
  }, [loadImageFromUrl]);

  const handleLoadSample = useCallback(
    (sampleMode: AppMode) => {
      const entry = SAMPLE_IMAGES[sampleMode];
      const fileLabel =
        sampleMode === 'photo'
          ? 'sample-passport-photo.jpg'
          : sampleMode === 'signature'
            ? 'sample-signature.jpg'
            : 'sample-marksheet.jpg';
      loadImageFromUrl(entry.url, fileLabel, true);
    },
    [loadImageFromUrl]
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          loadImageFromUrl(reader.result, file.name, false);
        }
      };
      reader.readAsDataURL(file);
    },
    [loadImageFromUrl]
  );

  const applyPreset = useCallback(
    (preset: ExamPreset) => {
      setActivePresetId(preset.id);
      setMode(preset.mode);
      setWidthVal(preset.width);
      setHeightVal(preset.height);
      setUnit(preset.unit);
      setDpi(preset.dpi);
      setIsCustomDpi(![100, 150, 200, 300].includes(preset.dpi));
      setMinSize(preset.minSize);
      setMaxSize(preset.maxSize);
      setSizeUnit(preset.sizeUnit);
      setTransform(DEFAULT_TRANSFORM);
      setAutoCenterInfo(null);

      // Update sample asset if still browsing built-in samples
      if (isUsingSample) {
        handleLoadSample(preset.mode);
      }

      // Reset mode-specific filters gracefully
      setSettings((prev) => ({
        ...prev,
        signatureEnhance: preset.mode === 'signature' ? prev.signatureEnhance : false,
        dopEnabled: preset.mode === 'photo' ? prev.dopEnabled : false,
      }));
    },
    [handleLoadSample, isUsingSample]
  );

  const handleModeChange = useCallback(
    (nextMode: AppMode) => {
      setMode(nextMode);
      const matchingPreset = allPresets.find((p) => p.mode === nextMode);
      if (matchingPreset) {
        applyPreset(matchingPreset);
      } else if (isUsingSample) {
        handleLoadSample(nextMode);
      }
    },
    [allPresets, applyPreset, handleLoadSample, isUsingSample]
  );

  // Dimension handlers with Aspect Ratio Lock
  const handleWidthChange = (nextW: number) => {
    if (!Number.isFinite(nextW) || nextW <= 0) return;
    setActivePresetId('custom-manual');
    if (aspectLocked && widthVal > 0 && heightVal > 0) {
      const ratio = widthVal / heightVal;
      setHeightVal(computeLockedHeight(nextW, ratio, unit));
    }
    setWidthVal(nextW);
  };

  const handleHeightChange = (nextH: number) => {
    if (!Number.isFinite(nextH) || nextH <= 0) return;
    setActivePresetId('custom-manual');
    if (aspectLocked && widthVal > 0 && heightVal > 0) {
      const ratio = widthVal / heightVal;
      setWidthVal(computeLockedWidth(nextH, ratio, unit));
    }
    setHeightVal(nextH);
  };

  const handleUnitChange = (nextUnit: DimensionUnit) => {
    if (nextUnit === unit) return;
    const newW = convertDimension(widthVal, unit, nextUnit, dpi);
    const newH = convertDimension(heightVal, unit, nextUnit, dpi);
    setUnit(nextUnit);
    setWidthVal(newW);
    setHeightVal(newH);
    setActivePresetId('custom-manual');
  };

  const handleDpiPresetChange = (val: number | 'custom') => {
    if (val === 'custom') {
      setIsCustomDpi(true);
      return;
    }
    setIsCustomDpi(false);
    setDpi(val);
    setActivePresetId('custom-manual');
  };

  const handleCustomDpiChange = (val: number) => {
    const safe = sanitizeDpi(val);
    setDpi(safe);
    setActivePresetId('custom-manual');
  };

  const handleAutoCenterFace = async () => {
    if (!imageEl) return;
    const aspect = targetWidthPx / Math.max(1, targetHeightPx);
    const res = await computeAutoCenterTransform(imageEl, aspect);
    setTransform(res.transform);
    setAutoCenterInfo(`Centered via ${res.method}`);
  };

  const handleSaveCustomPreset = (preset: ExamPreset) => {
    const updated = saveCustomPreset(preset);
    setCustomPresets(updated);
    applyPreset(preset);
  };

  const handleDeleteCustomPreset = (id: string) => {
    const updated = deleteCustomPreset(id);
    setCustomPresets(updated);
    if (activePresetId === id) {
      applyPreset(OFFICIAL_EXAM_PRESETS[0]);
    }
  };

  // Real-time binary-search compression + sharpness measurement
  useEffect(() => {
    if (!imageEl) {
      setCompression(null);
      return;
    }

    const jobId = ++compressionJobIdRef.current;
    setIsProcessing(true);

    const timer = window.setTimeout(async () => {
      try {
        const renderedCanvas = renderOutputCanvas(
          imageEl,
          targetWidthPx,
          targetHeightPx,
          transform,
          settings,
          mode
        );
        latestCanvasRef.current = renderedCanvas;

        // Sharpness via Laplacian variance
        const ctx = renderedCanvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, renderedCanvas.width, renderedCanvas.height);
          const sharpReport = computeLaplacianSharpness(
            imgData.data,
            renderedCanvas.width,
            renderedCanvas.height
          );
          if (jobId === compressionJobIdRef.current) {
            setSharpness(sharpReport);
          }
        }

        const minB = toBytes(minSize, sizeUnit);
        const maxB = toBytes(maxSize, sizeUnit);
        const compressed = await compressCanvasToTarget(renderedCanvas, minB, maxB, dpi);

        if (jobId === compressionJobIdRef.current) {
          setCompression(compressed);
          setIsProcessing(false);
        }
      } catch {
        if (jobId === compressionJobIdRef.current) {
          setIsProcessing(false);
        }
      }
    }, 110);

    return () => window.clearTimeout(timer);
  }, [
    imageEl,
    targetWidthPx,
    targetHeightPx,
    transform,
    settings,
    mode,
    minSize,
    maxSize,
    sizeUnit,
    dpi,
  ]);

  const compliance: ComplianceReport = useMemo(() => {
    const sizeOk = Boolean(compression?.withinRange);
    const dimensionsOk = Boolean(
      compression &&
        compression.widthPx === targetWidthPx &&
        compression.heightPx === targetHeightPx
    );
    return {
      sizeOk,
      dimensionsOk,
      sharpness,
      overallReady: sizeOk && dimensionsOk && sharpness.status !== 'blurry',
    };
  }, [compression, targetWidthPx, targetHeightPx, sharpness]);

  const baseFileName = useMemo(() => {
    const presetSlug = activePresetId.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    return `form-fixer-${presetSlug}-${targetWidthPx}x${targetHeightPx}`;
  }, [activePresetId, targetWidthPx, targetHeightPx]);

  const handleDownloadJpg = () => {
    if (!compression) return;
    triggerDownload(compression.blob, `${baseFileName}.jpg`);
  };

  const handleDownloadPng = async () => {
    if (!latestCanvasRef.current) return;
    const pngBlob = await exportCanvasAsPng(latestCanvasRef.current);
    triggerDownload(pngBlob, `${baseFileName}.png`);
  };

  const handleDownloadPdf = () => {
    if (!compression) return;
    const pdfBlob = buildPdfBlob(compression.dataUrl, widthVal, heightVal, unit, dpi);
    triggerDownload(pdfBlob, `${baseFileName}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <HeaderBar
        presets={allPresets}
        activePresetId={activePresetId}
        onSelectPreset={applyPreset}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_minmax(0,1fr)_330px] lg:items-start">
          {/* Left Control Panel */}
          <ControlPanel
            mode={mode}
            onModeChange={handleModeChange}
            allPresets={allPresets}
            activePresetId={activePresetId}
            onSelectPreset={applyPreset}
            onDeleteCustomPreset={handleDeleteCustomPreset}
            onOpenSavePresetModal={() => setIsPresetModalOpen(true)}
            widthVal={widthVal}
            heightVal={heightVal}
            unit={unit}
            dpi={dpi}
            isCustomDpi={isCustomDpi}
            aspectLocked={aspectLocked}
            onWidthChange={handleWidthChange}
            onHeightChange={handleHeightChange}
            onUnitChange={handleUnitChange}
            onToggleAspectLock={() => setAspectLocked((prev) => !prev)}
            onDpiPresetChange={handleDpiPresetChange}
            onCustomDpiChange={handleCustomDpiChange}
            minSize={minSize}
            maxSize={maxSize}
            sizeUnit={sizeUnit}
            onMinSizeChange={(v) => setMinSize(Math.max(0, v))}
            onMaxSizeChange={(v) => setMaxSize(Math.max(1, v))}
            onSizeUnitChange={(u) => setSizeUnit(u)}
            targetWidthPx={targetWidthPx}
            targetHeightPx={targetHeightPx}
            settings={settings}
            onUpdateSettings={(patch) =>
              setSettings((prev) => ({ ...prev, ...patch }))
            }
            onAutoCenterFace={handleAutoCenterFace}
            autoCenterInfo={autoCenterInfo}
            hasImage={Boolean(imageEl)}
          />

          {/* Center Interactive Canvas */}
          <CropperCanvas
            mode={mode}
            imageEl={imageEl}
            imageName={imageName}
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            targetWidthPx={targetWidthPx}
            targetHeightPx={targetHeightPx}
            transform={transform}
            onTransformChange={(patch) =>
              setTransform((prev) => ({ ...prev, ...patch }))
            }
            onResetTransform={() => setTransform(DEFAULT_TRANSFORM)}
            showGuide={showGuide}
            onToggleGuide={() => setShowGuide((prev) => !prev)}
            settings={settings}
          />

          {/* Right Output & Compliance Panel */}
          <OutputPanel
            imageSrc={imageSrc}
            compression={compression}
            isProcessing={isProcessing}
            compliance={compliance}
            minSize={minSize}
            maxSize={maxSize}
            sizeUnit={sizeUnit}
            widthVal={widthVal}
            heightVal={heightVal}
            unit={unit}
            dpi={dpi}
            targetWidthPx={targetWidthPx}
            targetHeightPx={targetHeightPx}
            onDownloadJpg={handleDownloadJpg}
            onDownloadPng={handleDownloadPng}
            onDownloadPdf={handleDownloadPdf}
          />
        </div>
      </main>

      <CustomPresetModal
        key={`${mode}-${widthVal}-${heightVal}-${unit}-${dpi}-${minSize}-${maxSize}-${sizeUnit}-${isPresetModalOpen}`}
        open={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        initialMode={mode}
        initialWidth={widthVal}
        initialHeight={heightVal}
        initialUnit={unit}
        initialDpi={dpi}
        initialMinSize={minSize}
        initialMaxSize={maxSize}
        initialSizeUnit={sizeUnit}
        onSave={handleSaveCustomPreset}
      />
    </div>
  );
}
