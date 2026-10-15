import { describe, it, expect } from 'vitest';
import { parseLeistungen, joinLeistungen } from '../format';

describe('parseLeistungen', () => {
  it('liefert leere Liste für leer oder undefined', () => {
    expect(parseLeistungen('')).toEqual([]);
    expect(parseLeistungen(undefined)).toEqual([]);
  });
  it('trennt an Kommas und trimmt', () => {
    expect(parseLeistungen('Homepage, LehrerOffice')).toEqual(['Homepage', 'LehrerOffice']);
    expect(parseLeistungen(' Jamf ,iPad, ')).toEqual(['Jamf', 'iPad']);
  });
  it('behält Einzelwerte', () => {
    expect(parseLeistungen('Drucker')).toEqual(['Drucker']);
  });
});

describe('joinLeistungen', () => {
  it('fügt mit «, » zusammen und dedupliziert', () => {
    expect(joinLeistungen(['Jamf', 'iPad', 'Jamf'])).toBe('Jamf, iPad');
  });
  it('ignoriert Leerwerte und trimmt', () => {
    expect(joinLeistungen(['', ' Drucker ', '  '])).toBe('Drucker');
  });
  it('ist die Umkehrung von parseLeistungen', () => {
    const s = '1stLevelSupport, DigitalePlattformen, Drucker';
    expect(joinLeistungen(parseLeistungen(s))).toBe(s);
  });
});
