import { describe, it, expect } from 'vitest';
import { prozent, jahresFortschritt } from '../fortschritt';

describe('prozent', () => {
  it('rundet auf ganze Prozent', () => {
    expect(prozent(201.5, 608.28)).toBe(33); // 33.13
    expect(prozent(36.5, 50.69)).toBe(72);   // 72.01
  });

  it('deckelt nicht bei 100 (August 2026: 165 / 50.69 = 325.5)', () => {
    expect(prozent(165, 50.69)).toBe(326);
  });

  it('liefert 0 ohne Soll oder ohne Leistung', () => {
    expect(prozent(10, 0)).toBe(0);
    expect(prozent(0, 50)).toBe(0);
    expect(prozent(-5, 50)).toBe(0);
  });
});

describe('jahresFortschritt', () => {
  it('rechnet wie der Monatsbericht: erledigt gegen vergangen', () => {
    const f = jahresFortschritt(201.5, 608.28, 2, 12);
    expect(f.erledigt).toBe(33);
    expect(f.vergangen).toBe(17); // 2 von 12 Monaten = 16.67
    expect(f.voraus).toBe(true);
  });

  it('meldet Rückstand, wenn weniger erledigt als vergangen', () => {
    const f = jahresFortschritt(100, 608.28, 6, 12);
    expect(f.erledigt).toBe(16);
    expect(f.vergangen).toBe(50);
    expect(f.voraus).toBe(false);
  });

  it('abgeschlossene Periode: alle Monate vergangen', () => {
    const f = jahresFortschritt(700, 608.28, 12, 12);
    expect(f.erledigt).toBe(115);
    expect(f.vergangen).toBe(100);
    expect(f.voraus).toBe(true);
  });

  it('gleichstand zählt als voraus', () => {
    const f = jahresFortschritt(304.14, 608.28, 6, 12);
    expect(f.erledigt).toBe(50);
    expect(f.vergangen).toBe(50);
    expect(f.voraus).toBe(true);
  });
});
