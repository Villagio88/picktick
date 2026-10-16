import { describe, it, expect, vi, afterEach } from 'vitest';
import { lokalesDatum, istGueltigesDatum, istGueltigeZeit } from '../datum';

afterEach(() => vi.useRealTimers());

describe('lokalesDatum', () => {
  it('liefert kurz nach Mitternacht das lokale Datum, nicht den UTC-Vortag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 0, 30)); // 16.10.2026 00:30 lokal
    expect(lokalesDatum()).toBe('2026-10-16');
  });
});

describe('Prüfungen', () => {
  it('erkennt gültige und ungültige Daten', () => {
    expect(istGueltigesDatum('2026-02-28')).toBe(true);
    expect(istGueltigesDatum('2026-02-31')).toBe(false);
    expect(istGueltigesDatum('kein-datum')).toBe(false);
  });
  it('erkennt Zeiten', () => {
    expect(istGueltigeZeit('')).toBe(true);
    expect(istGueltigeZeit('07:40')).toBe(true);
    expect(istGueltigeZeit('24:00')).toBe(false);
    expect(istGueltigeZeit('zz')).toBe(false);
  });
});
