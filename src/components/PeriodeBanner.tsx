import { History } from 'lucide-react';

interface Props {
  modusLabel: string; // "Schuljahr" oder "Jahr"
  label: string;      // z.B. "2025/2026"
  onReset: () => void;
}

/** Hinweis-Banner, wenn eine vergangene Periode angezeigt wird. */
export function PeriodeBanner({ modusLabel, label, onReset }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <History className="w-4 h-4 shrink-0" />
        <span>
          Du siehst {modusLabel} <span className="font-semibold">{label}</span>
        </span>
      </div>
      <button
        onClick={onReset}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        Zum aktuellen {modusLabel}
      </button>
    </div>
  );
}
