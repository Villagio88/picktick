import { describe, it, expect } from 'vitest';
import { rollenSummen, rollenProMonat, anteilPicts } from '../rollenStatistik';
import { rolleVorschlag } from '../../data/rollen';
import type { TimeEntry } from '../../types';

function e(datum: string, min: number, kategorie: string): TimeEntry {
  return {
    id: `${datum}-${min}-${kategorie}`, beschreibung: 'x', fuerWen: 'Schule', kategorie, leistung: '',
    datum, startZeit: '', endZeit: '', dauerMinuten: min, abgerechnet: false, rechnungsnummer: '', createdAt: '',
  };
}

const daten = [
  e('2026-08-20', 120, 'technischer Support'),
  e('2026-08-21', 60, 'pädagogischer Support'),
  e('2026-09-01', 60, 'beides'),
  e('2026-09-02', 30, ''),
  e('2026-09-03', 15, 'unbekannt'),
];

describe('rollenSummen', () => {
  it('summiert je Rolle und zählt Unbekanntes als ohne', () => {
    expect(rollenSummen(daten)).toEqual([
      { schluessel: 'technischer Support', minuten: 120 },
      { schluessel: 'pädagogischer Support', minuten: 60 },
      { schluessel: 'beides', minuten: 60 },
      { schluessel: 'ohne', minuten: 45 },
    ]);
  });
});

describe('rollenProMonat', () => {
  it('gruppiert nach Monat in zeitlicher Reihenfolge', () => {
    const r = rollenProMonat([...daten].reverse());
    expect(r.map((m) => m.monat)).toEqual(['2026-08', '2026-09']);
    expect(r[0].total).toBe(180);
    expect(r[1].minuten.beides).toBe(60);
    expect(r[1].minuten.ohne).toBe(45);
  });
});

describe('anteilPicts', () => {
  it('zählt beides zur Hälfte und ignoriert Einträge ohne Rolle', () => {
    // PICTS 60 + 30 von 240 mit Rolle = 37.5 -> 38
    expect(anteilPicts(rollenSummen(daten))).toBe(38);
  });
  it('liefert null ohne Einträge mit Rolle', () => {
    expect(anteilPicts(rollenSummen([e('2026-09-02', 30, '')]))).toBeNull();
  });
});

describe('rolleVorschlag', () => {
  const liste = [
    { name: 'Drucker', rolle: 'technischer Support' as const },
    { name: 'Weiterbildung', rolle: 'pädagogischer Support' as const },
    { name: 'Sitzung', rolle: '' as const },
  ];
  it('schlägt TICTS vor, wenn nur technische Leistungen gewählt sind', () => {
    expect(rolleVorschlag(['Drucker', 'Sitzung'], liste)).toBe('technischer Support');
  });
  it('schlägt beides vor, wenn technische und pädagogische gemischt sind', () => {
    expect(rolleVorschlag(['Drucker', 'Weiterbildung'], liste)).toBe('beides');
  });
  it('bleibt leer ohne Hinweis', () => {
    expect(rolleVorschlag(['Sitzung', 'Unbekannt'], liste)).toBe('');
  });
});
