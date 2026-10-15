import { useState, useMemo } from 'react';
import {
  Search,
  Pencil,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  List,
} from 'lucide-react';
import type { TimeEntry } from '../types';
import { formatDauer, formatDatum, formatStunden, getPeriodeKey, periodeKeyToRange, parseLeistungen } from '../utils/format';
import type { PeriodeModus } from '../utils/format';
import { downloadCsv } from '../utils/csv';
import { CalendarView } from './CalendarView';
import { rolleKurz } from '../data/rollen';

interface Props {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  onNewEntry?: (date: string) => void;
  employerColorMap?: Map<string, string>;
  showEmployerName?: boolean;
  periodeModus?: PeriodeModus;
}

export function History({ entries, onEdit, onDelete, onNewEntry, employerColorMap, showEmployerName, periodeModus = 'schuljahr' }: Props) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [filterLeistung, setFilterLeistung] = useState('');
  const [filterSj, setFilterSj] = useState('');
  const [filterEmployer, setFilterEmployer] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Alle Perioden aus den Einträgen ermitteln
  const schuljahre = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      if (e.datum) {
        const sj = getPeriodeKey(e.datum, periodeModus);
        map.set(sj.key, sj.label);
      }
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [entries, periodeModus]);

  // Einzelwerte, nicht Kombinationen: «Homepage, Klapp» zählt für beide Filter
  const leistungen = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { parseLeistungen(e.leistung).forEach((l) => set.add(l)); });
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [entries]);

  const employerNames = useMemo(() => {
    if (!showEmployerName) return [];
    return Array.from(new Set(entries.map((e) => e.fuerWen))).sort();
  }, [entries, showEmployerName]);

  const filtered = useMemo(() => {
    let result = entries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.beschreibung.toLowerCase().includes(q) ||
          e.leistung.toLowerCase().includes(q) ||
          e.fuerWen.toLowerCase().includes(q)
      );
    }

    if (filterLeistung) {
      result = result.filter((e) => parseLeistungen(e.leistung).includes(filterLeistung));
    }

    if (filterSj) {
      const range = periodeKeyToRange(filterSj, periodeModus);
      result = result.filter((e) => e.datum >= range.start && e.datum <= range.end);
    }

    if (filterEmployer) {
      result = result.filter((e) => e.fuerWen === filterEmployer);
    }

    result = [...result].sort((a, b) =>
      sortDir === 'desc'
        ? b.datum.localeCompare(a.datum)
        : a.datum.localeCompare(b.datum)
    );

    return result;
  }, [entries, search, filterLeistung, filterSj, filterEmployer, sortDir]);

  const totalMinuten = filtered.reduce((s, e) => s + e.dauerMinuten, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tätigkeiten</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              title="Kalenderansicht"
              aria-label="Kalenderansicht"
              aria-pressed={viewMode === 'calendar'}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              title="Listenansicht"
              aria-label="Listenansicht"
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => downloadCsv(filtered, `PickTick_${new Date().toISOString().slice(0, 10)}.csv`)}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className={`grid grid-cols-1 gap-3 ${showEmployerName ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${search ? 'bg-gray-100' : 'bg-white'}`}
              aria-label="Einträge durchsuchen"
            />
          </div>
          <select
            value={filterLeistung}
            onChange={(e) => setFilterLeistung(e.target.value)}
            className={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${filterLeistung ? 'bg-gray-100' : 'bg-white'}`}
            aria-label="Nach Leistung filtern"
          >
            <option value="">Alle Leistungen</option>
            {leistungen.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={filterSj}
            onChange={(e) => setFilterSj(e.target.value)}
            className={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${filterSj ? 'bg-gray-100' : 'bg-white'}`}
            aria-label="Nach Periode filtern"
          >
            <option value="">Alle Perioden</option>
            {schuljahre.map((sj) => (
              <option key={sj.key} value={sj.key}>
                {sj.label}
              </option>
            ))}
          </select>
          {showEmployerName && (
            <select
              value={filterEmployer}
              onChange={(e) => setFilterEmployer(e.target.value)}
              className={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${filterEmployer ? 'bg-gray-100' : 'bg-white'}`}
              aria-label="Nach Arbeitgeber filtern"
            >
              <option value="">Alle Arbeitgeber</option>
              {employerNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          entries={filtered}
          onEdit={onEdit}
          onDelete={onDelete}
          onNewEntry={onNewEntry}
          employerColorMap={employerColorMap}
          showEmployerName={showEmployerName}
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between text-sm text-gray-600 px-1">
            <span>
              {filtered.length} Einträge &middot; {formatStunden(totalMinuten)} Std
              total ({formatDauer(totalMinuten)})
            </span>
            <button
              onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Datum{' '}
              {sortDir === 'desc' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Entries */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Keine Einträge gefunden</p>
                {(search || filterLeistung || filterSj || filterEmployer) && (
                  <p className="text-sm text-gray-400 mt-1">Versuche die Filter anzupassen</p>
                )}
              </div>
            ) : (
              filtered.map((entry) => {
                const color = employerColorMap?.get(entry.fuerWen);
                return (
                  <div
                    key={entry.id}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 transition-colors ${entry.abgerechnet ? 'opacity-60' : ''}`}
                    style={color ? { borderLeftWidth: '3px', borderLeftColor: color } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() =>
                          setExpandedId(
                            expandedId === entry.id ? null : entry.id
                          )
                        }
                      >
                        {showEmployerName && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color || '#6b7280' }}
                            />
                            <span className="text-xs font-medium text-gray-500">{entry.fuerWen}</span>
                          </div>
                        )}
                        <p
                          className={`text-sm ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'} ${expandedId === entry.id ? '' : 'line-clamp-2'}`}
                        >
                          {entry.beschreibung}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {formatDatum(entry.datum)}
                          </span>
                          {entry.startZeit && entry.endZeit && (
                            <span className="text-xs text-gray-400">
                              {entry.startZeit} – {entry.endZeit}
                            </span>
                          )}
                          {entry.kategorie && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {rolleKurz(entry.kategorie) || entry.kategorie}
                            </span>
                          )}
                          {entry.leistung && (
                            <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                              {entry.leistung}
                            </span>
                          )}
                          {entry.abgerechnet && (
                            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                              abgerechnet
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-semibold whitespace-nowrap ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatDauer(entry.dauerMinuten)}
                        </span>
                        <button
                          onClick={() => onEdit(entry)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          title="Bearbeiten"
                          aria-label="Eintrag bearbeiten"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eintrag wirklich löschen?'))
                              onDelete(entry.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          title="Löschen"
                          aria-label="Eintrag löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
