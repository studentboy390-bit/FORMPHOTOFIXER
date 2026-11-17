import type { DimensionUnit, ExamPreset, SizeUnit } from '../types/fixer';

export const CM_PER_INCH = 2.54;
export const MM_PER_INCH = 25.4;

export const DPI_PRESETS = [100, 150, 200, 300] as const;

export const OFFICIAL_EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'ssc-photo',
    name: 'SSC (CGL / CHSL / GD) Photo',
    shortLabel: 'SSC Photo',
    mode: 'photo',
    width: 3.5,
    height: 4.5,
    unit: 'cm',
    dpi: 200,
    minSize: 20,
    maxSize: 50,
    sizeUnit: 'KB',
    formatNote: 'JPG · 3.5×4.5 cm · 20–50 KB',
  },
  {
    id: 'ssc-signature',
    name: 'SSC Signature',
    shortLabel: 'SSC Sign',
    mode: 'signature',
    width: 4.0,
    height: 2.0,
    unit: 'cm',
    dpi: 200,
    minSize: 10,
    maxSize: 20,
    sizeUnit: 'KB',
    formatNote: 'JPG · 4.0×2.0 cm · 10–20 KB',
  },
  {
    id: 'upsc-photo',
    name: 'UPSC (IAS / NDA / CDS) Photo',
    shortLabel: 'UPSC Photo',
    mode: 'photo',
    width: 500,
    height: 500,
    unit: 'px',
    dpi: 200,
    minSize: 20,
    maxSize: 300,
    sizeUnit: 'KB',
    formatNote: 'JPG · 500×500 px (350–1000 px) · 20–300 KB',
  },
  {
    id: 'gate-jee-neet',
    name: 'GATE / JEE / NEET Photo',
    shortLabel: 'GATE/NEET',
    mode: 'photo',
    width: 3.5,
    height: 4.5,
    unit: 'cm',
    dpi: 200,
    minSize: 10,
    maxSize: 200,
    sizeUnit: 'KB',
    formatNote: 'JPG · 3.5×4.5 cm · 10–200 KB',
  },
  {
    id: 'up-scholarship',
    name: 'UP Scholarship / AKTU Photo',
    shortLabel: 'UP/AKTU',
    mode: 'photo',
    width: 3.5,
    height: 4.5,
    unit: 'cm',
    dpi: 150,
    minSize: 5,
    maxSize: 50,
    sizeUnit: 'KB',
    formatNote: 'JPG · 3.5×4.5 cm · ≤50 KB',
  },
  {
    id: 'document-a4',
    name: 'Document / Marksheet (PDF/JPG)',
    shortLabel: 'A4 Doc',
    mode: 'document',
    width: 21.0,
    height: 29.7,
    unit: 'cm',
    dpi: 150,
    minSize: 100,
    maxSize: 2048,
    sizeUnit: 'KB',
    formatNote: 'PDF/JPG · A4 21×29.7 cm · 100 KB–2 MB',
  },
];

export function sanitizeDpi(dpi: number): number {
  if (!Number.isFinite(dpi) || dpi <= 0) return 200;
  return Math.min(1200, Math.max(36, Math.round(dpi)));
}

/**
 * Converts a physical or pixel measurement into exact target pixels at the given DPI.
 * Formula: Pixels = (cm * DPI) / 2.54
 */
export function toPixels(value: number, unit: DimensionUnit, dpi: number): number {
  const safeVal = Number.isFinite(value) && value > 0 ? value : 1;
  const safeDpi = sanitizeDpi(dpi);
  switch (unit) {
    case 'px':
      return Math.max(1, Math.round(safeVal));
    case 'in':
      return Math.max(1, Math.round(safeVal * safeDpi));
    case 'cm':
      return Math.max(1, Math.round((safeVal * safeDpi) / CM_PER_INCH));
    case 'mm':
      return Math.max(1, Math.round((safeVal * safeDpi) / MM_PER_INCH));
  }
}

