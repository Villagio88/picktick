import { Router } from 'express';
import { readJSON, writeJSON } from '../store.js';

interface Employer {
  name: string;
  hasSoll: boolean;
  stundenlohn?: number;
  sollStundenJahr?: number;
  vollzeitStunden?: number;
  pensum?: number;
  lektionen?: number;
  lektionenVollzeit?: number;
  adresse?: string;
  ansprechpartner?: string;
  email?: string;
  telefon?: string;
  autoAbgerechnet?: boolean;
  farbe?: string;
  periodeModus?: 'schuljahr' | 'kalenderjahr';
  abrechnungsModus?: 'rechnung' | 'stundenuebersicht';
  pauschaleStundenProMonat?: number;
}

// Allowed keys for employer updates (whitelist to prevent prototype pollution)
const ALLOWED_EMPLOYER_KEYS = new Set<string>([
  'name', 'hasSoll', 'stundenlohn', 'sollStundenJahr', 'vollzeitStunden',
  'pensum', 'lektionen', 'lektionenVollzeit', 'adresse', 'ansprechpartner',
  'email', 'telefon', 'autoAbgerechnet', 'farbe', 'periodeModus', 'abrechnungsModus',
  'pauschaleStundenProMonat',
]);

/** Sanitize employer update: only allow known keys, validate types */
function sanitizeEmployerUpdate(body: unknown): Partial<Employer> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const raw = body as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_EMPLOYER_KEYS.has(key)) continue;
    // Skip __proto__, constructor, prototype (prototype pollution defense)
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = value;
  }

  // Type validations for critical fields
  if ('name' in clean && (typeof clean.name !== 'string' || (clean.name as string).trim().length === 0)) {
    return null;
  }
  if ('hasSoll' in clean && typeof clean.hasSoll !== 'boolean') return null;
  if ('stundenlohn' in clean && clean.stundenlohn !== undefined && typeof clean.stundenlohn !== 'number') return null;
  if ('autoAbgerechnet' in clean && clean.autoAbgerechnet !== undefined && typeof clean.autoAbgerechnet !== 'boolean') return null;
  if ('pauschaleStundenProMonat' in clean && clean.pauschaleStundenProMonat !== undefined
    && (typeof clean.pauschaleStundenProMonat !== 'number' || clean.pauschaleStundenProMonat < 0
      || clean.pauschaleStundenProMonat > 200)) return null;
  if ('periodeModus' in clean && clean.periodeModus !== undefined
    && clean.periodeModus !== 'schuljahr' && clean.periodeModus !== 'kalenderjahr') return null;

  // Truncate string fields
  for (const key of ['name', 'adresse', 'ansprechpartner', 'email', 'telefon', 'farbe']) {
    if (typeof clean[key] === 'string') {
      clean[key] = (clean[key] as string).slice(0, 500);
    }
  }

  return clean as Partial<Employer>;
}

const router = Router();

router.get('/', (_req, res) => {
  try {
    const employers = readJSON<Employer[]>('employers.json', []);
    res.json(employers);
  } catch (err) {
    console.error('[employers] GET / failed:', err);
    res.status(500).json({ error: 'Failed to read employers' });
  }
});

router.get('/:name', (req, res) => {
  try {
    const employers = readJSON<Employer[]>('employers.json', []);
    const emp = employers.find((e) => e.name === decodeURIComponent(req.params.name));
    if (!emp) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(emp);
  } catch (err) {
    console.error('[employers] GET /:name failed:', err);
    res.status(500).json({ error: 'Failed to read employer' });
  }
});

router.post('/', (req, res) => {
  try {
    const clean = sanitizeEmployerUpdate(req.body);
    if (!clean || !clean.name) {
      res.status(400).json({ error: 'Invalid employer data: name is required' });
      return;
    }
    const employers = readJSON<Employer[]>('employers.json', []);
    if (!employers.find((e) => e.name === clean.name)) {
      employers.push({
        name: clean.name,
        hasSoll: clean.hasSoll ?? false,
        stundenlohn: clean.stundenlohn,
        sollStundenJahr: clean.sollStundenJahr,
      });
      writeJSON('employers.json', employers);
    }
    res.json(employers);
  } catch (err) {
    console.error('[employers] POST / failed:', err);
    res.status(500).json({ error: 'Failed to create employer' });
  }
});

router.put('/:name', (req, res) => {
  try {
    const updates = sanitizeEmployerUpdate(req.body);
    if (!updates) {
      res.status(400).json({ error: 'Invalid employer update data' });
      return;
    }
    const employers = readJSON<Employer[]>('employers.json', []);
    const emp = employers.find((e) => e.name === decodeURIComponent(req.params.name));
    if (emp) {
      // Safe assign: only sanitized keys
      for (const [key, value] of Object.entries(updates)) {
        (emp as unknown as Record<string, unknown>)[key] = value;
      }
      writeJSON('employers.json', employers);
    }
    res.json(employers);
  } catch (err) {
    console.error('[employers] PUT /:name failed:', err);
    res.status(500).json({ error: 'Failed to update employer' });
  }
});

router.delete('/:name', (req, res) => {
  try {
    let employers = readJSON<Employer[]>('employers.json', []);
    employers = employers.filter((e) => e.name !== decodeURIComponent(req.params.name));
    writeJSON('employers.json', employers);
    res.json(employers);
  } catch (err) {
    console.error('[employers] DELETE /:name failed:', err);
    res.status(500).json({ error: 'Failed to delete employer' });
  }
});

export default router;
