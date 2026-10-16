import fs from 'fs';
import path from 'path';
import { lokalesDatum } from '../src/utils/datum.js';

// Datenordner; im Container über PICKTICK_DATEN oder das gemountete server/data
export const DATA_DIR = process.env.PICKTICK_DATEN || path.resolve(import.meta.dirname, '..', 'daten');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Sanitize filename to prevent path traversal attacks.
 * Only allows alphanumeric, hyphens, underscores, dots, and pipes.
 * Strips any directory components.
 */
function sanitizeFilename(filename: string): string {
  // Take only the basename (strip directory components)
  const base = path.basename(filename);
  // Only allow safe characters
  if (!/^[\w\-.]+$/.test(base)) {
    throw new Error(`Invalid filename: ${filename}`);
  }
  return base;
}

/** Fehler, wenn eine vorhandene Datendatei nicht lesbar ist. Schreiben bleibt dann gesperrt. */
export class DatenFehler extends Error {}

/**
 * Liest eine JSON-Datei. Fehlt sie, gilt der Ersatzwert (frische Installation).
 * Ist sie vorhanden, aber beschädigt, wird die Vorversion aus backups/ zurückgeholt
 * und laut geloggt; ist auch die nicht lesbar, wirft die Funktion einen DatenFehler,
 * damit nie eine leere Liste über echte Daten geschrieben wird.
 */
export function readJSON<T>(filename: string, fallback: T): T {
  const safeFilename = sanitizeFilename(filename);
  const filepath = path.join(DATA_DIR, safeFilename);
  if (!fs.existsSync(filepath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8')) as T;
  } catch (err) {
    const backupPath = path.join(BACKUP_DIR, safeFilename);
    try {
      const backupRaw = fs.readFileSync(backupPath, 'utf-8');
      const data = JSON.parse(backupRaw) as T;
      // Beschädigte Datei aufheben, Vorversion zurückschreiben
      fs.copyFileSync(filepath, `${filepath}.beschaedigt-${Date.now()}`);
      fs.writeFileSync(filepath, backupRaw, 'utf-8');
      console.error(`[store] ${safeFilename} war beschädigt und wurde aus der Vorversion wiederhergestellt. Der letzte Schreibvorgang kann fehlen. Die beschädigte Datei liegt daneben.`);
      return data;
    } catch {
      console.error(`[store] ${safeFilename} ist beschädigt und ohne lesbare Vorversion:`, err);
      throw new DatenFehler(`${safeFilename} ist nicht lesbar. Bitte aus einer Sicherung wiederherstellen.`);
    }
  }
}

/**
 * Atomic write: serialize -> write to temp file -> rename over target.
 * fs.renameSync is atomic on the same filesystem (POSIX guarantee).
 * Also maintains a rolling backup of the previous version.
 */
export function writeJSON(filename: string, data: unknown): void {
  const safeFilename = sanitizeFilename(filename);
  const filepath = path.join(DATA_DIR, safeFilename);

  // Serialize first -- if this throws, no file is touched
  const json = JSON.stringify(data, null, 2);

  // Validate that what we serialized can be parsed back (catch circular refs, etc.)
  JSON.parse(json);

  // Write to a temp file in the same directory (same filesystem = atomic rename)
  const tmpPath = filepath + `.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tmpPath, json, 'utf-8');
    // Before replacing, back up the current file
    if (fs.existsSync(filepath)) {
      const backupPath = path.join(BACKUP_DIR, safeFilename);
      try {
        fs.copyFileSync(filepath, backupPath);
      } catch (backupErr) {
        console.warn(`[store] Failed to create backup for ${safeFilename}:`, backupErr);
      }
    }
    // Atomic rename
    fs.renameSync(tmpPath, filepath);
  } catch (err) {
    // Clean up temp file if rename failed
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch { /* ignore cleanup errors */ }
    throw err;
  }
}

/**
 * Create a timestamped snapshot of all data files.
 * Called periodically or on server start.
 */
export function createDailyBackup(): void {
  const today = lokalesDatum(); // JJJJ-MM-TT, lokal
  const snapshotDir = path.join(BACKUP_DIR, `snapshot-${today}`);

  // Only one snapshot per day
  if (fs.existsSync(snapshotDir)) return;

  fs.mkdirSync(snapshotDir, { recursive: true });

  const dataFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of dataFiles) {
    try {
      fs.copyFileSync(path.join(DATA_DIR, file), path.join(snapshotDir, file));
    } catch (err) {
      console.warn(`[backup] Failed to snapshot ${file}:`, err);
    }
  }

  // Clean up snapshots older than 30 days
  try {
    const snapshots = fs.readdirSync(BACKUP_DIR)
      .filter(d => d.startsWith('snapshot-'))
      .sort();
    const cutoff = 30;
    if (snapshots.length > cutoff) {
      for (const old of snapshots.slice(0, snapshots.length - cutoff)) {
        const oldPath = path.join(BACKUP_DIR, old);
        fs.rmSync(oldPath, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn('[backup] Failed to clean old snapshots:', err);
  }

  console.log(`[backup] Daily snapshot created: snapshot-${today}`);
}
