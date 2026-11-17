import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppMode, DimensionUnit, ExamPreset, SizeUnit } from '../types/fixer';

interface CustomPresetModalProps {
  open: boolean;
  onClose: () => void;
  initialMode: AppMode;
  initialWidth: number;
  initialHeight: number;
  initialUnit: DimensionUnit;
  initialDpi: number;
  initialMinSize: number;
  initialMaxSize: number;
  initialSizeUnit: SizeUnit;
  onSave: (preset: ExamPreset) => void;
}

export function CustomPresetModal({
  open,
  onClose,
  initialMode,
  initialWidth,
  initialHeight,
  initialUnit,
  initialDpi,
  initialMinSize,
  initialMaxSize,
  initialSizeUnit,
  onSave,
}: CustomPresetModalProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [unit, setUnit] = useState<DimensionUnit>(initialUnit);
  const [dpi, setDpi] = useState(initialDpi);
  const [minSize, setMinSize] = useState(initialMinSize);
  const [maxSize, setMaxSize] = useState(initialMaxSize);
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>(initialSizeUnit);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a preset name.');
      return;
    }
    if (width <= 0 || height <= 0 || dpi < 36 || maxSize <= 0 || minSize > maxSize) {
      setError('Please enter valid positive dimensions, DPI, and min/max size range.');
      return;
    }

    const shortLabel = trimmed.length > 14 ? `${trimmed.slice(0, 12)}…` : trimmed;
    const preset: ExamPreset = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      shortLabel,
      mode,
      width,
      height,
      unit,
      dpi,
      minSize,
      maxSize,
      sizeUnit,
      formatNote: `Custom · ${width}×${height} ${unit} · ${minSize}–${maxSize} ${sizeUnit}`,
      isCustom: true,
    };
    onSave(preset);
    setName('');
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-preset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2
            id="custom-preset-modal-title"
            className="text-base font-bold text-slate-900 dark:text-slate-50"
          >
            Save Custom Exam Preset
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="preset-name-field"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Preset Name
            </label>
            <input
              id="preset-name-field"
              type="text"
              placeholder="e.g. IBPS PO Passport Photo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="preset-mode-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Mode
              </label>
              <select
                id="preset-mode-field"
                value={mode}
                onChange={(e) => setMode(e.target.value as AppMode)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="photo">Passport Photo</option>
                <option value="signature">Signature</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="preset-dpi-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                DPI
              </label>
              <input
                id="preset-dpi-field"
                type="number"
                min={36}
                max={1200}
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="preset-width-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Width
              </label>
              <input
                id="preset-width-field"
                type="number"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="preset-height-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Height
              </label>
              <input
                id="preset-height-field"
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="preset-unit-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Unit
              </label>
              <select
                id="preset-unit-field"
                value={unit}
                onChange={(e) => setUnit(e.target.value as DimensionUnit)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="in">in</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="preset-min-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Min Size
              </label>
              <input
                id="preset-min-field"
                type="number"
                min={0}
                step="0.1"
                value={minSize}
                onChange={(e) => setMinSize(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="preset-max-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Max Size
              </label>
              <input
                id="preset-max-field"
                type="number"
                min={1}
                step="0.1"
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="preset-sizeunit-field"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Size Unit
              </label>
              <select
                id="preset-sizeunit-field"
                value={sizeUnit}
                onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Save Preset Locally
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
