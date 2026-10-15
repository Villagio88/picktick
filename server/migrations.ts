import { readJSON, writeJSON } from './store.js';

interface Meta {
  migrationVersion: number;
  seeded?: boolean;
}

/**
 * Datenstand von PickTick. Version 20 ist der Ausgangspunkt der veröffentlichten
 * Fassung: Ältere Installationen (Version 1 bis 19) haben ihre Migrationen bereits
 * hinter sich und werden nur auf 20 gehoben, frische Installationen starten leer.
 * Neue Migrationen bekommen eine eigene Nummer ab 21 und hängen hier unten an.
 */
const CURRENT_MIGRATION = 20;

export function runMigrations(): void {
  const meta = readJSON<Meta>('meta.json', { migrationVersion: 0 });
  if (meta.migrationVersion >= CURRENT_MIGRATION) return;

  // v20: Ausgangspunkt, keine Datenänderung.

  meta.migrationVersion = CURRENT_MIGRATION;
  writeJSON('meta.json', meta);
  console.log(`Migrations completed (v${CURRENT_MIGRATION})`);
}
