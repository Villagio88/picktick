import { describe, it, expect } from 'vitest';
import { getPensumInfo } from '../pensum';
import type { Employer } from '../../types';

const schule: Employer = {
  name: 'Schule',
  hasSoll: true,
  vollzeitStunden: 1960,
  lektionenVollzeit: 29,
  lektionen: 9,
  pensum: 31.03,
  sollStundenJahr: 608.28,
};

describe('getPensumInfo', () => {
  it('nutzt den historischen Wert aus der Pensum-Historie', () => {
    const info = getPensumInfo(schule, '2024', { 'Schule|2024': 12 });
    expect(info.lektionen).toBe(12);
    expect(info.pensum).toBeCloseTo(41.38, 2);
    expect(info.sollJahr).toBeCloseTo(811.03, 2); // 1960 * 12/29
  });

  it('fällt ohne Historie auf die aktuellen Lektionen zurück', () => {
    const info = getPensumInfo(schule, '2026', {});
    expect(info.lektionen).toBe(9);
    expect(info.sollJahr).toBeCloseTo(608.28, 2); // 1960 * 9/29, direkt gerechnet
  });

  it('fällt ohne Lektionen-Angaben auf sollStundenJahr zurück', () => {
    const emp: Employer = { name: 'X', hasSoll: true, sollStundenJahr: 500 };
    expect(getPensumInfo(emp, '2025', {}).sollJahr).toBe(500);
  });

  it('liefert 0 ohne Arbeitgeber oder ohne Soll-Angaben', () => {
    expect(getPensumInfo(undefined, '2025', {}).sollJahr).toBe(0);
    expect(getPensumInfo({ name: 'Y', hasSoll: false }, '2025', {}).sollJahr).toBe(0);
  });
});
