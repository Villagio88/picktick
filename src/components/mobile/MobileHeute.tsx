import { useMemo } from 'react';
import { Pencil, Trash2, Briefcase, Plus } from 'lucide-react';
import type { TimeEntry, Employer } from '../../types';
import { formatDauer, formatDatum, todayISO } from '../../utils/format';

interface Props {
  entries: TimeEntry[];
  allEntries: TimeEntry[];
  employer: string;
  employers: Employer[];
  onEdit: (e: TimeEntry) => void;
  onDelete: (id: string) => void;
  onNewEntry: () => void;
  onSwitchEmployer: (name: string) => void;
}

function startOfWeekISO(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Montag = Wochenstart
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonthISO(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function MobileHeute({ entries, employer, employers, onEdit, onDelete, onNewEntry, onSwitchEmployer }: Props) {
  const today = todayISO();
  const now = new Date();
  const weekStart = startOfWeekISO(now);
  const monthStart = startOfMonthISO(now);

  const emp = employers.find(e => e.name === employer);
  const sollJahr = emp?.sollStundenJahr ?? 0;
  const sollMonat = sollJahr > 0 ? sollJahr / 12 : 0;

  const heuteMin = useMemo(
    () => entries.filter(e => e.datum === today).reduce((s, e) => s + e.dauerMinuten, 0),
    [entries, today]
  );
  const wocheMin = useMemo(
    () => entries.filter(e => e.datum >= weekStart && e.datum <= today).reduce((s, e) => s + e.dauerMinuten, 0),
    [entries, weekStart, today]
  );
  const monatMin = useMemo(
    () => entries.filter(e => e.datum >= monthStart && e.datum <= today).reduce((s, e) => s + e.dauerMinuten, 0),
    [entries, monthStart, today]
  );

  const sollPct = sollMonat > 0 ? Math.round((monatMin / 60 / sollMonat) * 100) : 0;

  const letzte = useMemo(
    () => [...entries].sort((a, b) => {
      if (a.datum !== b.datum) return (b.datum || '').localeCompare(a.datum || '');
      return (b.startZeit || '').localeCompare(a.startZeit || '');
    }).slice(0, 8),
    [entries]
  );

  const empColor = emp?.farbe || '#3b82f6';

  return (
    <div className="space-y-4">
      {/* Sticky Topbar mit Arbeitgeber-Switcher */}
      <header className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gray-500 shrink-0" />
          <select
            value={employer}
            onChange={(e) => onSwitchEmployer(e.target.value)}
            className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none focus:ring-0 py-1 -ml-1"
          >
            <option value="__alle__">Alle Arbeitgeber</option>
            {employers.map(e => (
              <option key={e.name} value={e.name}>{e.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Hero Card: Heute */}
        <div
          className="rounded-2xl p-5 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${empColor}, ${empColor}cc)` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">Heute</span>
            <span className="text-xs opacity-80">{formatDatum(today)}</span>
          </div>
          <div className="text-4xl font-bold">{formatDauer(heuteMin)}</div>
          <div className="text-xs opacity-80 mt-1">
            {entries.filter(e => e.datum === today).length} Einträge
          </div>
        </div>

        {/* Stats: Woche + Monat */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Woche</div>
            <div className="text-xl font-bold mt-0.5">{formatDauer(wocheMin)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">seit Montag</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Monat</div>
            <div className="text-xl font-bold mt-0.5">{formatDauer(monatMin)}</div>
            {sollMonat > 0 ? (
              <div className="text-[10px] text-gray-500 mt-0.5">{sollPct}% von Soll</div>
            ) : (
              <div className="text-[10px] text-gray-500 mt-0.5">kein Soll</div>
            )}
          </div>
        </div>

        {/* Soll-Progressbar (nur wenn Soll definiert) */}
        {sollMonat > 0 && (
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-gray-500">Soll diesen Monat</span>
              <span className="text-xs font-medium">{(monatMin / 60).toFixed(1)} / {sollMonat.toFixed(1)} Std</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${sollPct >= 100 ? 'bg-emerald-500' : sollPct >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, sollPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Letzte Einträge */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">Letzte Einträge</h2>
          {letzte.length === 0 ? (
            <button
              onClick={onNewEntry}
              className="w-full bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm">Noch keine Einträge — Tippen für Neuen</div>
            </button>
          ) : (
            <ul className="space-y-2">
              {letzte.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  showEmployer={employer === '__alle__'}
                  employerColor={employers.find(emp => emp.name === e.fuerWen)?.farbe}
                  onEdit={() => onEdit(e)}
                  onDelete={() => {
                    if (confirm(`Eintrag löschen?\n\n${e.beschreibung.slice(0, 80)}`)) onDelete(e.id);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, showEmployer, employerColor, onEdit, onDelete }: {
  entry: TimeEntry;
  showEmployer: boolean;
  employerColor?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left p-3 flex items-start gap-3 active:bg-gray-50"
      >
        <div
          className="w-1.5 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: employerColor || '#9ca3af' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-medium text-gray-600 shrink-0">{formatDatum(entry.datum)}</span>
            <span className="text-xs font-semibold text-gray-900">{formatDauer(entry.dauerMinuten)}</span>
          </div>
          <p className="text-sm text-gray-900 line-clamp-2">{entry.beschreibung}</p>
          {showEmployer && (
            <p className="text-[10px] text-gray-500 mt-0.5">{entry.fuerWen}</p>
          )}
        </div>
      </button>
      <div className="flex border-t border-gray-100 divide-x divide-gray-100">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 py-2 text-xs font-medium text-blue-600 active:bg-blue-50 flex items-center justify-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" /> Bearbeiten
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-1 py-2 text-xs font-medium text-red-600 active:bg-red-50 flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Löschen
        </button>
      </div>
    </li>
  );
}
