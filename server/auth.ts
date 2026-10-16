import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { DATA_DIR } from './store.js';

/**
 * Anmeldung für PickTick.
 *
 * - PICKTICK_PASSWORT: Passwort der Instanz. Ist es nicht gesetzt, läuft PickTick ohne
 *   Anmeldung (nur für den Betrieb im eigenen, geschützten Netz gedacht).
 * - PICKTICK_API_SCHLUESSEL: optional, voller Zugriff für Skripte. Wird als
 *   «Authorization: Bearer <schlüssel>» mitgeschickt.
 * - PICKTICK_ERFASSEN_SCHLUESSEL: optional, nur Lesen und neue Einträge anlegen, für
 *   Kurzbefehle auf dem Handy. Ein verlorenes Handy kann so nichts löschen oder ändern.
 * - PICKTICK_ORIGIN: optional, zusätzliche erlaubte Herkunft(en) für schreibende Anfragen,
 *   mit Komma getrennt, zum Beispiel https://zeit.meine-domain.ch
 *
 * Die Sitzung ist ein signiertes Cookie (HMAC-SHA256) mit Ablaufdatum; das Geheimnis
 * dafür liegt im Datenordner und wird beim ersten Start erzeugt.
 */

const COOKIE = 'picktick_sitzung';
const DAUER_MS = 14 * 24 * 60 * 60 * 1000;
const MINDESTLAENGE = 12;

const GEHEIMNIS_DATEI = path.join(DATA_DIR, '.sitzung-geheimnis');

