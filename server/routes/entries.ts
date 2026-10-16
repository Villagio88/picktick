import { Router } from 'express';
import { sendeFehler } from '../fehler.js';
import { lokalesDatum, istGueltigesDatum, istGueltigeZeit } from '../../src/utils/datum.js';
import { readJSON, writeJSON } from '../store.js';

interface TimeEntry {
  id: string;
  beschreibung: string;
  fuerWen: string;
  kategorie: string;
  leistung: string;
  datum: string;
  startZeit: string;
  endZeit: string;
  dauerMinuten: number;
  abgerechnet: boolean;
  rechnungsnummer: string;
  bezahlt?: boolean;
  bezahltAm?: string;
  bezahltVon?: string;
  kilometer?: number;
  createdAt: string;
}

const router = Router();

// --- Validation helpers ---

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Validate a time entry has required fields with correct types */
function validateEntry(body: unknown): { valid: true; entry: TimeEntry } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (!isNonEmptyString(obj.id)) return { valid: false, error: 'id is required and must be a non-empty string' };
  if (!isString(obj.beschreibung)) return { valid: false, error: 'beschreibung must be a string' };
  if (!isNonEmptyString(obj.fuerWen)) return { valid: false, error: 'fuerWen is required' };
  if (!istGueltigesDatum(obj.datum)) return { valid: false, error: 'datum muss ein gültiges Datum JJJJ-MM-TT sein' };
  // Alteinträge ohne Uhrzeit: fehlende Zeiten gelten als leer
  if (obj.startZeit == null) obj.startZeit = '';
  if (obj.endZeit == null) obj.endZeit = '';
  if (!istGueltigeZeit(obj.startZeit)) return { valid: false, error: 'startZeit muss leer oder HH:MM sein' };
  if (!istGueltigeZeit(obj.endZeit)) return { valid: false, error: 'endZeit muss leer oder HH:MM sein' };
  if (typeof obj.dauerMinuten !== 'number' || !Number.isFinite(obj.dauerMinuten) || obj.dauerMinuten < 0 || obj.dauerMinuten > 1440) {
    return { valid: false, error: 'dauerMinuten muss zwischen 0 und 1440 liegen' };
  }
  if (obj.bezahltAm != null && obj.bezahltAm !== '' && !istGueltigesDatum(obj.bezahltAm)) {
    return { valid: false, error: 'bezahltAm muss ein gültiges Datum sein' };
  }
  if (typeof obj.abgerechnet !== 'boolean') return { valid: false, error: 'abgerechnet must be a boolean' };

  // Sanitize: only pick known fields (prevent prototype pollution / extra fields)
  const entry: TimeEntry = {
    id: obj.id as string,
    beschreibung: (obj.beschreibung as string).slice(0, 2000),
    fuerWen: (obj.fuerWen as string).slice(0, 200),
    kategorie: isString(obj.kategorie) ? (obj.kategorie as string).slice(0, 200) : '',
    leistung: isString(obj.leistung) ? (obj.leistung as string).slice(0, 500) : '',
    datum: (obj.datum as string).slice(0, 10),
    startZeit: (obj.startZeit as string).slice(0, 5),
    endZeit: (obj.endZeit as string).slice(0, 5),
    dauerMinuten: Math.round(obj.dauerMinuten as number),
    abgerechnet: obj.abgerechnet as boolean,
    rechnungsnummer: isString(obj.rechnungsnummer) ? (obj.rechnungsnummer as string).slice(0, 100) : '',
    bezahlt: typeof obj.bezahlt === 'boolean' ? obj.bezahlt : undefined,
    bezahltAm: isString(obj.bezahltAm) ? (obj.bezahltAm as string).slice(0, 10) : undefined,
    bezahltVon: isString(obj.bezahltVon) ? (obj.bezahltVon as string).slice(0, 200) : undefined,
    kilometer: typeof obj.kilometer === 'number' && obj.kilometer >= 0 ? obj.kilometer : undefined,
    createdAt: isString(obj.createdAt) ? (obj.createdAt as string).slice(0, 30) : new Date().toISOString(),
  };

  return { valid: true, entry };
}

function validateEntryArray(body: unknown): { valid: true; entries: TimeEntry[] } | { valid: false; error: string } {
  if (!Array.isArray(body)) return { valid: false, error: 'Body must be an array' };
  if (body.length > 50000) return { valid: false, error: 'Too many entries (max 50000)' };

  const entries: TimeEntry[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < body.length; i++) {
    const result = validateEntry(body[i]);
    if (!result.valid) return { valid: false, error: `Entry [${i}]: ${result.error}` };
    if (ids.has(result.entry.id)) return { valid: false, error: `Entry [${i}]: doppelte id` };
    ids.add(result.entry.id);
    entries.push(result.entry);
  }
  return { valid: true, entries };
}

// --- Routes ---

router.get('/', (_req, res) => {
  try {
    const entries = readJSON<TimeEntry[]>('entries.json', []);
    res.json(entries);
  } catch (err) {
    console.error('[entries] GET / failed:', err);
    sendeFehler(res, err, 'Failed to read entries');
  }
});

