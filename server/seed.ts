import { readJSON, writeJSON } from './store.js';
import { SEED_DATA } from '../src/data/seed.js';

interface Meta {
  migrationVersion: number;
  seeded?: boolean;
}

export function seedIfNeeded(): void {
  const meta = readJSON<Meta>('meta.json', { migrationVersion: 0 });
  if (meta.seeded) return;

  const entries = readJSON<unknown[]>('entries.json', []);
  if (entries.length === 0) {
    writeJSON('entries.json', SEED_DATA);
    console.log(`Seeded ${SEED_DATA.length} entries`);
  }

  meta.seeded = true;
  writeJSON('meta.json', meta);
}
