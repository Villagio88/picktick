import { Router } from 'express';
import { sendeFehler } from '../fehler.js';
import { readJSON, writeJSON } from '../store.js';
import { STANDARD_EINSTELLUNGEN } from '../../src/data/standard.js';
import type { Einstellungen, Leistung } from '../../src/types/index.js';

const ROLLEN = new Set(['', 'technischer Support', 'pädagogischer Support', 'beides']);

function text(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Liest die Einstellungen und ergänzt fehlende Teile aus den Standardwerten. */
export function leseEinstellungen(): Einstellungen {
  const roh = readJSON<Partial<Einstellungen>>('settings.json', {});
  return {
    absender: { ...STANDARD_EINSTELLUNGEN.absender, ...(roh.absender ?? {}) },
    bank: { ...STANDARD_EINSTELLUNGEN.bank, ...(roh.bank ?? {}) },
    leistungen: Array.isArray(roh.leistungen) ? roh.leistungen : STANDARD_EINSTELLUNGEN.leistungen,
  };
}

/** Prüft eingehende Einstellungen; unbekannte Felder fallen weg. */
export function pruefeEinstellungen(body: unknown): Einstellungen | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const a = (b.absender ?? {}) as Record<string, unknown>;
  const k = (b.bank ?? {}) as Record<string, unknown>;
  if (!Array.isArray(b.leistungen) || b.leistungen.length > 200) return null;
  const leistungen: Leistung[] = [];
  const namen = new Set<string>();
  for (const l of b.leistungen as unknown[]) {
    if (!l || typeof l !== 'object') return null;
    const name = text((l as Record<string, unknown>).name, 80);
    const rolle = (l as Record<string, unknown>).rolle ?? '';
    if (!name || name.includes(',') || !ROLLEN.has(rolle as string) || namen.has(name)) return null;
    namen.add(name);
    leistungen.push({ name, rolle: rolle as Leistung['rolle'] });
  }
  return {
    absender: {
      name: text(a.name), strasse: text(a.strasse), ort: text(a.ort),
      telefon: text(a.telefon, 50), email: text(a.email),
    },
    bank: { name: text(k.name), iban: text(k.iban, 50), inhaber: text(k.inhaber) },
    leistungen,
  };
}

const router = Router();

router.get('/', (_req, res) => {
  try {
    res.json(leseEinstellungen());
  } catch (err) {
    console.error('[settings] GET / failed:', err);
    sendeFehler(res, err, 'Failed to read settings');
  }
});

router.put('/', (req, res) => {
  try {
    const neu = pruefeEinstellungen(req.body);
    if (!neu) {
      res.status(400).json({ error: 'Ungültige Einstellungen' });
      return;
    }
    writeJSON('settings.json', neu);
    res.json(neu);
  } catch (err) {
    console.error('[settings] PUT / failed:', err);
    sendeFehler(res, err, 'Failed to save settings');
  }
});

export default router;