export function fromPixels(px: number, unit: DimensionUnit, dpi: number): number {
  const safePx = Number.isFinite(px) && px > 0 ? px : 1;
  const safeDpi = sanitizeDpi(dpi);
  switch (unit) {
    case 'px':
      return Math.round(safePx);
    case 'in':
      return Number((safePx / safeDpi).toFixed(2));
    case 'cm':
      return Number(((safePx * CM_PER_INCH) / safeDpi).toFixed(2));
    case 'mm':
      return Number(((safePx * MM_PER_INCH) / safeDpi).toFixed(1));
  }
}

export function convertDimension(
  value: number,
  fromUnit: DimensionUnit,
  toUnit: DimensionUnit,
  dpi: number
): number {
  if (fromUnit === toUnit) return value;
  const safeDpi = sanitizeDpi(dpi);
  // Convert to inches first for high precision without intermediate integer rounding
  let inches = 0;
  switch (fromUnit) {
    case 'px':
      inches = value / safeDpi;
      break;
    case 'in':
      inches = value;
      break;
    case 'cm':
      inches = value / CM_PER_INCH;
      break;
    case 'mm':
      inches = value / MM_PER_INCH;
      break;
  }
  switch (toUnit) {
    case 'px':
      return Math.max(1, Math.round(inches * safeDpi));
    case 'in':
      return Number(inches.toFixed(2));
    case 'cm':
      return Number((inches * CM_PER_INCH).toFixed(2));
    case 'mm':
      return Number((inches * MM_PER_INCH).toFixed(1));
  }
}

export function toBytes(value: number, unit: SizeUnit): number {
  const safe = Number.isFinite(value) && value >= 0 ? value : 0;
  return unit === 'MB' ? Math.round(safe * 1024 * 1024) : Math.round(safe * 1024);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatDimensionStep(unit: DimensionUnit): string {
  switch (unit) {
    case 'px':
      return '1';
    case 'mm':
      return '0.5';
    case 'cm':
    case 'in':
      return '0.1';
  }
}

export function computeLockedHeight(
  newWidth: number,
  aspectRatio: number,
  unit: DimensionUnit
): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return newWidth;
  const raw = newWidth / aspectRatio;
  if (unit === 'px') return Math.max(1, Math.round(raw));
  if (unit === 'mm') return Math.max(0.5, Number(raw.toFixed(1)));
  return Math.max(0.05, Number(raw.toFixed(2)));
}

export function computeLockedWidth(
  newHeight: number,
  aspectRatio: number,
  unit: DimensionUnit
): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return newHeight;
  const raw = newHeight * aspectRatio;
  if (unit === 'px') return Math.max(1, Math.round(raw));
  if (unit === 'mm') return Math.max(0.5, Number(raw.toFixed(1)));
  return Math.max(0.05, Number(raw.toFixed(2)));
}

export interface CompressionProbeResult<T> {
  payload: T;
  bytes: number;
  quality: number;
  scaleFactor: number;
  withinRange: boolean;
}

/**
 * Pure binary-search compression planner over JPEG quality (0.99 down to 0.05)
 * with optional scale fallback so output lands strictly inside [minBytes, maxBytes],
 * targeting ~88% of maxBytes for maximum visual clarity.
 */
