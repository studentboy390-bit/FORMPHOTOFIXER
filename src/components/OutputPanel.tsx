import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Columns2,
  Download,
  FileDown,
  FileImage,
} from 'lucide-react';
import type {
  ComplianceReport,
  CompressionResult,
  DimensionUnit,
  SizeUnit,
} from '../types/fixer';
import { dimensionToCm } from '../utils/imageProcessing';
import { formatBytes, toBytes } from '../utils/unitsAndPresets';

interface OutputPanelProps {
  imageSrc: string | null;
  compression: CompressionResult | null;
  isProcessing: boolean;
  compliance: ComplianceReport;
  minSize: number;
  maxSize: number;
  sizeUnit: SizeUnit;
  widthVal: number;
  heightVal: number;
  unit: DimensionUnit;
  dpi: number;
  targetWidthPx: number;
  targetHeightPx: number;
  onDownloadJpg: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
}

export function OutputPanel({
  imageSrc,
  compression,
  isProcessing,
  compliance,
  minSize,
  maxSize,
  sizeUnit,
  widthVal,
  heightVal,
  unit,
  dpi,
  targetWidthPx,
  targetHeightPx,
  onDownloadJpg,
  onDownloadPng,
  onDownloadPdf,
}: OutputPanelProps) {
  const [compareMode, setCompareMode] = useState<'after' | 'before'>('after');

  const minBytes = toBytes(minSize, sizeUnit);
  const maxBytes = toBytes(maxSize, sizeUnit);
  const actualBytes = compression?.bytes ?? 0;
  const cmW = dimensionToCm(widthVal, unit, dpi).toFixed(2);
  const cmH = dimensionToCm(heightVal, unit, dpi).toFixed(2);

  // Compute range meter bar percentage relative to [0 .. maxBytes * 1.15]
  const scaleMax = Math.max(1, maxBytes * 1.15);
  const fillPct = Math.min(100, Math.max(2, (actualBytes / scaleMax) * 100));
  const minMarkerPct = Math.min(100, (minBytes / scaleMax) * 100);
  const maxMarkerPct = Math.min(100, (maxBytes / scaleMax) * 100);

  const isReady = Boolean(compression && compliance.sizeOk);

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Live File Size Meter */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Live Output &amp; File Size Meter
          </h2>
          {compression ? (
            <span
              data-testid="status-badge"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                isReady
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
              }`}
            >
              {isReady ? (
                <>
                  <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Ready to Upload</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Adjust Size</span>
                </>
              )}
            </span>
          ) : null}
        </div>

        {/* Exact Readout */}
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div>
            <span
              data-testid="live-size-readout"
              className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums"
            >
              {isProcessing ? 'Measuring…' : compression ? formatBytes(actualBytes) : '—'}
            </span>
            {compression && (
              <span className="ml-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                ({Math.round(compression.quality * 100)}% JPEG)
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Target: {minSize}–{maxSize} {sizeUnit}
          </span>
        </div>

        {/* Visual Range Meter */}
        <div className="relative mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {/* Acceptable window band */}
          <div
            style={{
              left: `${minMarkerPct}%`,
              width: `${Math.max(2, maxMarkerPct - minMarkerPct)}%`,
            }}
            className="absolute inset-y-0 bg-emerald-200/60 dark:bg-emerald-900/40"
          />
          {/* Actual size bar */}
          {compression && (
            <div
              style={{ width: `${fillPct}%` }}
              className={`h-full rounded-full transition-all duration-150 ${
                isReady ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'
              }`}
            />
          )}
        </div>

        {/* Exact px & cm dimensions */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
          <span>
            {compression?.widthPx ?? targetWidthPx} × {compression?.heightPx ?? targetHeightPx} px
          </span>
          <span>
            {cmW} × {cmH} cm · {dpi} DPI
          </span>
        </div>
      </div>

      {/* Before / After Comparison Preview */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Columns2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Preview Comparison</span>
          </span>
          <div
            role="group"
            aria-label="Before and After Comparison Toggle"
            className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => setCompareMode('before')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                compareMode === 'before'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => setCompareMode('after')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                compareMode === 'after'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              After
            </button>
          </div>
        </div>

        <div className="canvas-grid-bg flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 p-2 dark:border-slate-800">
          {compareMode === 'after' && compression?.dataUrl ? (
            <img
              src={compression.dataUrl}
              alt="Processed output preview"
              data-testid="output-after-preview"
              className="max-h-full max-w-full rounded object-contain shadow-sm"
            />
          ) : compareMode === 'before' && imageSrc ? (
            <img
              src={imageSrc}
              alt="Original uploaded preview"
              data-testid="output-before-preview"
              className="max-h-full max-w-full rounded object-contain shadow-sm"
            />
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              No output generated yet
            </span>
          )}
        </div>
      </div>

      {/* AI Compliance Check */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <h3 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          AI Compliance Check
        </h3>
        <ul className="space-y-2 text-xs">
          <li className="flex items-start justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-300">
              File Size ({minSize}–{maxSize} {sizeUnit})
            </span>
            <span
              className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                compliance.sizeOk
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {compliance.sizeOk ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{compliance.sizeOk ? 'Passed' : 'Out of Range'}</span>
            </span>
          </li>

          <li className="flex items-start justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-300">
              Exact Dimensions &amp; DPI
            </span>
            <span
              className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                compliance.dimensionsOk
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {compliance.dimensionsOk ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {compliance.dimensionsOk ? `${dpi} DPI Met` : 'Scaled to Fit'}
              </span>
            </span>
          </li>

          <li className="flex items-start justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-300">
              Sharpness (Laplacian)
            </span>
            <span
              className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                compliance.sharpness.status === 'blurry'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {compliance.sharpness.status === 'blurry' ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="tabular-nums">{compliance.sharpness.label}</span>
            </span>
          </li>
        </ul>
      </div>

      {/* Export & Download Buttons */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800 space-y-2">
        <button
          type="button"
          disabled={!compression}
          onClick={onDownloadJpg}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Download JPG{' '}
            {compression ? `(${formatBytes(compression.bytes)})` : ''}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!compression}
            onClick={onDownloadPng}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileImage className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            disabled={!compression}
            onClick={onDownloadPdf}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
