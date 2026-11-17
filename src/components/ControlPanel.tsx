import {
  BookmarkPlus,
  Eraser,
  FileText,
  Lock,
  PenTool,
  ScanFace,
  Sparkles,
  Trash2,
  Unlock,
  UserSquare2,
  Wand2,
} from 'lucide-react';
import type {
  AppMode,
  DimensionUnit,
  ExamPreset,
  ProcessingSettings,
  SignatureInkColor,
  SizeUnit,
} from '../types/fixer';
import { DPI_PRESETS, formatDimensionStep } from '../utils/unitsAndPresets';

interface ControlPanelProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  allPresets: ExamPreset[];
  activePresetId: string;
  onSelectPreset: (preset: ExamPreset) => void;
  onDeleteCustomPreset: (id: string) => void;
  onOpenSavePresetModal: () => void;
  widthVal: number;
  heightVal: number;
  unit: DimensionUnit;
  dpi: number;
  isCustomDpi: boolean;
  aspectLocked: boolean;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
  onUnitChange: (unit: DimensionUnit) => void;
  onToggleAspectLock: () => void;
  onDpiPresetChange: (dpi: number | 'custom') => void;
  onCustomDpiChange: (dpi: number) => void;
  minSize: number;
  maxSize: number;
  sizeUnit: SizeUnit;
  onMinSizeChange: (val: number) => void;
  onMaxSizeChange: (val: number) => void;
  onSizeUnitChange: (unit: SizeUnit) => void;
  targetWidthPx: number;
  targetHeightPx: number;
  settings: ProcessingSettings;
  onUpdateSettings: (patch: Partial<ProcessingSettings>) => void;
  onAutoCenterFace: () => void;
  autoCenterInfo: string | null;
  hasImage: boolean;
}