export async function binarySearchCompression<T>(
  minBytes: number,
  maxBytes: number,
  encode: (quality: number, scaleFactor: number) => Promise<{ payload: T; bytes: number }>
): Promise<CompressionProbeResult<T>> {
  const safeMin = Math.max(0, minBytes);
  const safeMax = Math.max(safeMin + 512, maxBytes);
  const idealTarget = safeMin + (safeMax - safeMin) * 0.85;
  const preferredCeiling = Math.min(safeMax, Math.max(safeMin, Math.round(safeMax * 0.92)));

  const state: {
    bestValid: CompressionProbeResult<T> | null;
    closestOverall: CompressionProbeResult<T> | null;
  } = {
    bestValid: null,
    closestOverall: null,
  };

  const recordCandidate = (
    res: { payload: T; bytes: number },
    quality: number,
    scaleFactor: number
  ) => {
    const withinRange = res.bytes >= safeMin && res.bytes <= safeMax;
    const candidate: CompressionProbeResult<T> = {
      payload: res.payload,
      bytes: res.bytes,
      quality,
      scaleFactor,
      withinRange,
    };

    if (withinRange) {
      if (
        !state.bestValid ||
        // Prefer scale 1.0 over downscaled, then closest to preferredCeiling without exceeding max
        candidate.scaleFactor > state.bestValid.scaleFactor ||
        (candidate.scaleFactor === state.bestValid.scaleFactor &&
          Math.abs(candidate.bytes - preferredCeiling) <
            Math.abs(state.bestValid.bytes - preferredCeiling))
      ) {
        state.bestValid = candidate;
      }
    }

    if (
      !state.closestOverall ||
      (candidate.bytes <= safeMax && state.closestOverall.bytes > safeMax) ||
      (Math.abs(candidate.bytes - idealTarget) <
        Math.abs(state.closestOverall.bytes - idealTarget) &&
        !(state.closestOverall.bytes <= safeMax && candidate.bytes > safeMax))
    ) {
      state.closestOverall = candidate;
    }
  };

  // Phase 1: Binary search JPEG quality at full resolution (scale = 1.0)
  const searchAtScale = async (scale: number): Promise<boolean> => {
    let low = 0.05;
    let high = 0.99;

    // Quick check at 0.99
    const highProbe = await encode(high, scale);
    recordCandidate(highProbe, high, scale);
    if (highProbe.bytes >= safeMin && highProbe.bytes <= safeMax) {
      return true;
    }
    if (highProbe.bytes < safeMin) {
      // Even max quality is below minBytes
      return false;
    }

    // Check minimum quality 0.05
    const lowProbe = await encode(low, scale);
    recordCandidate(lowProbe, low, scale);
    if (lowProbe.bytes > safeMax) {
      // Even lowest quality exceeds maxBytes at this scale
      return false;
    }

    for (let i = 0; i < 10; i++) {
      const mid = Number(((low + high) / 2).toFixed(3));
      const probe = await encode(mid, scale);
      recordCandidate(probe, mid, scale);

      if (probe.bytes > safeMax) {
        high = mid;
      } else if (probe.bytes < safeMin) {
        low = mid;
      } else {
        // Inside range! Try nudging higher toward preferredCeiling
        if (probe.bytes < preferredCeiling) {
          low = mid;
        } else {
          high = mid;
        }
      }
      if (high - low < 0.01) break;
    }
    return state.bestValid !== null;
  };

  await searchAtScale(1.0);

  // Phase 2: Subtle scale down only if even quality 0.05 exceeded maxBytes
  if (!state.bestValid && state.closestOverall && state.closestOverall.bytes > safeMax) {
    const scaleSteps = [0.92, 0.84, 0.75, 0.65, 0.55];
    for (const s of scaleSteps) {
      const found = await searchAtScale(s);
      if (found) break;
    }
  }

  return state.bestValid ?? state.closestOverall!;
}

const CUSTOM_PRESETS_KEY = 'form_photo_fixer_custom_presets_v1';

export function loadCustomPresets(): ExamPreset[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ExamPreset =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.width === 'number' &&
        typeof item.height === 'number'
    );
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: ExamPreset): ExamPreset[] {
  const existing = loadCustomPresets();
  const next = [preset, ...existing.filter((p) => p.id !== preset.id)];
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  }
  return next;
}

export function deleteCustomPreset(id: string): ExamPreset[] {
  const existing = loadCustomPresets();
  const next = existing.filter((p) => p.id !== id);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  }
  return next;
}
