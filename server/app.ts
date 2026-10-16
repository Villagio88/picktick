import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import entriesRouter from './routes/entries.js';
import employersRouter from './routes/employers.js';
import pensumRouter from './routes/pensum.js';
import invoiceRouter from './routes/invoice.js';
import settingsRouter from './routes/settings.js';
import authRouter, { schuetzeApi, pruefeHerkunft } from './auth.js';
import { readJSON, DatenFehler, DATA_DIR } from './store.js';
import { leseAlleDaten } from './sicherung.js';

/**
 * Die Express-App ohne Start und ohne Hintergrundaufgaben, damit Tests sie direkt
 * ansprechen können. Gestartet wird in index.ts.
 */
export const app = express();
app.disable('x-powered-by');
const DIST_DIR = path.resolve(import.meta.dirname, '..', 'dist');
export const SERVE_FRONTEND = fs.existsSync(path.join(DIST_DIR, 'index.html'));

// --- Security headers ---
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (_req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

// Hinter einem Reverse Proxy (Caddy, Traefik, nginx) die echte Adresse und HTTPS erkennen.
if (process.env.PICKTICK_HINTER_PROXY === '1') app.set('trust proxy', 1);

// --- Body parser: klein für die Anmeldung, gross nur für Import und Ersetzen ---
app.use('/api/auth', express.json({ limit: '10kb' }));
app.use(express.json({ limit: '10mb' }));

// --- Reject non-JSON content types on POST/PUT ---
app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req.method === 'POST' || req.method === 'PUT') && req.headers['content-type']) {
    if (!req.headers['content-type'].includes('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json' });
      return;
    }
  }
  next();
});

// --- Zustand für Docker und Monitoring, ohne Anmeldung, ohne Inhalte ---
app.get('/api/gesund', (_req: Request, res: Response) => {
  try {
    // Alle Datendateien müssen lesbar sein, nicht nur die Einträge
    for (const datei of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) readJSON(datei, null);
    res.json({ ok: true });
  } catch (err) {
    res.status(err instanceof DatenFehler ? 503 : 500).json({ ok: false });
  }
});

// --- Anmeldung ---
app.use('/api', pruefeHerkunft);
app.use('/api/auth', authRouter);
app.use('/api', schuetzeApi);

// --- Gesamtsicherung aller Daten als eine JSON-Datei ---
app.get('/api/sicherung', (_req: Request, res: Response) => {
  try {
    res.setHeader('Content-Disposition', `attachment; filename="picktick-sicherung.json"`);
    res.json(leseAlleDaten());
  } catch (err) {
    res.status(err instanceof DatenFehler ? 503 : 500).json({ error: 'Sicherung fehlgeschlagen' });
  }
});

// --- Mount routes ---
app.use('/api/entries', entriesRouter);
app.use('/api/employers', employersRouter);
app.use('/api/pensum', pensumRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/settings', settingsRouter);

// --- Frontend (Production): serve built SPA from dist/ ---
if (SERVE_FRONTEND) {
  app.use(express.static(DIST_DIR));
  // SPA-Fallback für alle nicht-API GET-Requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// --- Global error handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
