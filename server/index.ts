import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations.js';
import { seedIfNeeded } from './seed.js';
import { createDailyBackup } from './store.js';
import entriesRouter from './routes/entries.js';
import employersRouter from './routes/employers.js';
import pensumRouter from './routes/pensum.js';
import invoiceRouter from './routes/invoice.js';
import settingsRouter from './routes/settings.js';
import authRouter, { schuetzeApi, anmeldungNoetig } from './auth.js';

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.resolve(import.meta.dirname, '..', 'dist');
const SERVE_FRONTEND = fs.existsSync(path.join(DIST_DIR, 'index.html'));

// --- Security headers ---
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Hinter einem Reverse Proxy (Caddy, Traefik, nginx) die echte Adresse und HTTPS erkennen.
if (process.env.PICKTICK_HINTER_PROXY === '1') app.set('trust proxy', 1);

// --- Body parser with reasonable limit ---
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

// --- Startup: seed, migrate, backup ---
seedIfNeeded();
runMigrations();
createDailyBackup();

// --- Daily backup interval (every 6 hours) ---
setInterval(() => {
  try { createDailyBackup(); } catch (err) { console.error('[backup] Interval failed:', err); }
}, 6 * 60 * 60 * 1000);

// --- Anmeldung ---
app.use('/api/auth', authRouter);
app.use('/api', schuetzeApi);
if (!anmeldungNoetig) {
  console.warn('[auth] PICKTICK_PASSWORT ist nicht gesetzt: PickTick läuft ohne Anmeldung. Nur im geschützten eigenen Netz so betreiben.');
}

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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}${SERVE_FRONTEND ? ' (with frontend)' : ' (API only)'}`);
});
