import { Monitor, Briefcase, FileText, Receipt, Archive, BarChart3, Info } from 'lucide-react';
import type { Employer } from '../../types';
import { QUELLCODE_URL, VERSION } from '../../data/projekt';

interface Props {
  employers: Employer[];
  selectedEmployer: string;
  onSelectEmployer: (name: string) => void;
  entriesCount: number;
}

export function MobileMehr({ employers, selectedEmployer, onSelectEmployer, entriesCount }: Props) {
  return (
    <div className="px-4 py-4 space-y-5">
      <header className="px-1">
        <h1 className="text-lg font-bold">Mehr</h1>
        <p className="text-xs text-gray-500 mt-0.5">Arbeitgeber wechseln und weitere Funktionen.</p>
      </header>

      {/* Arbeitgeber-Auswahl */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">Arbeitgeber</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <EmployerRow
            name="Alle Arbeitgeber"
            selected={selectedEmployer === '__alle__'}
            color="#9ca3af"
            onSelect={() => onSelectEmployer('__alle__')}
          />
          {employers.map(e => (
            <EmployerRow
              key={e.name}
              name={e.name}
              selected={selectedEmployer === e.name}
              color={e.farbe || '#9ca3af'}
              onSelect={() => onSelectEmployer(e.name)}
            />
          ))}
        </div>
      </section>

      {/* Hinweis: Desktop-Only Views */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">Am Desktop</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <DesktopHint icon={BarChart3} label="Übersicht / Dashboard" hint="Soll/Ist-Analyse, Monatscharts" />
          <DesktopHint icon={FileText} label="Bericht" hint="PDF-Stundenrapport" />
          <DesktopHint icon={Receipt} label="Abrechnung" hint="Rechnungen erstellen, bezahlt-Status" />
          <DesktopHint icon={Archive} label="Archiv" hint="Bezahlte Rechnungen archiviert" />
          <DesktopHint icon={Briefcase} label="Arbeitgeber-Konfiguration" hint="Soll-Stunden, Pensum, Farbe" />
        </div>
        <p className="text-[11px] text-gray-500 mt-2 px-1 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Diese Funktionen sind für grössere Bildschirme optimiert. Am Computer oder auf dem Tablet im Querformat öffnen.
        </p>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">Info</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs text-gray-600 space-y-0.5">
          <div className="flex justify-between"><span>Einträge gesamt</span><span className="font-semibold text-gray-900">{entriesCount}</span></div>
          <div className="flex justify-between"><span>Arbeitgeber</span><span className="font-semibold text-gray-900">{employers.length}</span></div>
          <div className="flex justify-between"><span>Version</span><a href={QUELLCODE_URL} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 underline">PickTick {VERSION}, Quellcode (AGPL-3.0)</a></div>
        </div>
      </section>
    </div>
  );
}

function EmployerRow({ name, selected, color, onSelect }: {
  name: string;
  selected: boolean;
  color: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 ${
        selected ? 'bg-blue-50' : ''
      }`}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className={`flex-1 text-sm ${selected ? 'font-semibold text-blue-700' : 'text-gray-900'}`}>{name}</span>
      {selected && <span className="text-xs text-blue-600">aktiv</span>}
    </button>
  );
}

function DesktopHint({ icon: Icon, label, hint }: {
  icon: typeof Monitor;
  label: string;
  hint: string;
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-[11px] text-gray-500">{hint}</div>
      </div>
      <Monitor className="w-3.5 h-3.5 text-gray-300 shrink-0" />
    </div>
  );
}
