import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import type { Express } from 'express';

// Eigene Testdatei, damit die App hier mit «hinter Proxy» geladen wird
process.env.PICKTICK_DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'picktick-proxy-'));
process.env.PICKTICK_PASSWORT = 'testpasswort-lang';
process.env.PICKTICK_API_SCHLUESSEL = 'voller-schluessel';
process.env.PICKTICK_HINTER_PROXY = '1';

let app: Express;
beforeAll(async () => {
  ({ app } = await import('../app'));
});

const eintrag = {
  id: 'p1', beschreibung: 'x', fuerWen: 'Schule', kategorie: '', leistung: '', datum: '2026-10-16',
  startZeit: '', endZeit: '', dauerMinuten: 30, abgerechnet: false, rechnungsnummer: '',
};

describe('Herkunft hinter einem Proxy', () => {
  it('akzeptiert den weitergereichten Host', async () => {
    const r = await request(app).post('/api/entries')
      .set('Authorization', 'Bearer voller-schluessel')
      .set('Host', 'picktick:3001')
      .set('X-Forwarded-Host', 'zeit.example.org')
      .set('Origin', 'https://zeit.example.org')
      .send(eintrag);
    expect(r.status).toBe(200);
  });

  it('weist eine fremde Herkunft trotzdem ab', async () => {
    const r = await request(app).post('/api/entries')
      .set('Authorization', 'Bearer voller-schluessel')
      .set('Host', 'picktick:3001')
      .set('X-Forwarded-Host', 'zeit.example.org')
      .set('Origin', 'https://boese.example')
      .send({ ...eintrag, id: 'p2' });
    expect(r.status).toBe(403);
  });
});
