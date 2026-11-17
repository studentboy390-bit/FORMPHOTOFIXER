import { Moon, ShieldCheck, Sun } from 'lucide-react';
import type { ExamPreset } from '../types/fixer';

interface HeaderBarProps {
  presets: ExamPreset[];
  activePresetId: string;
  onSelectPreset: (preset: ExamPreset) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function HeaderBar({
  presets,
  activePresetId,
  onSelectPreset,
  isDark,
  onToggleTheme,
}: HeaderBarProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto max-w-[1600px] px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg whitespace-nowrap">
              Form Photo Fixer <span className="font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">— Offline Privacy-First Exam Tool</span>
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300 whitespace-nowrap"
              title="All image cropping, AI processing, and compression happen locally in your browser."
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>100% Offline • Files Stay on Device</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Exam Preset Pills */}
        <nav
          aria-label="Quick Exam Presets"
          className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5"
        >
          <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            Quick Presets:
          </span>
          {presets.map((preset) => {
            const isActive = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'bg-blue-700 text-white dark:bg-blue-600'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {preset.shortLabel}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
