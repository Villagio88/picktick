import fs from 'fs';
import { DATA_DIR, readJSON } from './store.js';

/**
 * Alle Datendateien (entries, employers, pensum, settings, meta, Rechnungszähler) in einem
 * Objekt, für den Knopf «Gesamtsicherung». Sitzungsgeheimnisse und Sicherungsordner
 * gehören nicht dazu.
 */
export function leseAlleDaten(): Record<string, unknown> {
  const daten: Record<string, unknown> = { picktickSicherung: 1, erstellt: new Date().toISOString() };
  for (const datei of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort()) {
    daten[datei] = readJSON(datei, null);
  }
  return daten;
}
