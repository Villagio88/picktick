import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { de } from 'date-fns/locale';
import type { TimeEntry } from '../types';
import { formatDauer, formatDatum } from '../utils/format';
import { lightBg, darkText } from '../utils/color';
import { rolleKurz } from '../data/rollen';

interface Props {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  onNewEntry?: (date: string) => void;
  employerColorMap?: Map<string, string>;
  showEmployerName?: boolean;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_VISIBLE = 3;

export function CalendarView({ entries, onEdit, onDelete, onNewEntry, employerColorMap, showEmployerName }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of entries) {
      const list = map.get(e.datum) || [];
      list.push(e);
      map.set(e.datum, list);
    }
    // Sort each day's entries by start time
    for (const [, list] of map) {
      list.sort((a, b) => (a.startZeit || '').localeCompare(b.startZeit || ''));
    }
    return map;
  }, [entries]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (entryMap.get(key) || []).sort((a, b) =>
      (a.startZeit || '').localeCompare(b.startZeit || '')
    );
  }, [selectedDate, entryMap]);

  function entryStyle(entry: TimeEntry) {
    const color = employerColorMap?.get(entry.fuerWen);
    if (color) {
      if (entry.abgerechnet) {
        return { backgroundColor: lightBg(color, 0.9), color: darkText(color), opacity: 0.55 };
      }
      return { backgroundColor: lightBg(color), color: darkText(color) };
    }
    if (entry.abgerechnet) {
      return { backgroundColor: '#f3f4f6', color: '#9ca3af' };
    }
    return undefined;
  }

  function entryDefaultCls(entry: TimeEntry) {
    if (employerColorMap?.get(entry.fuerWen)) return '';
    if (entry.abgerechnet) return '';
    return 'bg-primary-100 text-primary-800';
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: de })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-gray-200">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = entryMap.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const overflow = dayEntries.length - MAX_VISIBLE;

          return (
            <div
              key={key}
              onClick={() => dayEntries.length > 0 && setSelectedDate(day)}
              onDoubleClick={() => onNewEntry?.(key)}
              className={`
                min-h-[7.5rem] border-r border-b border-gray-200 p-1.5 flex flex-col transition-colors cursor-pointer
                hover:bg-gray-50
                ${inMonth ? 'bg-white' : 'bg-gray-50/60'}
                ${today ? 'ring-2 ring-inset ring-primary-400 bg-primary-50/20' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold leading-none ${
                    today
                      ? 'bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center'
                      : inMonth
                        ? 'text-gray-700'
                        : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEntries.length > 0 && (
                  <span className="text-[10px] font-medium text-gray-400">
                    {formatDauer(dayEntries.reduce((s, e) => s + e.dauerMinuten, 0))}
                  </span>
                )}
              </div>

              {/* Entry previews */}
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEntries.slice(0, MAX_VISIBLE).map((entry) => (
                  <div
                    key={entry.id}
                    className={`text-[11px] leading-tight rounded px-1.5 py-0.5 truncate ${entryDefaultCls(entry)}`}
                    style={entryStyle(entry)}
                    title={`${entry.startZeit || ''}–${entry.endZeit || ''}: ${entry.beschreibung}${showEmployerName ? ` (${entry.fuerWen})` : ''}`}
                  >
                    <span className="font-medium">{entry.startZeit}</span>{' '}
                    {showEmployerName && <span className="opacity-70">{entry.fuerWen.split(' ')[0]}: </span>}
                    {entry.leistung || entry.beschreibung}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-400 font-medium px-1.5">
                    +{overflow} weitere
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail popup */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selectedDate ? format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de }) : ''}
          onClick={() => setSelectedDate(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

          <div
            className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                </h3>
                {selectedEntries.length > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedEntries.length} {selectedEntries.length === 1 ? 'Eintrag' : 'Einträge'} &middot;{' '}
                    {formatDauer(selectedEntries.reduce((s, e) => s + e.dauerMinuten, 0))}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Schliessen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {selectedEntries.length === 0 ? (
                <p className="text-center text-gray-500 py-6">
                  Keine Einträge an diesem Tag
                </p>
              ) : (
                selectedEntries.map((entry) => {
                  const color = employerColorMap?.get(entry.fuerWen);
                  return (
                    <div
                      key={entry.id}
                      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 transition-colors ${entry.abgerechnet ? 'opacity-60' : ''}`}
                      style={color ? { borderLeftWidth: '3px', borderLeftColor: color } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {showEmployerName && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color || '#6b7280' }}
                              />
                              <span className="text-xs font-medium text-gray-500">{entry.fuerWen}</span>
                            </div>
                          )}
                          <p
                            className={`text-sm ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}
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
                          <span
                            className={`text-sm font-semibold whitespace-nowrap ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}
                          >
                            {formatDauer(entry.dauerMinuten)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              onEdit(entry);
                            }}
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
          </div>
        </div>
      )}
    </div>
  );
}
