import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { TimeEntry } from '../types';
import { ROLLEN } from '../data/rollen';
import { rollenSummen, rollenProMonat, anteilPicts } from '../utils/rollenStatistik';
import type { RollenSchluessel } from '../utils/rollenStatistik';
import { formatStunden, getMonatName } from '../utils/format';

const OHNE_FARBE = '#d1d5db';

function farbe(s: RollenSchluessel): string {
  return ROLLEN.find((r) => r.wert === s)?.farbe ?? OHNE_FARBE;
}

function label(s: RollenSchluessel): string {
  return ROLLEN.find((r) => r.wert === s)?.kurz ?? 'ohne Rolle';
}

/**
 * Verteilung der Arbeitszeit auf die Rollen PICTS und TICTS für die gewählte Periode:
 * Summen, Anteil PICTS und ein gestapelter Balken je Monat.
 */
export function RollenVerteilung({ entries }: { entries: TimeEntry[] }) {
  const summen = useMemo(() => rollenSummen(entries), [entries]);
  const monate = useMemo(() => rollenProMonat(entries), [entries]);
  const total = summen.reduce((s, x) => s + x.minuten, 0);
  const anteil = anteilPicts(summen);
  const maxMonat = Math.max(1, ...monate.map((m) => m.total));
  const ohne = summen.find((s) => s.schluessel === 'ohne')?.minuten ?? 0;

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rollen</h2>
            <p className="text-xs text-gray-500">TICTS technischer, PICTS pädagogischer ICT-Support</p>
          </div>
        </div>
        {anteil != null && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{anteil}%</div>
            <div className="text-xs text-gray-500" title="«beides» zählt je zur Hälfte, Einträge ohne Rolle zählen nicht">Anteil PICTS</div>
          </div>
        )}
      </div>

      {/* Gesamtbalken */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100" role="img"
        aria-label={summen.filter((s) => s.minuten > 0).map((s) => `${label(s.schluessel)} ${formatStunden(s.minuten)} Stunden`).join(', ')}>
        {summen.filter((s) => s.minuten > 0).map((s) => (
          <div key={s.schluessel} style={{ width: `${(s.minuten / total) * 100}%`, backgroundColor: farbe(s.schluessel) }} />
        ))}
      </div>

      <div className={`grid grid-cols-2 ${ohne > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 mt-4`}>
        {summen.filter((s) => s.schluessel !== 'ohne' || s.minuten > 0).map((s) => (
          <div key={s.schluessel}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: farbe(s.schluessel) }} />
              {label(s.schluessel)}
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatStunden(s.minuten)} Std</div>
            <div className="text-xs text-gray-400">{total > 0 ? Math.round((s.minuten / total) * 100) : 0}%</div>
          </div>
        ))}
      </div>

      {/* Monate */}
      {monate.length > 1 && (
        <div className="mt-5 flex items-end gap-2 h-32" aria-hidden="true">
          {monate.map((m) => {
            const [jahr, mon] = m.monat.split('-');
            return (
              <div key={m.monat} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${getMonatName(Number(mon))} ${jahr}: ${formatStunden(m.total)} Std`}>
                <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${(m.total / maxMonat) * 100}px` }}>
                  {(['technischer Support', 'pädagogischer Support', 'beides', 'ohne'] as RollenSchluessel[]).map((k) =>
                    m.minuten[k] > 0 ? (
                      <div key={k} style={{ height: `${(m.minuten[k] / m.total) * 100}%`, backgroundColor: farbe(k) }} />
                    ) : null,
                  )}
                </div>
                <span className="text-[10px] text-gray-500 truncate">{getMonatName(Number(mon)).slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      )}

      {ohne > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          {formatStunden(ohne)} Std ohne Rolle. Beim Bearbeiten eines Eintrags lässt sich die Rolle nachtragen.
        </p>
      )}
    </div>
  );
}
