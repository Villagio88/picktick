export function formatDauer(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

export function formatStunden(minuten: number): string {
  return (minuten / 60).toFixed(1);
}

export function formatDatum(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

export function berechneMinuten(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export function getMonatName(monat: number): string {
  const namen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];
  return namen[monat - 1] || '';
}

export type PeriodeModus = 'schuljahr' | 'kalenderjahr';

export interface Periode {
  start: string;
  end: string;
  label: string;
}

/** Berechnet die aktuelle Periode (Schuljahr Aug-Jul oder Kalenderjahr Jan-Dez). */
export function getPeriode(date: Date = new Date(), modus: PeriodeModus = 'schuljahr'): Periode {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (modus === 'kalenderjahr') {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}` };
  }
  const startYear = m >= 8 ? y : y - 1;
  return {
    start: `${startYear}-08-01`,
    end: `${startYear + 1}-07-31`,
    label: `${startYear}/${startYear + 1}`,
  };
}

/** Periode-Key aus einem Datum-String (für Gruppierung). */
export function getPeriodeKey(datum: string, modus: PeriodeModus = 'schuljahr'): { key: string; label: string } {
  const [y, m] = datum.split('-').map(Number);
  if (modus === 'kalenderjahr') {
    return { key: `${y}`, label: `${y}` };
  }
  const startYear = m >= 8 ? y : y - 1;
  return { key: `${startYear}`, label: `${startYear}/${startYear + 1}` };
}

/** Monatsreihenfolge: Schuljahr Aug→Jul, Kalenderjahr Jan→Dez. */
export function getMonatOrder(modus: PeriodeModus = 'schuljahr'): number[] {
  if (modus === 'kalenderjahr') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];
}

/** Periode-Label für Anzeige: "Schuljahr" oder "Jahr". */
export function getPeriodeLabel(modus: PeriodeModus = 'schuljahr'): string {
  return modus === 'kalenderjahr' ? 'Jahr' : 'Schuljahr';
}

/** Berechnet Start/End aus einem Periode-Key (z.B. "2025" → Jan-Dez oder "2025" → Aug 2025 - Jul 2026). */
export function periodeKeyToRange(key: string, modus: PeriodeModus = 'schuljahr'): { start: string; end: string } {
  const startYear = parseInt(key);
  if (modus === 'kalenderjahr') {
    return { start: `${startYear}-01-01`, end: `${startYear}-12-31` };
  }
  return { start: `${startYear}-08-01`, end: `${startYear + 1}-07-31` };
}

/** Label aus einem Periode-Key: "2025" → "2025/2026" (Schuljahr) bzw. "2025" (Kalenderjahr). */
export function periodeKeyToLabel(key: string, modus: PeriodeModus = 'schuljahr'): string {
  if (modus === 'kalenderjahr') return key;
  const startYear = parseInt(key);
  return `${startYear}/${startYear + 1}`;
}

/** Alle wählbaren Perioden aus einer Datumsliste, inkl. aktueller Periode, neueste zuerst. */
export function getPeriodeOptions(
  daten: string[],
  modus: PeriodeModus = 'schuljahr',
  heute: string = todayISO()
): { key: string; label: string }[] {
  const map = new Map<string, string>();
  const current = getPeriodeKey(heute, modus);
  map.set(current.key, current.label);
  daten.forEach((datum) => {
    if (!datum) return;
    const pk = getPeriodeKey(datum, modus);
    map.set(pk.key, pk.label);
  });
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, label]) => ({ key, label }));
}

/** Trennt das Feld `leistung` («A, B») in Einzelwerte, ohne Leerwerte. */
export function parseLeistungen(leistung: string | undefined): string[] {
  if (!leistung) return [];
  return leistung.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Fügt Einzelwerte zum gespeicherten Feldwert zusammen, dedupliziert, Reihenfolge bleibt. */
export function joinLeistungen(werte: string[]): string {
  const gesehen = new Set<string>();
  const out: string[] = [];
  for (const w of werte) {
    const t = w.trim();
    if (t && !gesehen.has(t)) {
      gesehen.add(t);
      out.push(t);
    }
  }
  return out.join(', ');
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}
