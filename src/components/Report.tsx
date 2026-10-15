import { useMemo, useState, useEffect } from 'react';
import { Download, X, Clock } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { formatDauer, formatStunden, formatDatum, getMonatName, getMonatOrder, getPeriodeLabel, periodeKeyToRange, periodeKeyToLabel } from '../utils/format';
import { getPensumInfo, type PensumMap } from '../utils/pensum';
import { downloadCsv } from '../utils/csv';
import { rolleKurz } from '../data/rollen';


interface Props {
  entries: TimeEntry[];
  employer: string;
  employers: Employer[];
  periodeKey: string;
  isCurrentPeriode: boolean;
  pensumMap: PensumMap;
}


export function Report({ entries, employer, employers, periodeKey, isCurrentPeriode, pensumMap }: Props) {
  const now = new Date();
  const emp = employers.find(e => e.name === employer);
  const modus = emp?.periodeModus || 'schuljahr';
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const MONAT_ORDER = getMonatOrder(modus);

  const employerHasSoll = emp?.hasSoll ?? false;
  // Pauschal angerechnete Stunden je Monat, im Arbeitgeber einstellbar (0 = keine)
  const pauschaleProMonat = emp?.pauschaleStundenProMonat ?? 0;

  // Anteil des aktuellen Monats (welche Woche?)
  const currentMonthFraction = useMemo(() => {
    const day = now.getDate();
    if (day <= 7) return 0.25;
    if (day <= 14) return 0.5;
    if (day <= 21) return 0.75;
    return 1;
  }, [now]);

  const [modalMonth, setModalMonth] = useState<number | null>(null);

  // Globale Perioden-Auswahl (Sidebar) statt seiteneigenem Dropdown
  const selectedSj = periodeKey;
  const isCurrentSj = isCurrentPeriode;
  const selectedLabel = periodeKeyToLabel(periodeKey, modus);

  // Monats-Modal beim Perioden-Wechsel schliessen
  useEffect(() => {
    setModalMonth(null);
  }, [periodeKey]);

  // Soll aus der Pensum-Historie der gewählten Periode (Fallback: aktuelle Einstellungen)
  const pensumInfo = getPensumInfo(emp, periodeKey, pensumMap);
  const SOLL_JAHR = pensumInfo.sollJahr;
  const SOLL_MONAT = SOLL_JAHR > 0 ? Math.round(SOLL_JAHR / 12 * 100) / 100 : 0;
  const showSoll = SOLL_JAHR > 0;

  const sjEntries = useMemo(() => {
    if (!selectedSj) return [];
    const range = periodeKeyToRange(selectedSj, modus);
    return entries.filter((e) => e.datum >= range.start && e.datum <= range.end);
  }, [entries, selectedSj, modus]);

  // Welcher Monat ist aktuell innerhalb der Periode?
  const currentMonthIdx = (() => {
    if (!isCurrentSj) return MONAT_ORDER.length - 1;
    const range = periodeKeyToRange(selectedSj, modus);
    const pStartMonth = parseInt(range.start.slice(5, 7));
    const pStartYear = parseInt(range.start.slice(0, 4));
    const pEndYear = parseInt(range.end.slice(0, 4));
    return MONAT_ORDER.findIndex((m) => {
      const year = m >= pStartMonth ? pStartYear : pEndYear;
      return m === currentMonth && year === currentYear;
    });
  })();

  // Monatsdaten mit Soll, Ist, Diff, Saldo (anteiliges Soll für aktuellen Monat)
  // Pauschale wird für Arbeitgeber mit Soll hinzugerechnet, gleich wie im Dashboard
  const monthlyRows = useMemo(() => {
    const map = new Map<number, { total: number; count: number; entries: TimeEntry[] }>();
    MONAT_ORDER.forEach((m) => map.set(m, { total: 0, count: 0, entries: [] }));
    sjEntries.forEach((e) => {
      const m = parseInt(e.datum.slice(5, 7));
      const data = map.get(m)!;
      data.total += e.dauerMinuten;
      data.count++;
      data.entries.push(e);
    });

    let cumIst = 0;
    let cumSoll = 0;
    return MONAT_ORDER.map((m, i) => {
      const data = map.get(m)!;
      const protokolliert = data.total / 60;
      const isPast = i < currentMonthIdx;
      const isCurrent = i === currentMonthIdx;
      const isFuture = i > currentMonthIdx;
      // Pauschale nur mit Soll, vergangene und aktuellen Monat
      const pauschal = employerHasSoll && (isPast || isCurrent) ? pauschaleProMonat : 0;
      const ist = protokolliert + pauschal;
      // Anteiliges Soll für den aktuellen Monat
      const sollMonat = isCurrent ? SOLL_MONAT * currentMonthFraction : SOLL_MONAT;
      cumIst += ist;
      cumSoll += isPast || isCurrent ? sollMonat : SOLL_MONAT;
      const diff = ist - sollMonat;
      const saldo = cumIst - cumSoll;
      data.entries.sort((a, b) => a.datum.localeCompare(b.datum));
      return {
        monat: m,
        count: data.count,
        protokolliert,
        pauschal,
        ist,
        sollMonat,
        diff,
        cumIst,
        cumSoll,
        saldo,
        isPast,
        isCurrent,
        isFuture,
        entries: data.entries,
      };
    });
  }, [sjEntries, SOLL_MONAT, currentMonthIdx, currentMonthFraction, employerHasSoll, pauschaleProMonat]);

  const yearTotalMin = sjEntries.reduce((s, e) => s + e.dauerMinuten, 0);
  const yearTotalWithPauschal = monthlyRows.reduce((s, r) => s + r.ist, 0);
  const currentSaldo = monthlyRows[currentMonthIdx]?.saldo ?? 0;

  // Einträge für das Modal
  const modalRow = modalMonth !== null
    ? monthlyRows.find((r) => r.monat === modalMonth)
    : null;
  const modalEntries = modalRow?.entries ?? [];
  const modalTotalMin = modalEntries.reduce((s, e) => s + e.dauerMinuten, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bericht {employer}: {getPeriodeLabel(modus)} {selectedLabel}
          </h1>
          {isCurrentSj && (
            <p className="text-sm text-primary-600 font-medium">Aktuelle Periode</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              downloadCsv(sjEntries, `PickTick_SJ_${selectedLabel.replace('/', '-')}.csv`)
            }
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportieren
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className={`grid grid-cols-1 ${showSoll ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Geleistete Stunden</div>
          <div className="text-2xl font-bold text-gray-900">
            {(yearTotalWithPauschal).toFixed(1)} Std
          </div>
          <div className="text-sm text-gray-500">
            {sjEntries.length} Einträge &middot; {formatStunden(yearTotalMin)} protokolliert
            {employerHasSoll && ` + Pauschale`}
          </div>
        </div>
        {showSoll && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Jahressoll</div>
          <div className="text-2xl font-bold text-gray-900">
            {SOLL_JAHR} Std
          </div>
          <div className="text-sm text-gray-500">
            {pensumInfo.pensum != null && <>{pensumInfo.pensum.toFixed(1)}% Pensum</>}
            {pensumInfo.lektionen != null && emp?.lektionenVollzeit != null && (
              <> &middot; {pensumInfo.lektionen}/{emp.lektionenVollzeit} Lekt.</>
            )}
            {' '}&middot; {SOLL_MONAT} Std/Monat
          </div>
        </div>
        )}
        {showSoll && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Kumuliertes Saldo</div>
          <div className={`text-2xl font-bold ${currentSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currentSaldo >= 0 ? '+' : ''}{currentSaldo.toFixed(1)} Std
          </div>
          <div className="text-sm text-gray-500">
            bis {getMonatName(MONAT_ORDER[currentMonthIdx] ?? 7)}
            {isCurrentSj && currentMonthFraction < 1 && (
              <span className="text-gray-400 ml-1">(Woche {Math.round(currentMonthFraction * 4)}/4)</span>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Monthly table (Aug→Jul) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Monat</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Einträge</th>
              {showSoll && <th className="text-right px-4 py-3 font-medium text-gray-700">Soll</th>}
              <th className="text-right px-4 py-3 font-medium text-gray-700">Ist</th>
              {employerHasSoll && <th className="text-right px-4 py-3 font-medium text-gray-700">Pausch.</th>}
              {showSoll && <th className="text-right px-4 py-3 font-medium text-gray-700">+/–</th>}
              {showSoll && <th className="text-right px-4 py-3 font-medium text-gray-700">Kum. Saldo</th>}
              <th className="px-4 py-3 w-36"></th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row) => {
              const maxIst = Math.max(...monthlyRows.map((r) => r.ist));
              const pct = maxIst > 0 ? (row.ist / maxIst) * 100 : 0;
              const showSaldo = row.isPast || row.isCurrent;
              const hasEntries = row.count > 0;

              return (
                <tr
                  key={row.monat}
                  className={`border-b border-gray-100 ${hasEntries ? 'cursor-pointer hover:bg-gray-50' : ''} ${row.isFuture ? 'opacity-50' : ''}`}
                  onClick={() => hasEntries && setModalMonth(row.monat)}
                >
                  <td className={`px-4 py-3 font-medium ${row.isCurrent ? 'text-primary-700' : 'text-gray-900'}`}>
                    {getMonatName(row.monat)}
                    {row.isCurrent && <span className="text-xs text-primary-500 ml-1">(aktuell)</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.count || '–'}
                  </td>
                  {showSoll && (
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.sollMonat.toFixed(1)}
                  </td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {row.ist > 0 ? row.ist.toFixed(1) : '–'}
                  </td>
                  {employerHasSoll && (
                  <td className="px-4 py-3 text-right text-gray-400">
                    {row.pauschal > 0 ? `+${row.pauschal}` : '–'}
                  </td>
                  )}
                  {showSoll && (
                  <td className={`px-4 py-3 text-right font-semibold ${
                    row.ist === 0 && row.isFuture ? 'text-gray-300' : row.diff >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {row.ist > 0 || row.isPast || row.isCurrent
                      ? `${row.diff >= 0 ? '+' : ''}${row.diff.toFixed(1)}`
                      : '–'}
                  </td>
                  )}
                  {showSoll && (
                  <td className={`px-4 py-3 text-right font-semibold ${
                    !showSaldo ? 'text-gray-300' : row.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {showSaldo
                      ? `${row.saldo >= 0 ? '+' : ''}${row.saldo.toFixed(1)}`
                      : '–'}
                  </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          showSoll
                            ? row.ist >= row.sollMonat ? 'bg-green-500' : row.ist > 0 ? 'bg-red-400' : 'bg-gray-100'
                            : row.ist > 0 ? 'bg-primary-400' : 'bg-gray-100'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3 text-gray-900">Total</td>
              <td className="px-4 py-3 text-right text-gray-900">
                {sjEntries.length}
              </td>
              {showSoll && (
              <td className="px-4 py-3 text-right text-gray-500">
                {SOLL_JAHR}
              </td>
              )}
              <td className="px-4 py-3 text-right text-gray-900">
                {yearTotalWithPauschal.toFixed(1)}
              </td>
              {employerHasSoll && <td className="px-4 py-3"></td>}
              {showSoll && <td className="px-4 py-3"></td>}
              {showSoll && <td className="px-4 py-3"></td>}
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tätigkeiten-Modal für einen Monat */}
      {modalMonth !== null && modalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Tätigkeiten ${getMonatName(modalMonth)}`}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={() => setModalMonth(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Tätigkeiten im {getMonatName(modalMonth)}
                </h2>
                <p className="text-sm text-gray-500">
                  {modalEntries.length} Einträge &middot; {formatStunden(modalTotalMin)} Std total ({formatDauer(modalTotalMin)})
                  {modalRow.pauschal > 0 && ` + ${modalRow.pauschal} Std Pauschale`}
                </p>
              </div>
              <button
                onClick={() => setModalMonth(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors rounded-lg p-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Schliessen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Keine Einträge in diesem Monat</p>
                </div>
              ) : (
                modalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`bg-gray-50 rounded-xl border border-gray-200 p-4 ${entry.abgerechnet ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}>
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
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
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
                      <span className={`text-sm font-semibold whitespace-nowrap shrink-0 ${entry.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}>
                        {formatDauer(entry.dauerMinuten)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
