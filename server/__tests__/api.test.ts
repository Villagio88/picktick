import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import type { Express } from 'express';

// Umgebung vor dem Laden der App setzen: eigener Datenordner, Passwort, Schlüssel
const daten = fs.mkdtempSync(path.join(os.tmpdir(), 'picktick-test-'));
process.env.PICKTICK_DATEN = daten;
process.env.PICKTICK_PASSWORT = 'testpasswort-lang';
process.env.PICKTICK_API_SCHLUESSEL = 'voller-schluessel';
process.env.PICKTICK_ERFASSEN_SCHLUESSEL = 'erfassen-schluessel';
process.env.PICKTICK_ORIGIN = 'https://zeit.example.org';

let app: Express;
const voll = { Authorization: 'Bearer voller-schluessel' };
const erfassen = { Authorization: 'Bearer erfassen-schluessel' };

function eintrag(over: Record<string, unknown> = {}) {
  return {
    id: 'e1', beschreibung: 'Drucker eingerichtet', fuerWen: 'Schule', kategorie: 'technischer Support',
    leistung: 'Drucker', datum: '2026-10-16', startZeit: '08:00', endZeit: '09:00', dauerMinuten: 60,
    abgerechnet: false, rechnungsnummer: '', ...over,
  };
}

beforeAll(async () => {
  ({ app } = await import('../app'));
});

describe('Anmeldung', () => {
  it('schützt die API in jeder Schreibweise', async () => {
    for (const pfad of ['/api/entries', '/API/entries', '/Api/Employers', '/api/settings']) {
      expect((await request(app).get(pfad)).status).toBe(401);
    }
    expect((await request(app).put('/API/entries').send([])).status).toBe(401);
  });

  it('meldet mit falschem Passwort ab und mit richtigem an', async () => {
    expect((await request(app).post('/api/auth/login').send({ passwort: 'falsch' })).status).toBe(401);
    const ok = await request(app).post('/api/auth/login').send({ passwort: 'testpasswort-lang' });
    expect(ok.status).toBe(200);
    const cookie = ok.headers['set-cookie'];
    expect(String(cookie)).toMatch(/HttpOnly; SameSite=Strict/);
    expect((await request(app).get('/api/entries').set('Cookie', cookie)).status).toBe(200);
  });

  it('beendet mit Abmelden alle Sitzungen', async () => {
    const a = (await request(app).post('/api/auth/login').send({ passwort: 'testpasswort-lang' })).headers['set-cookie'];
    const b = (await request(app).post('/api/auth/login').send({ passwort: 'testpasswort-lang' })).headers['set-cookie'];
    expect((await request(app).post('/api/auth/logout').set('Cookie', a)).status).toBe(200);
    expect((await request(app).get('/api/entries').set('Cookie', b)).status).toBe(401);
  });

  it('erlaubt dem Erfassen-Schlüssel nur Lesen und neue Einträge', async () => {
    expect((await request(app).get('/api/entries').set(erfassen)).status).toBe(200);
    expect((await request(app).post('/api/entries').set(erfassen).send(eintrag({ id: 'k1' }))).status).toBe(200);
    expect((await request(app).put('/api/entries').set(erfassen).send([])).status).toBe(401);
    expect((await request(app).put('/api/entries/k1').set(erfassen).send(eintrag({ id: 'k1' }))).status).toBe(401);
    expect((await request(app).put('/api/settings').set(erfassen).send({})).status).toBe(401);
    expect((await request(app).get('/api/sicherung').set(erfassen)).status).toBe(401);
  });
});

describe('Herkunft', () => {
  it('weist schreibende Anfragen aus fremden Seiten ab', async () => {
    const r = await request(app).post('/api/entries').set(voll).set('Origin', 'https://boese.example').send(eintrag({ id: 'o1' }));
    expect(r.status).toBe(403);
  });
  it('lässt die eigene und die konfigurierte Adresse zu', async () => {
    const eigen = await request(app).post('/api/entries').set(voll).set('Host', 'zeit.local').set('Origin', 'http://zeit.local').send(eintrag({ id: 'o2' }));
    expect(eigen.status).toBe(200);
    const konfiguriert = await request(app).post('/api/entries').set(voll).set('Origin', 'https://zeit.example.org').send(eintrag({ id: 'o3' }));
    expect(konfiguriert.status).toBe(200);
  });
});

