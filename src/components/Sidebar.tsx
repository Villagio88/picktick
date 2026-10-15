import {
  LayoutDashboard,
  Plus,
  History,
  BarChart3,
  Upload,
  Archive,
  FileText,
  Building2,
  PieChart,
  Settings,
  LogOut,
} from 'lucide-react';
import type { ViewMode, Employer } from '../types';

interface Props {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onNewEntry: () => void;
  onImport: () => void;
  employers: Employer[];
  selectedEmployer: string;
  onSelectEmployer: (name: string) => void;
  periodeOptions: { key: string; label: string }[];
  selectedPeriodeKey: string | null;
  currentPeriodeKey: string;
  onSelectPeriode: (key: string | null) => void;
  periodeSelectLabel: string; // "Schuljahr" oder "Jahr"
  /** Nur gesetzt, wenn die Instanz eine Anmeldung verlangt */
  onLogout?: () => void;
}

const NAV_ITEMS: { view: ViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'uebersicht', label: 'Übersicht', icon: PieChart },
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'historie', label: 'Tätigkeiten', icon: History },
  { view: 'bericht', label: 'Bericht', icon: BarChart3 },
  { view: 'abrechnung', label: 'Abrechnung', icon: FileText },
  { view: 'archiv', label: 'Archiv', icon: Archive },
  { view: 'arbeitgeber', label: 'Arbeitgeber', icon: Building2 },
  { view: 'einstellungen', label: 'Einstellungen', icon: Settings },
];

// Views that don't need the employer selector at all
const HIDE_SELECTOR: Set<ViewMode> = new Set(['uebersicht', 'arbeitgeber', 'einstellungen']);
// Views that support the "Alle" option
const ALLE_SUPPORTED: Set<ViewMode> = new Set(['historie']);
// Views that require a single employer
const SINGLE_EMPLOYER_ONLY: Set<ViewMode> = new Set(['dashboard', 'bericht', 'abrechnung', 'archiv']);
// Views, in denen die Perioden-Auswahl gilt
const PERIODE_VIEWS: Set<ViewMode> = new Set(['uebersicht', 'dashboard', 'bericht']);

export function Sidebar({ currentView, onNavigate, onNewEntry, onImport, employers, selectedEmployer, onSelectEmployer, periodeOptions, selectedPeriodeKey, currentPeriodeKey, onSelectPeriode, periodeSelectLabel, onLogout }: Props) {
  const showSelector = !HIDE_SELECTOR.has(currentView);
  const showAlleOption = ALLE_SUPPORTED.has(currentView);
  const isAlle = selectedEmployer === '__alle__';

  const handleEmployerChange = (value: string) => {
    onSelectEmployer(value);
  };

  const handleNavigate = (view: ViewMode) => {
    // When navigating to a single-employer view while "Alle" is selected, auto-switch
    if (isAlle && SINGLE_EMPLOYER_ONLY.has(view) && employers.length > 0) {
      onSelectEmployer(employers[0].name);
    }
    onNavigate(view);
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col shrink-0" role="navigation" aria-label="Hauptnavigation">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">PickTick</h1>
        {showSelector && (
          <select
            aria-label="Arbeitgeber auswählen"
            value={isAlle && !showAlleOption ? employers[0]?.name || '' : selectedEmployer}
            onChange={(e) => handleEmployerChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            {showAlleOption && <option value="__alle__">Alle Arbeitgeber</option>}
            {employers.map((emp) => (
              <option key={emp.name} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        )}
        {PERIODE_VIEWS.has(currentView) && (
          <select
            aria-label="Periode auswählen"
            value={selectedPeriodeKey ?? currentPeriodeKey}
            onChange={(e) => onSelectPeriode(e.target.value === currentPeriodeKey ? null : e.target.value)}
            className={`mt-1 w-full rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
              selectedPeriodeKey ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-700'
            }`}
          >
            {periodeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {periodeSelectLabel} {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={() => onNewEntry()}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors cursor-pointer mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <Plus className="w-4 h-4" />
        Neuer Eintrag
      </button>

      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => handleNavigate(view)}
            aria-current={currentView === view ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
              currentView === view
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onImport}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <Upload className="w-4 h-4" />
          CSV Import
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        )}
      </div>
    </aside>
  );
}
