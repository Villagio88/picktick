import type { TimeEntry, Employer } from '../types';

/**
 * Bereitet einen Eintrag aus dem Formular zum Speichern vor, gleich für Desktop und
 * Handy. Gibt eine Kopie zurück und verändert das Argument nicht.
 *
 * - Bearbeiten: Rechnungsnummer und Zahlungsfelder bleiben, wie sie waren. Wurde
 *   «abgerechnet» im Formular von Hand umgestellt, folgt der Zahlungsstatus mit (ohne
 *   Rechnung gibt es keine offene Zahlung).
 * - Neu: Arbeitgeber mit automatischer Abrechnung setzen abgerechnet und bezahlt.
 */
export function zumSpeichern(entry: TimeEntry, bisher: TimeEntry | null, employers: Employer[]): TimeEntry {
  const e: TimeEntry = { ...entry };
  if (bisher) {
    e.rechnungsnummer = bisher.rechnungsnummer;
    if (e.abgerechnet !== bisher.abgerechnet) {
      if (e.abgerechnet) {
        e.bezahlt = true;
        e.bezahltVon = bisher.bezahltVon || e.fuerWen;
        e.bezahltAm = bisher.bezahltAm || e.datum;
      } else {
        e.bezahlt = false;
        e.bezahltAm = undefined;
        e.bezahltVon = undefined;
      }
    } else {
      e.bezahlt = bisher.bezahlt;
      e.bezahltAm = bisher.bezahltAm;
      e.bezahltVon = bisher.bezahltVon;
    }
    return e;
  }
  if (employers.find((x) => x.name === e.fuerWen)?.autoAbgerechnet) {
    e.abgerechnet = true;
    e.bezahlt = true;
    e.bezahltVon = e.fuerWen;
    e.bezahltAm = e.datum;
  }
  return e;
}
