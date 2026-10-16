import fs from 'fs';
import path from 'path';
import { DATA_DIR, readJSON, DatenFehler } from './store.js';

/**
 * Alle Datendateien (entries, employers, pensum, settings, meta, Rechnungszähler) in einem
 * Objekt, für den Knopf «Gesamtsicherung». Sitzungsgeheimnisse und Sicherungsordner
 * gehören nicht dazu. Eine unlesbare Datei bricht die Sicherung nicht ab: Sie kommt als
 * Rohtext mit Vermerk mit, damit gerade dann noch gesichert werden kann.
 */
export function leseAlleDaten(): Record<string, unknown> {
  const daten: Record<string, unknown> = { picktickSicherung: 1, erstellt: new Date().toISOString() };
  const unlesbar: string[] = [];
  for (const datei of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort()) {
    try {
      daten[datei] = readJSON(datei, null);
    } catch (err) {
      if (!(err instanceof DatenFehler)) throw err;
      unlesbar.push(datei);
      daten[`${datei}.roh`] = fs.readFileSync(path.join(DATA_DIR, datei), 'utf-8');
    }
  }
  if (unlesbar.length) daten.unlesbar = unlesbar;
  return daten;
}