describe('Einträge', () => {
  it('prüft Datum, Zeit, Dauer, Rolle und doppelte IDs', async () => {
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v1' }))).status).toBe(200);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v1' }))).status).toBe(409);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v2', datum: '2026-02-31' }))).status).toBe(400);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v3', startZeit: '25:00' }))).status).toBe(400);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v4', dauerMinuten: 99999 }))).status).toBe(400);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'v5', kategorie: 'irgendwas' }))).status).toBe(400);
  });

  it('ändert nur bestehende Einträge mit passender ID', async () => {
    expect((await request(app).put('/api/entries/v1').set(voll).send(eintrag({ id: 'anders' }))).status).toBe(400);
    expect((await request(app).put('/api/entries/gibtsnicht').set(voll).send(eintrag({ id: 'gibtsnicht' }))).status).toBe(404);
    expect((await request(app).put('/api/entries/v1').set(voll).send(eintrag({ id: 'v1', dauerMinuten: 45 }))).status).toBe(200);
  });
});

describe('Rechnungen', () => {
  it('lässt eine Rechnung offen und markiert die Zahlung nur beim eigenen Auftraggeber', async () => {
    await request(app).post('/api/employers').set(voll).send({ name: 'Auftrag A', hasSoll: false });
    await request(app).post('/api/employers').set(voll).send({ name: 'Auftrag B', hasSoll: false });
    await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'ra', fuerWen: 'Auftrag A' }));
    await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'rb', fuerWen: 'Auftrag B' }));
    await request(app).post('/api/entries/mark-abgerechnet').set(voll).send({ ids: ['ra'], rechnungsnummer: '2026-001' });
    await request(app).post('/api/entries/mark-abgerechnet').set(voll).send({ ids: ['rb'], rechnungsnummer: '2026-001' });
    let alle = (await request(app).get('/api/entries').set(voll)).body as { id: string; bezahlt?: boolean }[];
    expect(alle.find((e) => e.id === 'ra')?.bezahlt).toBeFalsy();
    await request(app).post('/api/entries/mark-bezahlt').set(voll).send({ rechnungsnummer: '2026-001', bezahltVon: 'Auftrag A', bezahltAm: '2026-10-20' });
    alle = (await request(app).get('/api/entries').set(voll)).body;
    expect(alle.find((e) => e.id === 'ra')?.bezahlt).toBe(true);
    expect(alle.find((e) => e.id === 'rb')?.bezahlt).toBeFalsy();
  });

  it('kommt mit Prozentzeichen im Arbeitgebernamen zurecht', async () => {
    await request(app).post('/api/employers').set(voll).send({ name: 'Schule 50% Pensum', hasSoll: false });
    const r = await request(app).put(`/api/employers/${encodeURIComponent('Schule 50% Pensum')}`).set(voll).send({ farbe: '#123456' });
    expect(r.status).toBe(200);
  });
});

describe('Beschädigte Daten', () => {
  it('liefert 503 statt leerer Daten und überschreibt nichts', async () => {
    fs.writeFileSync(path.join(daten, 'entries.json'), '{kaputt');
    fs.writeFileSync(path.join(daten, 'backups', 'entries.json'), '{auch kaputt');
    expect((await request(app).get('/api/entries').set(voll)).status).toBe(503);
    expect((await request(app).post('/api/entries').set(voll).send(eintrag({ id: 'x9' }))).status).toBe(503);
    expect(fs.readFileSync(path.join(daten, 'entries.json'), 'utf-8')).toBe('{kaputt');
    expect((await request(app).get('/api/gesund')).status).toBe(503);
    const sicherung = await request(app).get('/api/sicherung').set(voll);
    expect(sicherung.status).toBe(200);
    expect(sicherung.body.unlesbar).toEqual(['entries.json']);
    expect(sicherung.body['entries.json.roh']).toBe('{kaputt');
  });
});
