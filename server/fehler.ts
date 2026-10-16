import type { Response } from 'express';
import { DatenFehler } from './store.js';

/** Antwort bei Fehlern: beschädigte Daten mit 503 und klarer Meldung, sonst 500. */
export function sendeFehler(res: Response, err: unknown, text: string): void {
  if (err instanceof DatenFehler) {
    res.status(503).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: text });
}
