import { useMemo, useState } from 'react';
import { Target, Clock, GraduationCap, Receipt } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { formatDauer, getMonatName, getMonatOrder, getPeriodeLabel, periodeKeyToRange, periodeKeyToLabel } from '../utils/format';
import { getPensumInfo, type PensumMap } from '../utils/pensum';
import { jahresFortschritt, prozent } from '../utils/fortschritt';
import { lightBg, darkText } from '../utils/color';
import { rolleKurz } from '../data/rollen';
import { RollenVerteilung } from './RollenVerteilung';


interface Props {
  entries: TimeEntry[];
  allEntries: TimeEntry[];
  onNewEntry: () => void;
  onNavigate: (view: 'historie') => void;
  employer: string;
  employers: Employer[];
  periodeKey: string;
  isCurrentPeriode: boolean;
  pensumMap: PensumMap;
}

export function Dashboard({ entries, allEntries, onNewEntry, onNavigate, employer, employers, periodeKey, isCurrentPeriode, pensumMap }: Props) {
  // Zeitpunkt einmal je Anzeige festhalten, damit Berechnungen stabil bleiben
  const [now] = useState(() => new Date());
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const emp = employers.find(e => e.name === employer);
  const modus = emp?.periodeModus || 'schuljahr';
  const periode = useMemo(() => {
    const range = periodeKeyToRange(periodeKey, modus);
    return { ...range, label: periodeKeyToLabel(periodeKey, modus) };
  }, [periodeKey, modus]);
  const empColor = emp?.farbe || '#3b82f6';
  const employerHasSoll = emp?.hasSoll ?? false;
  // Pauschal angerechnete Stunden je Monat, im Arbeitgeber einstellbar (0 = keine)
  const pauschaleProMonat = emp?.pauschaleStundenProMonat ?? 0;

  // Soll aus der Pensum-Historie der gewählten Periode (Fallback: aktuelle Einstellungen)
  const pensumInfo = getPensumInfo(emp, periodeKey, pensumMap);
  const SOLL_JAHR = pensumInfo.sollJahr;
  const SOLL_MONAT = SOLL_JAHR > 0 ? Math.round(SOLL_JAHR / 12 * 100) / 100 : 0;
  const showSoll = SOLL_JAHR > 0;

  // Perioden-Monate mit Stunden
  const monatOrder = getMonatOrder(modus);
  const schuljahrMonthly = useMemo(() => {
    const sjEntries = entries.filter(
      (e) => e.datum >= periode.start && e.datum <= periode.end
    );
    const map = new Map<number, number>();
    monatOrder.forEach((m) => map.set(m, 0));
    sjEntries.forEach((e) => {
      const m = parseInt(e.datum.slice(5, 7));
      map.set(m, (map.get(m) || 0) + e.dauerMinuten);
    });
    const pStartYear = parseInt(periode.start.slice(0, 4));
    const pStartMonth = parseInt(periode.start.slice(5, 7));
    const pEndYear = parseInt(periode.end.slice(0, 4));
    const yearForMonth = (m: number) => m >= pStartMonth ? pStartYear : pEndYear;
    return monatOrder.map((m) => ({
      monat: m,
      label: `${getMonatName(m)} ${yearForMonth(m)}`,
      labelShort: getMonatName(m).slice(0, 3),
      min: map.get(m)!,
      year: yearForMonth(m),
    }));
  }, [entries, periode, monatOrder]);

  // Welcher Monat-Index ist aktuell?
  const currentMonthIdx = isCurrentPeriode
    ? schuljahrMonthly.findIndex((m) => m.monat === currentMonth && m.year === currentYear)
    : schuljahrMonthly.length; // alte Periode: alle Monate zählen als vergangen

  // Anteil des aktuellen Monats (welche Woche?)
  const currentMonthFraction = useMemo(() => {
    if (!isCurrentPeriode) return 1;
    const day = now.getDate();
    if (day <= 7) return 0.25;
    if (day <= 14) return 0.5;
    if (day <= 21) return 0.75;
    return 1;
  }, [now, isCurrentPeriode]);

  // Pro Monat: protokollierte Stunden + Pauschale (nur mit Soll)
  const monthlyData = useMemo(() => {
    let cumProtokolliert = 0;
    let cumMitPauschal = 0;
    let cumSoll = 0;
    const zeilen = [];
    for (let i = 0; i < schuljahrMonthly.length; i++) {
      const m = schuljahrMonthly[i];
      const protokolliert = m.min / 60;
      const isPast = i < currentMonthIdx;
      const isCurrent = i === currentMonthIdx;
      // Pauschale nur mit Soll, vergangene und aktuellen Monat
      const pauschal = employerHasSoll && (isPast || isCurrent) ? pauschaleProMonat : 0;
      const total = protokolliert + pauschal;
      // Für den aktuellen Monat: anteiliges Soll je nach Woche
      const sollMonat = isCurrent ? SOLL_MONAT * currentMonthFraction : SOLL_MONAT;
      const diffMonat = total - sollMonat;
      cumProtokolliert += protokolliert;
      cumMitPauschal += total;
      cumSoll += isPast || isCurrent ? sollMonat : SOLL_MONAT;
      const diffKumuliert = cumMitPauschal - cumSoll;
      zeilen.push({
        ...m,
        protokolliert,
        pauschal,
        total,
        sollMonat,
        diffMonat,
        cumProtokolliert,
        cumMitPauschal,
        cumSoll,
        diffKumuliert,
        isPast,
        isCurrent,
        isFuture: i > currentMonthIdx,
      });
    }
    return zeilen;
  }, [schuljahrMonthly, currentMonthIdx, SOLL_MONAT, currentMonthFraction, employerHasSoll, pauschaleProMonat]);

  // Aktuelle Werte. Aktuelle Periode: aktueller Monat; alte Periode: letzter Monat (Jahresabschluss)
  const referenzIdx = isCurrentPeriode ? currentMonthIdx : monthlyData.length - 1;
  const cm = monthlyData[referenzIdx];
  const monatTotal = cm?.total ?? 0;
  const monatSoll = cm?.sollMonat ?? SOLL_MONAT;
  const monatDiff = cm?.diffMonat ?? 0;

  // Schuljahr kumuliert (bis inkl. aktueller Monat)
  const sjCum = cm?.cumMitPauschal ?? 0;
  const sjSollBisJetzt = cm?.cumSoll ?? 0;
  const sjDiff = cm?.diffKumuliert ?? 0;

  // Fortschritt in Prozent, gleiche Formeln wie der Monatsbericht an die Schulleitung:
  // erledigt = kumuliert inkl. Pauschale / Jahressoll, vergangen = Monate inkl. laufendem / 12,
  // Monat = Stunden des Monats / volles Monatssoll (nicht das wochenanteilige Soll oben)
  const monateVergangen = Math.max(0, isCurrentPeriode ? currentMonthIdx + 1 : monthlyData.length);
  const fortschritt = jahresFortschritt(sjCum, SOLL_JAHR, monateVergangen, monthlyData.length);
  const monatProzent = prozent(monatTotal, SOLL_MONAT);

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 10),
    [entries]
  );

  // Billing overview (across ALL entries, not just Schuljahr)
  // "Bezahlt" = abgerechnet + bezahlt, "Offen" = unbilled + billed-but-unpaid
  const billing = useMemo(() => {
    const stundenlohn = emp?.stundenlohn ?? 0;
    let paidMin = 0;
    let openMin = 0;
    allEntries.forEach((e) => {
      if (e.abgerechnet && e.bezahlt) paidMin += e.dauerMinuten;
      else openMin += e.dauerMinuten;
    });
    return {
      paidMin,
      openMin,
      totalMin: paidMin + openMin,
      paidAmount: stundenlohn > 0 ? (paidMin / 60) * stundenlohn : 0,
      openAmount: stundenlohn > 0 ? (openMin / 60) * stundenlohn : 0,
      totalAmount: stundenlohn > 0 ? ((paidMin + openMin) / 60) * stundenlohn : 0,
      stundenlohn,
    };
  }, [allEntries, emp]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Zeiterfassung {employer}
          </h1>
          {!showSoll && emp?.stundenlohn != null && emp.stundenlohn > 0 && (
            <p className="text-sm text-gray-500">CHF {emp.stundenlohn}.-/h</p>
          )}
        </div>
        <button
          onClick={() => onNewEntry()}
          className="text-white px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-85 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: empColor, ['--tw-ring-color' as string]: empColor }}
        >
          + Neuer Eintrag
        </button>
      </div>

      {/* ── Jahresübersicht ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: lightBg(empColor) }}>
              <Target className="w-5 h-5" style={{ color: empColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {showSoll ? `Jahressoll ${periode.label}` : `${getPeriodeLabel(modus)} ${periode.label}`}
              </h2>
              {showSoll && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  {pensumInfo.pensum != null && (
                    <><span className="font-medium">{pensumInfo.pensum.toFixed(1)}%</span> Pensum</>
                  )}
                  {pensumInfo.lektionen != null && emp?.lektionenVollzeit != null && (
                    <>&middot; {pensumInfo.lektionen}/{emp.lektionenVollzeit} Lekt.</>
                  )}
                  &middot; {SOLL_JAHR} Std/Jahr &middot; {SOLL_MONAT} Std/Monat
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            {/* Fortschritt in Prozent: erledigt gegen vergangen (wie im Monatsbericht) */}
            {showSoll && (
              <div
                className="text-right pr-5 border-r border-gray-200"
                title="Anteil des Jahressolls, der bereits geleistet ist (inkl. Pauschale), gegen den Anteil der vergangenen Monate"
              >
                <div className={`text-3xl font-bold leading-none ${fortschritt.voraus ? 'text-green-600' : 'text-red-600'}`}>
                  {fortschritt.erledigt} %
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  erledigt &middot; {fortschritt.vergangen} % vergangen
                  {isCurrentPeriode && ` (Monat ${monateVergangen} von ${monthlyData.length})`}
                </div>
              </div>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {sjCum.toFixed(1)} Std
                {showSoll && (
                  <span className="text-base font-normal text-gray-400">
                    {' '}/ {SOLL_JAHR} Std
                  </span>
                )}
              </div>
              {showSoll && (
              <div
                className={`text-sm font-medium ${sjDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {sjDiff >= 0 ? '+' : ''}
                {sjDiff.toFixed(1)} Std{' '}
                {sjDiff >= 0 ? 'voraus' : 'Rückstand'}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Segmentierter Jahresbalken (12 Monate) */}
        <div className="mb-1">
          {/* Monatslabels ÜBER dem Balken */}
          <div className="flex mb-1">
            {monthlyData.map((m) => (
              <div
                key={m.monat}
                className={`flex-1 text-center text-[10px] ${m.isCurrent ? 'font-bold' : m.isFuture ? 'text-gray-300' : 'text-gray-500'}`}
                style={m.isCurrent ? { color: darkText(empColor) } : undefined}
              >
                {m.labelShort}
              </div>
            ))}
          </div>

          {/* Balken */}
          <div className="flex h-10 rounded-lg overflow-hidden border border-gray-200">
            {monthlyData.map((m, i) => {
              let bg = 'bg-gray-100';
              let bgStyle: React.CSSProperties = {};
              let ringStyle: React.CSSProperties = {};

              if (m.isCurrent) {
                bgStyle = { backgroundColor: empColor };
                ringStyle = { boxShadow: `inset 0 0 0 2px ${darkText(empColor)}` };
              } else if (m.isPast) {
                if (showSoll) {
                  const erreicht = m.total >= SOLL_MONAT;
                  if (m.total === 0) bg = 'bg-red-200';
                  else bg = erreicht ? 'bg-green-400' : 'bg-red-300';
                } else {
                  if (m.total > 0) bgStyle = { backgroundColor: lightBg(empColor, 0.35) };
                }
              }

              const title = showSoll
                ? `${m.label}: ${m.total.toFixed(1)} Std\nKumuliert: ${m.cumMitPauschal.toFixed(1)} / ${m.cumSoll.toFixed(1)} Std (${m.diffKumuliert >= 0 ? '+' : ''}${m.diffKumuliert.toFixed(1)})`
                : `${m.label}: ${m.total.toFixed(1)} Std`;

              return (
                <div
                  key={m.monat}
                  className={`flex-1 ${bg} ${i > 0 ? 'border-l border-white/60' : ''} flex items-center justify-center transition-colors`}
                  style={{ ...bgStyle, ...ringStyle }}
                  title={title}
                >
                  {(m.isPast || m.isCurrent) && m.total > 0 && (
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">
                      {m.total.toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stunden pro Monat (für alle Arbeitgeber) */}
          <div className="flex items-start mt-1.5">
            <span className="text-[9px] text-gray-400 shrink-0 w-20 pt-px">
              {showSoll ? '+/– Monat' : 'Std/Monat'}
            </span>
            <div className="flex flex-1">
              {monthlyData.map((m) => {
                if (m.isFuture && m.total === 0) {
                  return (
                    <div key={m.monat} className="flex-1 text-center text-[10px] text-gray-300">
                      –
                    </div>
                  );
                }
                if (showSoll) {
                  const diff = m.diffMonat;
                  const hasHours = m.total > 0;
                  return (
                    <div
                      key={m.monat}
                      className={`flex-1 text-center text-[10px] font-semibold ${
                        m.isCurrent
                          ? diff >= 0 ? 'text-green-600' : 'text-primary-600'
                          : diff >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}
                    >
                      {hasHours || m.isPast || m.isCurrent
                        ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`
                        : '–'}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.monat}
                    className={`flex-1 text-center text-[10px] font-semibold ${
                      m.isCurrent ? '' : 'text-gray-600'
                    }`}
                    style={m.isCurrent ? { color: darkText(empColor) } : undefined}
                  >
                    {m.total > 0 || m.isPast || m.isCurrent
                      ? m.total.toFixed(1)
                      : '–'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kumuliertes Jahressaldo (nur mit Soll) */}
          {showSoll && (
          <div className="flex items-start mt-0.5 pt-0.5 border-t border-gray-100">
            <span className="text-[9px] text-gray-400 shrink-0 w-20 pt-px">Saldo kum.</span>
            <div className="flex flex-1">
              {monthlyData.map((m) => {
                if (m.isFuture && m.total === 0) {
                  return (
                    <div key={m.monat} className="flex-1 text-center text-[10px] text-gray-300">
                    </div>
                  );
                }
                if (!m.isPast && !m.isCurrent) return <div key={m.monat} className="flex-1" />;
                return (
                  <div
                    key={m.monat}
                    className={`flex-1 text-center text-[11px] font-semibold ${m.diffKumuliert >= 0 ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {m.diffKumuliert >= 0 ? '+' : ''}{m.diffKumuliert.toFixed(1)}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ── Monat & Schuljahr Karten ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isCurrentPeriode ? (
        /* Aktueller Monat */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: lightBg(empColor) }}>
              <Clock className="w-5 h-5" style={{ color: empColor }} />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {getMonatName(currentMonth)} {currentYear}
            </span>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {monatTotal.toFixed(1)} Std
                </span>
                {showSoll && (
                  <span
                    className={`text-2xl font-bold ${monatProzent >= 100 ? 'text-green-600' : 'text-gray-700'}`}
                    title={`${monatTotal.toFixed(1)} von ${SOLL_MONAT} Std Monatssoll`}
                  >
                    {monatProzent} %
                  </span>
                )}
              </div>
              {showSoll && (
                <div className="text-sm text-gray-500">des Monatssolls erledigt</div>
              )}
            </div>
            {showSoll && (
            <div className="text-right">
              <div className="text-sm text-gray-400">
                Soll: {monatSoll.toFixed(1)} Std
                {currentMonthFraction < 1 && (
                  <span className="text-[10px] text-gray-300 ml-1">
                    (Woche {Math.round(currentMonthFraction * 4)}/4)
                  </span>
                )}
              </div>
              <div
                className={`text-sm font-semibold ${monatDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {monatDiff >= 0 ? '+' : ''}
                {monatDiff.toFixed(1)} Std
              </div>
            </div>
            )}
          </div>
          {showSoll && (
          <>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${monatDiff >= 0 ? 'bg-green-500' : 'bg-primary-500'}`}
              style={{
                width: `${Math.min((monatTotal / SOLL_MONAT) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>0</span>
            <span>{SOLL_MONAT} Std</span>
          </div>
          </>
          )}
        </div>
        ) : (
        /* Jahresbilanz (abgeschlossene Periode) */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: lightBg(empColor) }}>
              <Clock className="w-5 h-5" style={{ color: empColor }} />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Jahresbilanz {periode.label}
            </span>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">{sjCum.toFixed(1)} Std</span>
                {showSoll && (
                  <span className={`text-2xl font-bold ${fortschritt.voraus ? 'text-green-600' : 'text-red-600'}`}>
                    {fortschritt.erledigt} %
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">Total inkl. Pauschale</div>
            </div>
            {showSoll && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Jahressoll: {SOLL_JAHR} Std</div>
                <div className={`text-sm font-semibold ${sjDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sjDiff >= 0 ? '+' : ''}{sjDiff.toFixed(1)} Std
                </div>
              </div>
            )}
          </div>
          {showSoll && (
            <>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${sjDiff >= 0 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min((sjCum / SOLL_JAHR) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>0</span>
                <span>{SOLL_JAHR} Std</span>
              </div>
            </>
          )}
        </div>
        )}

        {/* Schuljahr */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: lightBg(empColor) }}>
              <GraduationCap className="w-5 h-5" style={{ color: empColor }} />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {getPeriodeLabel(modus)} {periode.label}
            </span>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {sjCum.toFixed(1)} Std
                </span>
                {showSoll && (
                  <span
                    className={`text-2xl font-bold ${fortschritt.voraus ? 'text-green-600' : 'text-red-600'}`}
                    title={`${fortschritt.erledigt} % des Jahressolls erledigt, ${fortschritt.vergangen} % der Periode vergangen`}
                  >
                    {fortschritt.erledigt} %
                  </span>
                )}
              </div>
              {showSoll && (
              <div className="text-sm text-gray-500">
                {isCurrentPeriode
                  ? `Soll bis ${getMonatName(currentMonth)}: ${sjSollBisJetzt.toFixed(1)} Std`
                  : `${getPeriodeLabel(modus)} abgeschlossen`}
              </div>
              )}
            </div>
            {showSoll && (
            <div className="text-right">
              <div className="text-sm text-gray-400">
                Jahressoll: {SOLL_JAHR} Std
              </div>
              <div
                className={`text-sm font-semibold ${sjDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {sjDiff >= 0 ? '+' : ''}
                {sjDiff.toFixed(1)} Std
              </div>
            </div>
            )}
          </div>
          {showSoll && (
          <>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${sjDiff >= 0 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{
                width: `${Math.min((sjCum / SOLL_JAHR) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>0</span>
            <span>{SOLL_JAHR} Std</span>
          </div>
          </>
          )}
        </div>
      </div>

      {/* ── Monatsübersicht (Balkendiagramm) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Monatsübersicht
            {showSoll && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              Soll: {SOLL_MONAT} Std / Monat
            </span>
            )}
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {showSoll && (
            <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Soll erreicht
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Unter Soll
            </span>
            </>
            )}
            {employerHasSoll && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" /> Pauschale
            </span>
            )}
          </div>
        </div>

        {(() => {
          const BAR_AREA = 192; // px, feste Höhe für den Balkenbereich
          const maxVal = Math.max(
            ...monthlyData.map((x) => x.total),
            showSoll ? SOLL_MONAT * 1.1 : 1
          );
          const sollPx = showSoll ? (SOLL_MONAT / maxVal) * BAR_AREA : 0;

          return (
            <div className="relative" style={{ paddingBottom: '28px' }}>
              {/* Balken */}
              <div className="grid grid-cols-12 gap-2 items-end" style={{ height: `${BAR_AREA + 20}px` }}>
                {monthlyData.map((m) => {
                  const protPx = (m.protokolliert / maxVal) * BAR_AREA;
                  const pausPx = (m.pauschal / maxVal) * BAR_AREA;

                  let barClass = 'bg-gray-100';
                  let barStyle: React.CSSProperties = {};

                  if (m.isCurrent) {
                    barClass = '';
                    barStyle = { backgroundColor: empColor };
                  } else if (m.isPast) {
                    if (showSoll) {
                      const erreicht = m.total >= SOLL_MONAT;
                      barClass = erreicht ? 'bg-green-500' : 'bg-red-400';
                    } else {
                      if (m.protokolliert > 0) {
                        barClass = '';
                        barStyle = { backgroundColor: lightBg(empColor, 0.3) };
                      }
                    }
                  } else if (m.protokolliert > 0) {
                    barClass = '';
                    barStyle = { backgroundColor: lightBg(empColor, 0.5) };
                  }

                  const erreicht = showSoll && m.total >= SOLL_MONAT;

                  // Label-Farbe über dem Balken
                  let labelStyle: React.CSSProperties | undefined;
                  let labelClass = 'text-gray-500';
                  if (m.isCurrent) {
                    labelClass = '';
                    labelStyle = { color: darkText(empColor) };
                  } else if (erreicht) {
                    labelClass = 'text-green-700';
                  } else if (m.isPast && showSoll) {
                    labelClass = 'text-red-600';
                  }

                  return (
                    <div
                      key={m.monat}
                      className="flex flex-col items-center justify-end h-full"
                      title={`${m.label}: ${m.protokolliert.toFixed(1)} + ${m.pauschal} = ${m.total.toFixed(1)} Std`}
                    >
                      {m.total > 0 && (
                        <span
                          className={`text-[10px] mb-1 font-medium shrink-0 ${labelClass}`}
                          style={labelStyle}
                        >
                          {m.total.toFixed(1)}
                        </span>
                      )}
                      <div className="w-full flex flex-col justify-end">
                        {/* Protokollierte Stunden (oben, farbig) */}
                        <div
                          className={`w-full rounded-t transition-all ${barClass}`}
                          style={{ height: `${Math.max(protPx, m.protokolliert > 0 ? 3 : 0)}px`, ...barStyle, ...(m.isCurrent ? { boxShadow: `0 0 0 1px white, 0 0 0 3px ${empColor}` } : {}) }}
                        />
                        {/* Pauschale (unten, grau) */}
                        {m.pauschal > 0 ? (
                          <div
                            className="w-full bg-gray-300 rounded-b"
                            style={{ height: `${Math.max(pausPx, 2)}px` }}
                          />
                        ) : (
                          m.protokolliert === 0 && (
                            <div
                              className="w-full bg-gray-100 rounded"
                              style={{ height: '3px' }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Soll-Linie (nur mit Soll) */}
              {showSoll && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400 pointer-events-none"
                style={{ bottom: `${sollPx + 28}px` }}
              >
                <span className="absolute -top-4 right-0 text-[10px] text-gray-400 font-medium">
                  Soll {SOLL_MONAT} Std
                </span>
              </div>
              )}
            </div>
          );
        })()}

        {/* Monatslabels */}
        <div className="grid grid-cols-12 gap-2">
          {monthlyData.map((m) => (
            <div
              key={m.monat}
              className={`text-center text-[11px] ${m.isCurrent ? 'font-bold' : 'text-gray-500'}`}
              style={m.isCurrent ? { color: darkText(empColor) } : undefined}
            >
              {m.labelShort}
            </div>
          ))}
        </div>

        {/* +/- pro Monat (nur mit Soll) */}
        {showSoll && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-12 gap-2 text-center">
            {monthlyData.map((m) => {
              if (m.isFuture && m.total === 0) {
                return (
                  <div key={m.monat} className="text-[10px] text-gray-300">
                    –
                  </div>
                );
              }
              return (
                <div
                  key={m.monat}
                  className={`text-[10px] font-medium ${
                    m.diffMonat >= 0 ? 'text-green-700' : m.isPast ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {m.total > 0 || m.isPast || m.isCurrent
                    ? `${m.diffMonat >= 0 ? '+' : ''}${m.diffMonat.toFixed(1)}`
                    : '–'}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* ── Rollen PICTS und TICTS ── */}
      <RollenVerteilung entries={entries} />

      {/* ── Abrechnung Übersicht (nur für Stundenlohn-Arbeitgeber) ── */}
      {!employerHasSoll && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Receipt className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Abrechnung</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Bezahlt</div>
            {billing.stundenlohn > 0 ? (
              <div className="text-xl font-bold text-green-600">
                CHF {billing.paidAmount.toFixed(2)}
              </div>
            ) : (
              <div className="text-xl font-bold text-green-600">
                {formatDauer(billing.paidMin)}
              </div>
            )}
            <div className="text-sm text-gray-400">{formatDauer(billing.paidMin)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Offen</div>
            {billing.stundenlohn > 0 ? (
              <div className="text-xl font-bold text-amber-600">
                CHF {billing.openAmount.toFixed(2)}
              </div>
            ) : (
              <div className="text-xl font-bold text-amber-600">
                {formatDauer(billing.openMin)}
              </div>
            )}
            <div className="text-sm text-gray-400">{formatDauer(billing.openMin)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Total</div>
            {billing.stundenlohn > 0 ? (
              <div className="text-xl font-bold text-gray-900">
                CHF {billing.totalAmount.toFixed(2)}
              </div>
            ) : (
              <div className="text-xl font-bold text-gray-900">
                {formatDauer(billing.totalMin)}
              </div>
            )}
            <div className="text-sm text-gray-400">{formatDauer(billing.totalMin)}</div>
          </div>
        </div>
        {billing.totalMin > 0 && (
          <div className="mt-3">
            <div className="w-full bg-amber-400 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${(billing.paidMin / billing.totalMin) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{((billing.paidMin / billing.totalMin) * 100).toFixed(0)}% bezahlt</span>
              <span>{formatDauer(billing.totalMin)}</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Letzte Einträge (volle Breite) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Letzte Einträge
          </h2>
          <button
            onClick={() => onNavigate('historie')}
            className="text-sm hover:opacity-75 cursor-pointer"
            style={{ color: empColor }}
          >
            Alle anzeigen &rarr;
          </button>
        </div>
        {recentEntries.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Noch keine Einträge vorhanden</p>
            <p className="text-sm text-gray-400 mt-1">Erstelle deinen ersten Zeiteintrag.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((e) => (
              <div
                key={e.id}
                className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${e.abgerechnet ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className={`text-sm truncate ${e.abgerechnet ? 'text-gray-400' : 'text-gray-900'}`}>
                    {e.beschreibung.slice(0, 120)}
                    {e.beschreibung.length > 120 ? '...' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {e.datum
                      ? `${e.datum.split('-')[2]}.${e.datum.split('-')[1]}.${e.datum.split('-')[0]}`
                      : ''}
                    {e.startZeit && e.endZeit && (
                      <span className="text-gray-400"> {e.startZeit} – {e.endZeit}</span>
                    )}
                    {e.kategorie ? ` · ${rolleKurz(e.kategorie) || e.kategorie}` : ''}
                    {e.abgerechnet && (
                      <span className="text-gray-400 ml-1"> · abgerechnet</span>
                    )}
                  </p>
                </div>
                <span className={`text-sm font-medium shrink-0 ${e.abgerechnet ? 'text-gray-400' : 'text-gray-700'}`}>
                  {formatDauer(e.dauerMinuten)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
