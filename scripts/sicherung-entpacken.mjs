#!/usr/bin/env node
// Entpackt eine Gesamtsicherung (picktick-sicherung.json) in einzelne Datendateien.
// Aufruf: node scripts/sicherung-entpacken.mjs picktick-sicherung.json zielordner
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const [quelle, ziel] = process.argv.slice(2);
if (!quelle || !ziel) {
  console.error('Aufruf: node scripts/sicherung-entpacken.mjs <sicherung.json> <zielordner>');
  process.exit(2);
}
const daten = JSON.parse(readFileSync(quelle, 'utf-8'));
if (daten.picktickSicherung !== 1) {
  console.error('Das ist keine Gesamtsicherung von PickTick.');
  process.exit(1);
}
mkdirSync(ziel, { recursive: true });
let anzahl = 0;
for (const [datei, inhalt] of Object.entries(daten)) {
  if (!datei.endsWith('.json') || basename(datei) !== datei) continue;
  writeFileSync(join(ziel, datei), JSON.stringify(inhalt, null, 2));
  anzahl++;
}
console.log(`${anzahl} Dateien nach ${ziel} geschrieben.`);