const passwort = process.env.PICKTICK_PASSWORT || '';
const apiSchluessel = process.env.PICKTICK_API_SCHLUESSEL || '';
const erfassenSchluessel = process.env.PICKTICK_ERFASSEN_SCHLUESSEL || '';
const erlaubteHerkunft = (process.env.PICKTICK_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

export const anmeldungNoetig = passwort.length > 0;

if (anmeldungNoetig && passwort.length < MINDESTLAENGE) {
  console.error(`[auth] PICKTICK_PASSWORT ist kürzer als ${MINDESTLAENGE} Zeichen. Bitte ein längeres Passwort setzen.`);
  process.exit(1);
}

function ladeGeheimnis(): Buffer {
  try {
    if (fs.existsSync(GEHEIMNIS_DATEI)) {
      const hex = fs.readFileSync(GEHEIMNIS_DATEI, 'utf-8').trim();
      if (/^[0-9a-f]{64}$/.test(hex)) return Buffer.from(hex, 'hex');
    }
  } catch { /* neu erzeugen */ }
  const neu = crypto.randomBytes(32);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(GEHEIMNIS_DATEI, neu.toString('hex'), { mode: 0o600 });
  return neu;
}

const geheimnis = ladeGeheimnis();

// Schlüssel aus Geheimnis und Passwort: ein neues Passwort beendet alle bestehenden Sitzungen.
const signaturSchluessel = crypto.createHmac('sha256', geheimnis).update(`passwort:${passwort}`).digest();

function signiere(wert: string): string {
  return crypto.createHmac('sha256', signaturSchluessel).update(wert).digest('hex');
}

/** Vergleich in konstanter Zeit, auch bei unterschiedlicher Länge. */
export function gleich(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

// Sitzungsgeneration: «Abmelden» erhöht sie und beendet damit alle bestehenden Sitzungen.
const GENERATION_DATEI = path.join(DATA_DIR, '.sitzung-generation');

function generation(): number {
  try {
    const n = Number(fs.readFileSync(GENERATION_DATEI, 'utf-8').trim());
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function naechsteGeneration(): void {
  fs.writeFileSync(GENERATION_DATEI, String(generation() + 1), { mode: 0o600 });
}

export function erzeugeSitzung(jetzt = Date.now()): string {
  const kopf = `${jetzt + DAUER_MS}.${generation()}`;
  return `${kopf}.${signiere(kopf)}`;
}

export function pruefeSitzung(wert: string | undefined, jetzt = Date.now()): boolean {
  if (!wert) return false;
  const [ablauf, gen, sig] = wert.split('.');
  if (!ablauf || !gen || !sig || !/^\d+$/.test(ablauf) || !/^\d+$/.test(gen)) return false;
  if (!gleich(sig, signiere(`${ablauf}.${gen}`))) return false;
  return Number(ablauf) > jetzt && Number(gen) === generation();
}

function leseCookie(req: Request, name: string): string | undefined {
  const kopf = req.headers.cookie;
  if (!kopf) return undefined;
  for (const teil of kopf.split(';')) {
    const [k, ...v] = teil.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/**
 * Schutz gegen Anfragen aus fremden Seiten (CSRF): Schreibende Anfragen mit Origin-Kopf
 * müssen vom eigenen Host kommen. Ergänzt SameSite=Strict für mehrere Dienste unter einer Domain.
 */
export function pruefeHerkunft(req: Request, res: Response, next: NextFunction): void {
  const herkunft = req.headers.origin;
  if (req.method === 'GET' || req.method === 'HEAD' || !herkunft) return next();
  try {
    const url = new URL(herkunft);
    // Hinter einem Proxy (trust proxy) zählt auch der weitergereichte Host X-Forwarded-Host
    const eigeneHosts = [req.headers.host, req.app.get('trust proxy') ? req.get('x-forwarded-host') : undefined];
    if (eigeneHosts.includes(url.host) || erlaubteHerkunft.includes(url.origin)) return next();
  } catch { /* ungültiger Origin */ }
  console.warn(`[auth] Schreibende Anfrage aus fremder Herkunft abgewiesen: ${herkunft}. Falls das deine eigene Adresse ist: PICKTICK_ORIGIN setzen.`);
  res.status(403).json({ error: 'Fremde Herkunft. Falls PickTick hinter einem Proxy läuft: PICKTICK_ORIGIN setzen.' });
}

/** Was der eingeschränkte Erfassen-Schlüssel darf: lesen und neue Einträge anlegen. */
function erfassenErlaubt(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return !req.path.toLowerCase().startsWith('/sicherung');
  return req.method === 'POST' && req.path.toLowerCase() === '/entries';
}

function istAngemeldet(req: Request): boolean {
  if (!anmeldungNoetig) return true;
  const kopf = req.headers.authorization;
  if (kopf?.startsWith('Bearer ')) {
    const schluessel = kopf.slice(7);
    if (apiSchluessel && gleich(schluessel, apiSchluessel)) return true;
    if (erfassenSchluessel && gleich(schluessel, erfassenSchluessel)) return erfassenErlaubt(req);
  }
  return pruefeSitzung(leseCookie(req, COOKIE));
}

function setzeCookie(req: Request, res: Response, wert: string, maxAgeSek: number): void {
  const sicher = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(wert)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSek}${sicher ? '; Secure' : ''}`);
}

/**
 * Schützt alle API-Routen ausser der Anmeldung selbst. Wird mit app.use('/api', …)
 * eingehängt; Express vergleicht Pfade ohne Gross- und Kleinschreibung, deshalb greift
 * der Schutz auch für /API/… und der Vergleich unten ist ebenfalls unabhängig davon.
 */
export function schuetzeApi(req: Request, res: Response, next: NextFunction): void {
  if (req.path.toLowerCase().startsWith('/auth/')) return next();
  if (istAngemeldet(req)) return next();
  res.status(401).json({ error: 'Nicht angemeldet' });
}

// Einfache Bremse gegen Durchprobieren: höchstens 10 Fehlversuche je Adresse in 15 Minuten.
const fehlversuche = new Map<string, { anzahl: number; seit: number }>();
const FENSTER_MS = 15 * 60 * 1000;

const router = Router();

router.get('/status', (req, res) => {
  res.json({ anmeldungNoetig, angemeldet: istAngemeldet(req) });
});

router.post('/login', (req, res) => {
  if (!anmeldungNoetig) {
    res.json({ angemeldet: true });
    return;
  }
  const ip = req.ip || 'unbekannt';
  const jetzt = Date.now();
  // Abgelaufene Einträge entfernen, damit die Liste nicht unbegrenzt wächst
  if (fehlversuche.size > 1000) {
    for (const [k, v] of fehlversuche) if (jetzt - v.seit >= FENSTER_MS) fehlversuche.delete(k);
  }
  const f = fehlversuche.get(ip);
  if (f && jetzt - f.seit < FENSTER_MS && f.anzahl >= 10) {
    res.status(429).json({ error: 'Zu viele Versuche, bitte später nochmals' });
    return;
  }
  const eingabe = (req.body as { passwort?: unknown })?.passwort;
  if (typeof eingabe !== 'string' || !gleich(eingabe, passwort)) {
    console.warn(`[auth] Fehlgeschlagene Anmeldung von ${ip}`);
    const neu = !f || jetzt - f.seit >= FENSTER_MS ? { anzahl: 1, seit: jetzt } : { ...f, anzahl: f.anzahl + 1 };
    fehlversuche.set(ip, neu);
    res.status(401).json({ error: 'Passwort falsch' });
    return;
  }
  fehlversuche.delete(ip);
  console.log(`[auth] Anmeldung von ${ip}`);
  setzeCookie(req, res, erzeugeSitzung(jetzt), DAUER_MS / 1000);
  res.json({ angemeldet: true });
});

router.post('/logout', (req, res) => {
  // Nur eine angemeldete Sitzung darf alle Sitzungen beenden
  if (anmeldungNoetig && pruefeSitzung(leseCookie(req, COOKIE))) naechsteGeneration();
  setzeCookie(req, res, '', 0);
  res.json({ angemeldet: false });
});

export default router;
