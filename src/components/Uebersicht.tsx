import { useMemo } from 'react';
import { BarChart3, Receipt, Building2, Clock } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { formatDauer, getPeriodeKey, periodeKeyToRange, periodeKeyToLabel, todayISO } from '../utils/format';

interface Props {
  entries: TimeEntry[];
  employers: Employer[];
  periodeKey: string | null; // null = aktuelle Periode
}

export function Uebersicht({ entries, employers, periodeKey }: Props) {
  const perEmployer = useMemo(() => {
    return employers.map((emp) => {
      const all = entries.filter((e) => e.fuerWen === emp.name);
      const modus = emp.periodeModus || 'schuljahr';
      const effKey = periodeKey ?? getPeriodeKey(todayISO(), modus).key;
      const range = periodeKeyToRange(effKey, modus);
      const sjEntries = all.filter(
        (e) => e.datum >= range.start && e.datum <= range.end
      );
      let paidMin = 0;       // abgerechnet + bezahlt
      let openMin = 0;       // nicht abgerechnet + abgerechnet aber nicht bezahlt
      all.forEach((e) => {
        if (e.abgerechnet && e.bezahlt) paidMin += e.dauerMinuten;
        else openMin += e.dauerMinuten;
      });
      const sjMin = sjEntries.reduce((s, e) => s + e.dauerMinuten, 0);
      const stundenlohn = emp.stundenlohn ?? 0;
      return {
        emp,
        totalMin: paidMin + openMin,
        paidMin,
        openMin,
        sjMin,
        paidAmount: stundenlohn > 0 ? (paidMin / 60) * stundenlohn : 0,
        openAmount: stundenlohn > 0 ? (openMin / 60) * stundenlohn : 0,
        totalAmount: stundenlohn > 0 ? ((paidMin + openMin) / 60) * stundenlohn : 0,
        stundenlohn,
        entryCount: all.length,
      };
    }).filter((d) => d.entryCount > 0);
  }, [entries, employers, periodeKey]);

  // Only non-hasSoll employers count for billing totals
  const billingEmployers = useMemo(
    () => perEmployer.filter((d) => !d.emp.hasSoll),
    [perEmployer]
  );

  const billingTotals = useMemo(() => {
    let paidAmount = 0;
    let openAmount = 0;
    let paidMin = 0;
    let openMin = 0;
    billingEmployers.forEach((d) => {
      paidAmount += d.paidAmount;
      openAmount += d.openAmount;
      paidMin += d.paidMin;
      openMin += d.openMin;
    });
    return {
      paidAmount,
      openAmount,
      totalAmount: paidAmount + openAmount,
      paidMin,
      openMin,
    };
  }, [billingEmployers]);

  const sjTotalMin = useMemo(
    () => perEmployer.reduce((s, d) => s + d.sjMin, 0),
    [perEmployer]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Gesamtübersicht
      </h1>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {periodeKey === null ? 'Aktuelle Periode' : `Periode ${periodeKeyToLabel(periodeKey, 'schuljahr')}`}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatDauer(sjTotalMin)}</div>
          <div className="text-sm text-gray-500">{perEmployer.length} Arbeitgeber</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Bezahlt</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            CHF {billingTotals.paidAmount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">{formatDauer(billingTotals.paidMin)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-500">Offen</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            CHF {billingTotals.openAmount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">{formatDauer(billingTotals.openMin)}</div>
        </div>
      </div>

      {/* Revenue breakdown */}
      {billingTotals.totalAmount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Umsatz</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">Bezahlt</div>
              <div className="text-xl font-bold text-green-600">CHF {billingTotals.paidAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Offen</div>
              <div className="text-xl font-bold text-amber-600">CHF {billingTotals.openAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-bold text-gray-900">CHF {billingTotals.totalAmount.toFixed(2)}</div>
            </div>
          </div>
          <div className="w-full bg-amber-400 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-green-500 transition-all"
              style={{ width: `${(billingTotals.paidAmount / billingTotals.totalAmount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Per employer cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Pro Arbeitgeber</h2>
        {perEmployer.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Noch keine Einträge vorhanden</p>
            <p className="text-sm text-gray-400 mt-1">Erstelle deinen ersten Zeiteintrag, um die Übersicht zu sehen.</p>
          </div>
        )}
        {perEmployer
          .sort((a, b) => b.totalMin - a.totalMin)
          .map(({ emp, totalMin, paidMin, openMin, sjMin, paidAmount, openAmount, totalAmount, stundenlohn }) => (
            <div
              key={emp.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: emp.farbe || '#6b7280' }}
                  />
                  <span className="font-semibold text-gray-900">{emp.name}</span>
                  {emp.hasSoll ? (
                    emp.pensum != null && (
                      <span className="text-xs text-gray-400">
                        {emp.pensum.toFixed(1)}% Pensum
                        {emp.lektionen != null && emp.lektionenVollzeit != null && (
                          <> &middot; {emp.lektionen}/{emp.lektionenVollzeit} Lekt.</>
                        )}
                        {emp.sollStundenJahr != null && (
                          <> &middot; {emp.sollStundenJahr} Std/J</>
                        )}
                      </span>
                    )
                  ) : (
                    stundenlohn > 0 && (
                      <span className="text-xs text-gray-400">CHF {stundenlohn}.-/h</span>
                    )
                  )}
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Periode: {formatDauer(sjMin)}
                </span>
              </div>

              {emp.hasSoll ? (
                /* Soll-Arbeitgeber: nur Stunden-Übersicht, keine Abrechnung */
                <div className="text-sm text-gray-500">
                  {formatDauer(totalMin)} total
                </div>
              ) : (
                /* Stundenlohn-Arbeitgeber: Abrechnung mit CHF */
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Bezahlt</div>
                      {stundenlohn > 0 ? (
                        <div className="text-sm font-bold text-green-600">CHF {paidAmount.toFixed(2)}</div>
                      ) : (
                        <div className="text-sm font-bold text-green-600">{formatDauer(paidMin)}</div>
                      )}
                      <div className="text-xs text-gray-400">{formatDauer(paidMin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Offen</div>
                      {stundenlohn > 0 ? (
                        <div className="text-sm font-bold text-amber-600">CHF {openAmount.toFixed(2)}</div>
                      ) : (
                        <div className="text-sm font-bold text-amber-600">{formatDauer(openMin)}</div>
                      )}
                      <div className="text-xs text-gray-400">{formatDauer(openMin)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Total</div>
                      {stundenlohn > 0 ? (
                        <div className="text-sm font-bold text-gray-900">CHF {totalAmount.toFixed(2)}</div>
                      ) : (
                        <div className="text-sm font-bold text-gray-900">{formatDauer(totalMin)}</div>
                      )}
                      <div className="text-xs text-gray-400">{formatDauer(totalMin)}</div>
                    </div>
                  </div>

                  {totalMin > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-amber-400 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all"
                          style={{ width: `${(paidMin / totalMin) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
