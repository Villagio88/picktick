import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { exportCsv, zeilenZuEintraegen } from '../csv';
import type { TimeEntry } from '../../types';

function e(over: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'x', beschreibung: 'Drucker eingerichtet', fuerWen: 'Schule', kategorie: 'technischer Support',
    leistung: 'Drucker', datum: '2026-09-14', startZeit: '08:00', endZeit: '09:30', dauerMinuten: 90,
    abgerechnet: true, rechnungsnummer: '2026-001', createdAt: '', ...over,
  };
}

function hinUndZurueck(eintraege: TimeEntry[]): TimeEntry[] {
  const csv = exportCsv(eintraege);
  return zeilenZuEintraegen(Papa.parse(csv, { header: true, skipEmptyLines: true }).data as never);
}

describe('CSV Export und Import', () => {
  it('überträgt Datum, Zeiten, Dauer, Rolle und Abrechnung', () => {
    const [r] = hinUndZurueck([e({})]);
    expect(r).toMatchObject({
      beschreibung: 'Drucker eingerichtet', fuerWen: 'Schule', kategorie: 'technischer Support', leistung: 'Drucker',
      datum: '2026-09-14', startZeit: '08:00', endZeit: '09:30', dauerMinuten: 90, abgerechnet: true, rechnungsnummer: '2026-001',
    });
  });

  it('behält Datum und Dauer bei Einträgen ohne Uhrzeit', () => {
    const [r] = hinUndZurueck([e({ startZeit: '', endZeit: '', dauerMinuten: 45 })]);
    expect(r.datum).toBe('2026-09-14');
    expect(r.startZeit).toBe('');
    expect(r.dauerMinuten).toBe(45);
  });
});
