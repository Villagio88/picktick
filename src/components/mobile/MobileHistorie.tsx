import { useState, useMemo } from 'react';
import { Search, Pencil, Trash2, X } from 'lucide-react';
import type { TimeEntry, Employer } from '../../types';
import { formatDauer, formatDatum } from '../../utils/format';
import { rolleKurz } from '../../data/rollen';

interface Props {
  entries: TimeEntry[];
  employers: Employer[];
  employer: string;
  onEdit: (e: TimeEntry) => void;
  onDelete: (id: string) => void;
}

function groupByMonth(entries: TimeEntry[]): { key: string; label: string; entries: TimeEntry[]; totalMin: number }[] {
  const groups = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = e.datum.slice(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, es]) => {
      const [y, m] = key.split('-').map(Number);
      return {
        key,
        label: `${MONATE[m - 1]} ${y}`,
        entries: es.sort((a, b) => {
          if (a.datum !== b.datum) return (b.datum || '').localeCompare(a.datum || '');
          return (b.startZeit || '').localeCompare(a.startZeit || '');
        }),
        totalMin: es.reduce((s, e) => s + e.dauerMinuten, 0),
      };
    });
}

export function MobileHistorie({ entries, employers, employer, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const isAlleMode = employer === '__alle__';

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const s = search.toLowerCase();
    return entries.filter(e =>
      e.beschreibung.toLowerCase().includes(s)
      || e.kategorie.toLowerCase().includes(s)
      || e.leistung.toLowerCase().includes(s)
      || (isAlleMode && e.fuerWen.toLowerCase().includes(s))
    );
  }, [entries, search, isAlleMode]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const empColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employers) m.set(e.name, e.farbe || '#9ca3af');
    return m;
  }, [employers]);

  // Zusammenfassung: noch nicht abgerechnete Einträge (gesamter Arbeitgeber, unabhängig von der Suche)
  const offen = useMemo(() => {
    const list = entries.filter(e => !e.abgerechnet);
    return { count: list.length, min: list.reduce((s, e) => s + e.dauerMinuten, 0) };
  }, [entries]);

  return (
    <div>
      {/* Sticky Searchbar */}
      <header className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Beschreibung, Rolle..."
            className="flex-1 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-gray-400 active:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-[11px] text-gray-500 mt-1.5 px-1">
          {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
          {employer !== '__alle__' && ` · ${employer}`}
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Zusammenfassung: nicht abgerechnet */}
        {offen.count === 0 ? (
          <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-700">Abrechnung</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5">Alles abgerechnet</div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200">
            <div className="text-xs font-medium uppercase tracking-wider text-amber-700">Nicht abgerechnet</div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-2xl font-bold text-amber-900">{formatDauer(offen.min)}</span>
              <span className="text-sm font-medium text-amber-700">
                {offen.count} {offen.count === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-500">
            {search ? 'Keine Treffer.' : 'Noch keine Einträge.'}
          </div>
        )}

        {groups.map(group => (
          <section key={group.key}>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-gray-700 capitalize">{group.label}</h2>
              <span className="text-xs text-gray-500">{formatDauer(group.totalMin)}</span>
            </div>
            <ul className="space-y-2">
              {group.entries.map(e => (
                <HistoryCard
                  key={e.id}
                  entry={e}
                  showEmployer={isAlleMode}
                  employerColor={empColorMap.get(e.fuerWen)}
                  onEdit={() => onEdit(e)}
                  onDelete={() => {
                    if (confirm(`Eintrag löschen?\n\n${e.beschreibung.slice(0, 80)}`)) onDelete(e.id);
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ entry, showEmployer, employerColor, onEdit, onDelete }: {
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
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium">{formatDatum(entry.datum)}</span>
              {entry.startZeit && entry.endZeit && (
                <span className="text-gray-400">{entry.startZeit}–{entry.endZeit}</span>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-900 shrink-0">{formatDauer(entry.dauerMinuten)}</span>
          </div>
          <p className="text-sm text-gray-900 line-clamp-3">{entry.beschreibung}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 flex-wrap">
            {showEmployer && <span className="font-medium">{entry.fuerWen}</span>}
            {entry.kategorie && <span>{rolleKurz(entry.kategorie) || entry.kategorie}</span>}
            {entry.leistung && <span>· {entry.leistung}</span>}
            {entry.abgerechnet && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">abgerechnet</span>}
            {entry.bezahlt && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">bezahlt</span>}
          </div>
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
