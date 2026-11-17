import { useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  ImagePlus,
  Move,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import type { AppMode, ProcessingSettings, TransformState } from '../types/fixer';
import { renderOutputCanvas } from '../utils/imageProcessing';

export const SAMPLE_IMAGES: Record<AppMode, { url: string; label: string }> = {
  photo: {
    url: '/src/assets/images/sample_passport_portrait_1794881325382.jpg',
    label: 'Sample Photo',
  },
  signature: {
    url: '/src/assets/images/sample_signature_paper_1794881325687.jpg',
    label: 'Sample Signature',
  },
  document: {
    url: '/src/assets/images/sample_certificate_doc_1794881326260.jpg',
    label: 'Sample Marksheet',
  },
};

interface CropperCanvasProps {
  mode: AppMode;
  imageEl: HTMLImageElement | null;
  imageName: string;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleMode: AppMode) => void;
  targetWidthPx: number;
  targetHeightPx: number;
  transform: TransformState;
  onTransformChange: (patch: Partial<TransformState>) => void;
  onResetTransform: () => void;
  showGuide: boolean;
  onToggleGuide: () => void;
  settings: ProcessingSettings;
}

export function CropperCanvas({
  mode,
  imageEl,
  imageName,
  onFileUpload,
  onLoadSample,
  targetWidthPx,
  targetHeightPx,
  transform,
  onTransformChange,
  onResetTransform,
  showGuide,
  onToggleGuide,
  settings,
}: CropperCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  }>({ active: false, startX: 0, startY: 0, origOffsetX: 0, origOffsetY: 0 });

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const aspectRatio = targetWidthPx / Math.max(1, targetHeightPx);

  // Compute crisp preview canvas dimensions fitting cleanly inside the viewport stage
  const maxStageW = 460;
  const maxStageH = 420;
  let stageW = maxStageW;
  let stageH = Math.round(stageW / aspectRatio);
  if (stageH > maxStageH) {
    stageH = maxStageH;
    stageW = Math.round(stageH * aspectRatio);
  }
  stageW = Math.max(180, stageW);
  stageH = Math.max(140, stageH);

  // Render live interactive crop preview on HTML5 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = stageW;
    canvas.height = stageH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, stageW, stageH);
    if (!imageEl) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, stageW, stageH);
      return;
    }

    const rendered = renderOutputCanvas(
      imageEl,
      stageW,
      stageH,
      transform,
      settings,
      mode
    );
    ctx.drawImage(rendered, 0, 0);
  }, [imageEl, stageW, stageH, transform, settings, mode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: transform.offsetX,
      origOffsetY: transform.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = (e.clientX - dragStateRef.current.startX) / stageW;
    const dy = (e.clientY - dragStateRef.current.startY) / stageH;
    onTransformChange({
      offsetX: Number(Math.max(-1.5, Math.min(1.5, dragStateRef.current.origOffsetX + dx)).toFixed(3)),
      offsetY: Number(Math.max(-1.5, Math.min(1.5, dragStateRef.current.origOffsetY + dy)).toFixed(3)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!imageEl) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = Number(Math.max(0.6, Math.min(3.5, transform.zoom + delta)).toFixed(2));
    onTransformChange({ zoom: nextZoom });
  };

  return (
    <section
      aria-label="Interactive Cropper Studio"
      className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90"
    >
      {/* Top Action Strip: Upload & Sample Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload image file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload Photo / Scan</span>
          </button>

          <div className="flex items-center gap-1">
            {(['photo', 'signature', 'document'] as AppMode[]).map((sampleKey) => (
              <button
                key={sampleKey}
                type="button"
                onClick={() => onLoadSample(sampleKey)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {SAMPLE_IMAGES[sampleKey].label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleGuide}
          aria-pressed={showGuide}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            showGuide
              ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {showGuide ? (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{mode === 'signature' ? 'Box Guide' : mode === 'photo' ? 'Oval Guide' : 'Page Guide'}</span>
        </button>
      </div>

      {/* Main Interactive Cropper Stage */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            onFileUpload(file);
          }
        }}
        className={`canvas-grid-bg relative mt-4 flex min-h-[320px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border p-4 transition-colors sm:min-h-[380px] ${
          isDraggingOver
            ? 'border-blue-600 ring-2 ring-blue-500/30'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {imageEl ? (
          <div className="relative flex items-center justify-center shadow-lg ring-1 ring-slate-900/15 dark:ring-white/15">
            <canvas
              ref={canvasRef}
              data-testid="cropper-stage-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              style={{ width: `${stageW}px`, height: `${stageH}px`, touchAction: 'none' }}
              className="block cursor-grab active:cursor-grabbing bg-white"
            />

            {/* Alignment Guide SVG Overlays */}
            {showGuide && mode === 'photo' && (
              <svg
                viewBox="0 0 100 128"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                {/* Headroom guide line */}
                <line
                  x1="15"
                  y1="14"
                  x2="85"
                  y2="14"
                  stroke="rgba(29, 78, 216, 0.55)"
                  strokeWidth="0.6"
                  strokeDasharray="2 2"
                />
                {/* Eye level guide line */}
                <line
                  x1="15"
                  y1="44"
                  x2="85"
                  y2="44"
                  stroke="rgba(29, 78, 216, 0.45)"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
                {/* Face Oval */}
                <ellipse
                  cx="50"
                  cy="48"
                  rx="24"
                  ry="32"
                  fill="none"
                  stroke="rgba(37, 99, 235, 0.85)"
                  strokeWidth="1.1"
                  strokeDasharray="3 2"
                />
                {/* Shoulder Curve */}
                <path
                  d="M 10 112 Q 26 84 50 84 Q 74 84 90 112"
                  fill="none"
                  stroke="rgba(37, 99, 235, 0.75)"
                  strokeWidth="1.0"
                  strokeDasharray="3 2"
                />
              </svg>
            )}

            {showGuide && mode === 'signature' && (
              <svg
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <rect
                  x="6"
                  y="6"
                  width="88"
                  height="38"
                  fill="none"
                  stroke="rgba(37, 99, 235, 0.85)"
                  strokeWidth="0.9"
                  strokeDasharray="3 2"
                />
                <line
                  x1="10"
                  y1="36"
                  x2="90"
                  y2="36"
                  stroke="rgba(29, 78, 216, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
              </svg>
            )}

            {showGuide && mode === 'document' && (
              <svg
                viewBox="0 0 100 141"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <rect
                  x="5"
                  y="5"
                  width="90"
                  height="131"
                  fill="none"
                  stroke="rgba(37, 99, 235, 0.75)"
                  strokeWidth="0.8"
                  strokeDasharray="3 2"
                />
              </svg>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Drop a photo, signature, or marksheet here
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Or upload from device / load a built-in sample above. Everything stays 100% offline.
              </p>
            </div>
          </div>
        )}

        {/* Quiet inline interaction caption */}
        {imageEl && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Move className="h-3 w-3" aria-hidden="true" />
              Drag to pan
            </span>
            <span aria-hidden="true">·</span>
            <span>Scroll to zoom</span>
            <span aria-hidden="true">·</span>
            <span className="max-w-[200px] truncate font-medium text-slate-700 dark:text-slate-300">
              {imageName}
            </span>
          </div>
        )}
      </div>

      {/* Cropper Controls: Zoom, Rotate, Fine-Tune Tilt, Reset */}
      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800 sm:grid-cols-2">
        {/* Zoom Slider */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="crop-zoom-slider"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Zoom
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {transform.zoom.toFixed(2)}×
            </span>
          </div>
          <input
            id="crop-zoom-slider"
            type="range"
            min={0.6}
            max={3.5}
            step={0.02}
            value={transform.zoom}
            onChange={(e) => onTransformChange({ zoom: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </div>

        {/* Fine-Tune Tilt Slider */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="crop-tilt-slider"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
              <span>Fine-Tune Tilt</span>
            </label>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {transform.tiltDeg > 0 ? `+${transform.tiltDeg}°` : `${transform.tiltDeg}°`}
            </span>
          </div>
          <input
            id="crop-tilt-slider"
            type="range"
            min={-15}
            max={15}
            step={0.5}
            value={transform.tiltDeg}
            onChange={(e) => onTransformChange({ tiltDeg: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </div>
      </div>

      {/* Rotation & Reset Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!imageEl}
            onClick={() =>
              onTransformChange({ rotate90: (transform.rotate90 + 270) % 360 })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>-90°</span>
          </button>
          <button
            type="button"
            disabled={!imageEl}
            onClick={() =>
              onTransformChange({ rotate90: (transform.rotate90 + 90) % 360 })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>+90°</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!imageEl}
          onClick={onResetTransform}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          Reset Crop
        </button>
      </div>
    </section>
  );
}
