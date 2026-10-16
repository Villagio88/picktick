/**
 * Datum im lokalen Kalender als JJJJ-MM-TT. toISOString() rechnet in UTC und liefert
 * in der Schweiz zwischen Mitternacht und 01:00 (Sommer 02:00) noch den Vortag.
 */
export function lokalesDatum(d: Date = new Date()): string {
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

/** Prüft ein Datum JJJJ-MM-TT auf Form und Gültigkeit (kein 31. Februar). */
export function istGueltigesDatum(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [j, m, t] = s.split('-').map(Number);
  const d = new Date(j, m - 1, t);
  return d.getFullYear() === j && d.getMonth() === m - 1 && d.getDate() === t;
}

/** Leer oder HH:MM von 00:00 bis 23:59. */
export function istGueltigeZeit(s: unknown): s is string {
  return typeof s === 'string' && (s === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(s));
}