export function ControlPanel({
  mode,
  onModeChange,
  allPresets,
  activePresetId,
  onSelectPreset,
  onDeleteCustomPreset,
  onOpenSavePresetModal,
  widthVal,
  heightVal,
  unit,
  dpi,
  isCustomDpi,
  aspectLocked,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  onToggleAspectLock,
  onDpiPresetChange,
  onCustomDpiChange,
  minSize,
  maxSize,
  sizeUnit,
  onMinSizeChange,
  onMaxSizeChange,
  onSizeUnitChange,
  targetWidthPx,
  targetHeightPx,
  settings,
  onUpdateSettings,
  onAutoCenterFace,
  autoCenterInfo,
  hasImage,
}: ControlPanelProps) {
  const activePreset = allPresets.find((p) => p.id === activePresetId);
  const step = formatDimensionStep(unit);

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Mode Tabs */}
      <div>
        <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Workspace Mode
        </span>
        <div
          role="tablist"
          aria-label="Workspace Mode"
          className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            onClick={() => onModeChange('photo')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'photo'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <UserSquare2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Photo</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signature'}
            onClick={() => onModeChange('signature')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'signature'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <PenTool className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Signature</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'document'}
            onClick={() => onModeChange('document')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'document'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Document</span>
          </button>
        </div>
      </div>

      {/* Exam Preset Selector + Save Custom Preset */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor="exam-preset-select"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Exam Preset
          </label>
          <button
            type="button"
            onClick={onOpenSavePresetModal}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save Custom Preset</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            id="exam-preset-select"
            value={activePresetId}
            onChange={(e) => {
              const found = allPresets.find((p) => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <optgroup label="Official Indian Exam Rules">
              {allPresets
                .filter((p) => !p.isCustom)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
            {allPresets.some((p) => p.isCustom) && (
              <optgroup label="Saved Custom Presets">
                {allPresets
                  .filter((p) => p.isCustom)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            )}
            {activePresetId === 'custom-manual' && (
              <option value="custom-manual">Custom Manual Dimensions</option>
            )}
          </select>
          {activePreset?.isCustom && (
            <button
              type="button"
              onClick={() => onDeleteCustomPreset(activePreset.id)}
              aria-label={`Delete custom preset ${activePreset.name}`}
              title="Delete custom preset"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {activePreset && (
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {activePreset.formatNote}
          </p>
        )}
      </div>

      {/* Custom Dimensions & Units */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Dimensions &amp; Unit
          </span>
          <button
            type="button"
            onClick={onToggleAspectLock}
            aria-pressed={aspectLocked}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
              aspectLocked
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {aspectLocked ? (
              <Lock className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Unlock className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{aspectLocked ? 'Ratio Locked' : 'Unlocked'}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label
              htmlFor="dim-width-input"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Width
            </label>
            <input
              id="dim-width-input"
              type="number"
              min={unit === 'px' ? 32 : 0.2}
              step={step}
              value={widthVal}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="dim-height-input"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Height
            </label>
            <input
              id="dim-height-input"
              type="number"
              min={unit === 'px' ? 32 : 0.2}
              step={step}
              value={heightVal}
              onChange={(e) => onHeightChange(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="dim-unit-select"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Unit
            </label>
            <select
              id="dim-unit-select"
              value={unit}
              onChange={(e) => onUnitChange(e.target.value as DimensionUnit)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
              <option value="px">px</option>
            </select>
          </div>
        </div>
        <p
          data-testid="target-pixel-readout"
          className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums"
        >
          Output Canvas: {targetWidthPx} × {targetHeightPx} px @ {dpi} DPI
        </p>
      </div>

      {/* DPI Selector */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            DPI Resolution
          </span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {dpi} DPI
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {DPI_PRESETS.map((presetDpi) => {
            const selected = !isCustomDpi && dpi === presetDpi;
            return (
              <button
                key={presetDpi}
                type="button"
                onClick={() => onDpiPresetChange(presetDpi)}
                className={`h-8 rounded-lg font-mono text-xs font-medium transition-colors tabular-nums ${
                  selected
                    ? 'bg-blue-700 text-white dark:bg-blue-600'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {presetDpi}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onDpiPresetChange('custom')}
            className={`h-8 rounded-lg text-[11px] font-medium transition-colors ${
              isCustomDpi
                ? 'bg-blue-700 text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Custom
          </button>
        </div>
        {isCustomDpi && (
          <div className="mt-2 flex items-center gap-2">
            <label
              htmlFor="custom-dpi-input"
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              Custom DPI:
            </label>
            <input
              id="custom-dpi-input"
              type="number"
              min={36}
              max={1200}
              value={dpi}
              onChange={(e) => onCustomDpiChange(Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Target File Size (KB / MB) */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Target File Size Range
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label
              htmlFor="min-size-input"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Min
            </label>
            <input
              id="min-size-input"
              type="number"
              min={0}
              step={sizeUnit === 'MB' ? '0.1' : '1'}
              value={minSize}
              onChange={(e) => onMinSizeChange(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="max-size-input"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Max
            </label>
            <input
              id="max-size-input"
              type="number"
              min={1}
              step={sizeUnit === 'MB' ? '0.1' : '1'}
              value={maxSize}
              onChange={(e) => onMaxSizeChange(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="size-unit-select"
              className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Unit
            </label>
            <select
              id="size-unit-select"
              value={sizeUnit}
              onChange={(e) => onSizeUnitChange(e.target.value as SizeUnit)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="KB">KB</option>
              <option value="MB">MB</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Magic Tools (100% Client-Side) */}
      <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Offline AI &amp; Smart Tools</span>
        </div>

        {/* Photo Mode: AI Auto-Center Face */}
        {mode === 'photo' && (
          <div>
            <button
              type="button"
              disabled={!hasImage}
              onClick={onAutoCenterFace}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/70 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-950"
            >
              <ScanFace className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>AI Auto-Center Face</span>
            </button>
            {autoCenterInfo && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {autoCenterInfo}
              </p>
            )}
          </div>
        )}

        {/* Signature Mode: AI Signature Enhancer */}
        {mode === 'signature' && (
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  AI Signature Enhancer
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.signatureEnhance}
                onClick={() =>
                  onUpdateSettings({ signatureEnhance: !settings.signatureEnhance })
                }
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  settings.signatureEnhance
                    ? 'bg-blue-700 text-white dark:bg-blue-600'
                    : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {settings.signatureEnhance ? 'Applied' : 'Enhance'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Removes paper shadows &amp; yellow tint with adaptive thresholding for crisp ink on #FFFFFF.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Ink Color:
              </span>
              {(['black', 'blue'] as SignatureInkColor[]).map((ink) => (
                <button
                  key={ink}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ signatureInk: ink, signatureEnhance: true })
                  }
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                    settings.signatureInk === ink && settings.signatureEnhance
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {ink === 'blue' ? 'Royal Blue' : 'Crisp Black'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Background Cleaner (Photo & Document, or when Signature Enhancer is off) */}
        {!(mode === 'signature' && settings.signatureEnhance) && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label
                htmlFor="bg-cleaner-slider"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Eraser className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>AI Background Cleaner</span>
              </label>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {settings.backgroundCleanStrength}%
              </span>
            </div>
            <input
              id="bg-cleaner-slider"
              type="range"
              min={0}
              max={100}
              value={settings.backgroundCleanStrength}
              onChange={(e) =>
                onUpdateSettings({ backgroundCleanStrength: Number(e.target.value) })
              }
              className="studio-slider w-full"
            />
          </div>
        )}

        {/* Photo Mode: Name & Date of Photo (DOP) Stamp */}
        {mode === 'photo' && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="dop-toggle"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Name &amp; Date of Photo (DOP)
              </label>
              <input
                id="dop-toggle"
                type="checkbox"
                checked={settings.dopEnabled}
                onChange={(e) => onUpdateSettings({ dopEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
            </div>

            {settings.dopEnabled && (
              <div className="mt-2.5 space-y-2">
                <div>
                  <label
                    htmlFor="dop-name-input"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    Candidate Name
                  </label>
                  <input
                    id="dop-name-input"
                    type="text"
                    placeholder="e.g. ARJUN SHARMA"
                    value={settings.dopName}
                    onChange={(e) => onUpdateSettings({ dopName: e.target.value })}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dop-date-input"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    Date of Photo
                  </label>
                  <input
                    id="dop-date-input"
                    type="date"
                    value={settings.dopDate}
                    onChange={(e) => onUpdateSettings({ dopDate: e.target.value })}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
