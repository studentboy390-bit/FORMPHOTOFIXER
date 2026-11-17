export type AppMode = 'photo' | 'signature' | 'document';

export type DimensionUnit = 'px' | 'cm' | 'mm' | 'in';

export type SizeUnit = 'KB' | 'MB';

export type SignatureInkColor = 'black' | 'blue';

export interface ExamPreset {
  id: string;
  name: string;
  shortLabel: string;
  mode: AppMode;
  width: number;
  height: number;
  unit: DimensionUnit;
  dpi: number;
  minSize: number;
  maxSize: number;
  sizeUnit: SizeUnit;
  formatNote: string;
  isCustom?: boolean;
}

export interface TransformState {
  zoom: number; // 1 = fit cover
  offsetX: number; // normalized fraction relative to crop box width (-1 to 1+)
  offsetY: number; // normalized fraction relative to crop box height (-1 to 1+)
  rotate90: number; // 0, 90, 180, 270
  tiltDeg: number; // -15 to +15 fine tune
}

export interface ProcessingSettings {
  signatureEnhance: boolean;
  signatureInk: SignatureInkColor;
  backgroundCleanStrength: number; // 0 to 100
  dopEnabled: boolean;
  dopName: string;
  dopDate: string; // YYYY-MM-DD
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  bytes: number;
  quality: number;
  scaleFactor: number;
  widthPx: number;
  heightPx: number;
  withinRange: boolean;
}

export interface SharpnessReport {
  variance: number;
  status: 'sharp' | 'acceptable' | 'blurry';
  label: string;
}

export interface ComplianceReport {
  sizeOk: boolean;
  dimensionsOk: boolean;
  sharpness: SharpnessReport;
  overallReady: boolean;
}
