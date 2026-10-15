import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

/**
 * Anmeldung für PickTick.
 *
 * - PICKTICK_PASSWORT: Passwort der Instanz. Ist es nicht gesetzt, läuft PickTick ohne
 *   Anmeldung (nur für den Betrieb im eigenen, geschützten Netz gedacht).
 * - PICKTICK_API_SCHLUESSEL: optional, für Skripte und Kurzbefehle. Wird als
 *   «Authorization: Bearer <schlüssel>» mitgeschickt.
 *
 * Die Sitzung ist ein signiertes Cookie (HMAC-SHA256) mit Ablaufdatum; das Geheimnis
 * dafür liegt im Datenordner und wird beim ersten Start erzeugt.
 */

const COOKIE = 'picktick_sitzung';
const DAUER_MS = 30 * 24 * 60 * 60 * 1000;
// Datenordner; im Container über PICKTICK_DATEN oder das gemountete server/data
const DATA_DIR = process.env.PICKTICK_DATEN || path.join(import.meta.dirname, 'data');
const GEHEIMNIS_DATEI = path.join(DATA_DIR, '.sitzung-geheimnis');

const passwort = process.env.PICKTICK_PASSWORT || '';
const apiSchluessel = process.env.PICKTICK_API_SCHLUESSEL || '';

export const anmeldungNoetig = passwort.length > 0;

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

export function erzeugeSitzung(jetzt = Date.now()): string {
  const ablauf = String(jetzt + DAUER_MS);
  return `${ablauf}.${signiere(ablauf)}`;
}

export function pruefeSitzung(wert: string | undefined, jetzt = Date.now()): boolean {
  if (!wert) return false;
  const [ablauf, sig] = wert.split('.');
  if (!ablauf || !sig || !/^\d+$/.test(ablauf)) return false;
  if (!gleich(sig, signiere(ablauf))) return false;
  return Number(ablauf) > jetzt;
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

function istAngemeldet(req: Request): boolean {
  if (!anmeldungNoetig) return true;
  const kopf = req.headers.authorization;
  if (apiSchluessel && kopf?.startsWith('Bearer ') && gleich(kopf.slice(7), apiSchluessel)) return true;
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
    const neu = !f || jetzt - f.seit >= FENSTER_MS ? { anzahl: 1, seit: jetzt } : { ...f, anzahl: f.anzahl + 1 };
    fehlversuche.set(ip, neu);
    res.status(401).json({ error: 'Passwort falsch' });
    return;
  }
  fehlversuche.delete(ip);
  setzeCookie(req, res, erzeugeSitzung(jetzt), DAUER_MS / 1000);
  res.json({ angemeldet: true });
});

router.post('/logout', (req, res) => {
  setzeCookie(req, res, '', 0);
  res.json({ angemeldet: false });
});

export default router;
