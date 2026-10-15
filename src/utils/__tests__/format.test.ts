import { describe, it, expect } from 'vitest';
import { periodeKeyToLabel, getPeriodeOptions } from '../format';

describe('periodeKeyToLabel', () => {
  it('bildet Schuljahr-Label aus Startjahr', () => {
    expect(periodeKeyToLabel('2025', 'schuljahr')).toBe('2025/2026');
  });
  it('bildet Kalenderjahr-Label aus Jahr', () => {
    expect(periodeKeyToLabel('2025', 'kalenderjahr')).toBe('2025');
  });
});

describe('getPeriodeOptions', () => {
  it('liefert Perioden aus Daten plus aktuelle Periode, absteigend', () => {
    const daten = ['2021-12-24', '2024-09-01', '2026-08-03'];
    const opts = getPeriodeOptions(daten, 'schuljahr', '2026-08-03');
    expect(opts).toEqual([
      { key: '2026', label: '2026/2027' },
      { key: '2024', label: '2024/2025' },
      { key: '2021', label: '2021/2022' },
    ]);
  });
  it('enthält die aktuelle Periode auch ohne Einträge', () => {
    const opts = getPeriodeOptions([], 'schuljahr', '2026-08-03');
    expect(opts).toEqual([{ key: '2026', label: '2026/2027' }]);
  });
  it('dedupliziert Perioden und ignoriert leere Daten', () => {
    const opts = getPeriodeOptions(['2025-09-01', '2026-03-15', ''], 'schuljahr', '2026-08-03');
    expect(opts).toEqual([
      { key: '2026', label: '2026/2027' },
      { key: '2025', label: '2025/2026' },
    ]);
  });
  it('behandelt Kalenderjahr-Modus korrekt', () => {
    const opts = getPeriodeOptions(['2025-12-18'], 'kalenderjahr', '2026-08-03');
    expect(opts).toEqual([
      { key: '2026', label: '2026' },
      { key: '2025', label: '2025' },
    ]);
  });
});
