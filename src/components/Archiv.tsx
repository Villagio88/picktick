import { useMemo, useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { formatDauer, formatDatum, formatStunden, getMonatName, getPeriode, getPeriodeKey, getMonatOrder, getPeriodeLabel } from '../utils/format';
import { downloadCsv } from '../utils/csv';
import { rolleKurz } from '../data/rollen';

interface Props {
  entries: TimeEntry[];
  employer: string;
  employers: Employer[];
}

export function Archiv({ entries, employer, employers }: Props) {
  const emp = employers.find((e) => e.name === employer);
  const modus = emp?.periodeModus || 'schuljahr';
  const aktuellePeriode = getPeriode(new Date(), modus);
  const periodeStart = aktuellePeriode.start;
  const archivEntries = useMemo(
    () => entries.filter((e) => e.fuerWen === employer && e.datum < periodeStart).sort((a, b) => b.datum.localeCompare(a.datum)),
    [entries, employer, periodeStart]
  );

  // Group by school year (Aug–Jul)
  const schuljahre = useMemo(() => {
    const map = new Map<
      string,
      { label: string; entries: TimeEntry[]; totalMin: number; abgerechnetMin: number }
    >();

    archivEntries.forEach((e) => {
      if (!e.datum) return;
      const pk = getPeriodeKey(e.datum, modus);
      const key = pk.key;
      const label = pk.label;
      if (!map.has(key)) {
        map.set(key, { label, entries: [], totalMin: 0, abgerechnetMin: 0 });
      }
      const sj = map.get(key)!;
      sj.entries.push(e);
      sj.totalMin += e.dauerMinuten;
      if (e.abgerechnet) sj.abgerechnetMin += e.dauerMinuten;
    });

    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, val]) => val);
  }, [archivEntries, modus]);

  const [expandedSj, setExpandedSj] = useState<string | null>(null);

  const totalMin = archivEntries.reduce((s, e) => s + e.dauerMinuten, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Archiv</h1>
          <p className="text-sm text-gray-500">
            Einträge vor {getPeriodeLabel(modus)} {aktuellePeriode.label}
          </p>
        </div>
        <button
          onClick={() =>
            downloadCsv(archivEntries, `PickTick_Archiv.csv`)
          }
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Archiv exportieren
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Archiv-Einträge</div>
          <div className="text-2xl font-bold text-gray-900">
            {archivEntries.length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Total Stunden</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatStunden(totalMin)} Std
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Perioden</div>
          <div className="text-2xl font-bold text-gray-900">
            {schuljahre.length}
          </div>
        </div>
      </div>

      {/* School years accordion */}
      {schuljahre.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Download className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Kein Archiv vorhanden</p>
          <p className="text-sm text-gray-400 mt-1">Einträge aus vergangenen Perioden erscheinen hier automatisch.</p>
        </div>
      )}
      <div className="space-y-3">
        {schuljahre.map((sj) => {
          const isOpen = expandedSj === sj.label;
          const offenMin = sj.totalMin - sj.abgerechnetMin;
          return (
            <div
              key={sj.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSj(isOpen ? null : sj.label)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {getPeriodeLabel(modus)} {sj.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {sj.entries.length} Einträge
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900">
                    {formatStunden(sj.totalMin)} Std
                  </span>
                  {offenMin > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {formatStunden(offenMin)} offen
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200">
                  {/* Monthly breakdown */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-500">
                      {getMonatOrder(modus).map((m) => {
                        const mEntries = sj.entries.filter(
                          (e) => parseInt(e.datum.slice(5, 7)) === m
                        );
                        const mMin = mEntries.reduce(
                          (s, e) => s + e.dauerMinuten,
                          0
                        );
                        return (
                          <div key={m} className="text-center">
                            <div className="font-medium">
                              {getMonatName(m).slice(0, 3)}
                            </div>
                            <div className={mMin > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}>
                              {mMin > 0 ? formatStunden(mMin) : '–'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Entries list */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {sj.entries.map((entry) => (
                      <div key={entry.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {entry.beschreibung}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500">
                                {formatDatum(entry.datum)}
                              </span>
                              {entry.kategorie && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {rolleKurz(entry.kategorie) || entry.kategorie}
                                </span>
                              )}
                              {entry.abgerechnet ? (
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                  Abgerechnet
                                  {entry.rechnungsnummer
                                    ? ` (${entry.rechnungsnummer})`
                                    : ''}
                                </span>
                              ) : (
                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                  Offen
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-700 shrink-0">
                            {formatDauer(entry.dauerMinuten)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Export this school year */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={() =>
                        downloadCsv(
                          sj.entries,
                          `PickTick_SJ_${sj.label.replace('/', '-')}.csv`
                        )
                      }
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {getPeriodeLabel(modus)} {sj.label} exportieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