router.post('/', (req, res) => {
  try {
    const result = validateEntry(req.body);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    const entries = readJSON<TimeEntry[]>('entries.json', []);
    if (entries.some((e) => e.id === result.entry.id)) {
      res.status(409).json({ error: 'Eintrag mit dieser id existiert bereits' });
      return;
    }
    entries.unshift(result.entry);
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] POST / failed:', err);
    sendeFehler(res, err, 'Failed to save entry');
  }
});

router.put('/:id', (req, res) => {
  try {
    const result = validateEntry(req.body);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    const entries = readJSON<TimeEntry[]>('entries.json', []).map((e) =>
      e.id === req.params.id ? result.entry : e
    );
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] PUT /:id failed:', err);
    sendeFehler(res, err, 'Failed to update entry');
  }
});

router.delete('/:id', (req, res) => {
  try {
    const entries = readJSON<TimeEntry[]>('entries.json', []).filter(
      (e) => e.id !== req.params.id
    );
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] DELETE /:id failed:', err);
    sendeFehler(res, err, 'Failed to delete entry');
  }
});

// Replace all (import replace)
router.put('/', (req, res) => {
  try {
    const result = validateEntryArray(req.body);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    writeJSON('entries.json', result.entries);
    res.json(result.entries);
  } catch (err) {
    console.error('[entries] PUT / (replace all) failed:', err);
    sendeFehler(res, err, 'Failed to replace entries');
  }
});

// Merge import
router.post('/import', (req, res) => {
  try {
    const result = validateEntryArray(req.body);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    const current = readJSON<TimeEntry[]>('entries.json', []);
    const vorhanden = new Set(current.map((e) => e.id));
    // Beim Zusammenführen bestehende Einträge nicht doppelt anlegen
    const merged = [...result.entries.filter((e) => !vorhanden.has(e.id)), ...current];
    writeJSON('entries.json', merged);
    res.json(merged);
  } catch (err) {
    console.error('[entries] POST /import failed:', err);
    sendeFehler(res, err, 'Failed to import entries');
  }
});

// Mark as abgerechnet
router.post('/mark-abgerechnet', (req, res) => {
  try {
    const { ids, rechnungsnummer } = req.body as { ids: unknown; rechnungsnummer: unknown };
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'ids must be an array of strings' });
      return;
    }
    if (typeof rechnungsnummer !== 'string') {
      res.status(400).json({ error: 'rechnungsnummer must be a string' });
      return;
    }
    const idSet = new Set(ids as string[]);
    const heute = lokalesDatum();
    const entries = readJSON<TimeEntry[]>('entries.json', []).map((e) =>
      idSet.has(e.id)
        ? {
            ...e,
            abgerechnet: true,
            rechnungsnummer: (rechnungsnummer as string).slice(0, 100),
            // abgerechnet impliziert bezahlt
            bezahlt: true,
            bezahltVon: e.bezahltVon || e.fuerWen,
            bezahltAm: e.bezahltAm || heute,
          }
        : e
    );
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] POST /mark-abgerechnet failed:', err);
    sendeFehler(res, err, 'Failed to mark entries');
  }
});

// Mark as bezahlt
router.post('/mark-bezahlt', (req, res) => {
  try {
    const { rechnungsnummer, bezahltVon, bezahltAm, fuerWen } = req.body as Record<string, unknown>;
    if (typeof rechnungsnummer !== 'string' || typeof bezahltVon !== 'string' || !istGueltigesDatum(bezahltAm)) {
      res.status(400).json({ error: 'rechnungsnummer, bezahltVon und ein gültiges bezahltAm sind nötig' });
      return;
    }
    // Rechnungsnummern beginnen je Auftraggeber bei 001, deshalb immer mit Auftraggeber filtern
    const auftraggeber = typeof fuerWen === 'string' && fuerWen ? fuerWen : bezahltVon;
    const entries = readJSON<TimeEntry[]>('entries.json', []).map((e) =>
      e.rechnungsnummer === rechnungsnummer && e.fuerWen === auftraggeber
        ? { ...e, bezahlt: true, bezahltVon: bezahltVon.slice(0, 200), bezahltAm: bezahltAm.slice(0, 10) }
        : e
    );
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] POST /mark-bezahlt failed:', err);
    sendeFehler(res, err, 'Failed to mark as paid');
  }
});

// Unmark bezahlt
router.post('/unmark-bezahlt', (req, res) => {
  try {
    const { rechnungsnummer, fuerWen } = req.body as Record<string, unknown>;
    if (typeof rechnungsnummer !== 'string' || typeof fuerWen !== 'string' || !fuerWen) {
      res.status(400).json({ error: 'rechnungsnummer und fuerWen sind nötig' });
      return;
    }
    const entries = readJSON<TimeEntry[]>('entries.json', []).map((e) =>
      e.rechnungsnummer === rechnungsnummer && e.fuerWen === fuerWen
        ? { ...e, bezahlt: false, bezahltVon: undefined, bezahltAm: undefined }
        : e
    );
    writeJSON('entries.json', entries);
    res.json(entries);
  } catch (err) {
    console.error('[entries] POST /unmark-bezahlt failed:', err);
    sendeFehler(res, err, 'Failed to unmark payment');
  }
});

export default router;
