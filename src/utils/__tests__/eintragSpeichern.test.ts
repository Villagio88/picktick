import { describe, it, expect } from 'vitest';
import { zumSpeichern } from '../eintragSpeichern';
import type { TimeEntry, Employer } from '../../types';

const basis: TimeEntry = {
  id: 'a', beschreibung: 'x', fuerWen: 'Schule', kategorie: '', leistung: '', datum: '2026-10-16',
  startZeit: '08:00', endZeit: '09:00', dauerMinuten: 60, abgerechnet: false, rechnungsnummer: '', createdAt: '',
};
const employers: Employer[] = [
  { name: 'Schule', hasSoll: true, autoAbgerechnet: true },
  { name: 'Auftrag', hasSoll: false },
];

describe('zumSpeichern', () => {
  it('rechnet neue Einträge bei automatischer Abrechnung ab und verändert das Argument nicht', () => {
    const r = zumSpeichern(basis, null, employers);
    expect(r).toMatchObject({ abgerechnet: true, bezahlt: true, bezahltVon: 'Schule', bezahltAm: '2026-10-16' });
    expect(basis.abgerechnet).toBe(false);
  });

  it('lässt neue Einträge anderer Auftraggeber offen', () => {
    expect(zumSpeichern({ ...basis, fuerWen: 'Auftrag' }, null, employers).abgerechnet).toBe(false);
  });

  it('behält beim Bearbeiten Rechnungsnummer und Zahlungsstand', () => {
    const bisher = { ...basis, fuerWen: 'Auftrag', abgerechnet: true, rechnungsnummer: '2026-002', bezahlt: false };
    const r = zumSpeichern({ ...bisher, beschreibung: 'neu', rechnungsnummer: '' }, bisher, employers);
    expect(r).toMatchObject({ rechnungsnummer: '2026-002', bezahlt: false, beschreibung: 'neu' });
  });

  it('setzt den Zahlungsstand zurück, wenn abgerechnet von Hand entfernt wird', () => {
    const bisher = { ...basis, abgerechnet: true, bezahlt: true, bezahltAm: '2026-10-01', bezahltVon: 'Schule' };
    const r = zumSpeichern({ ...bisher, abgerechnet: false }, bisher, employers);
    expect(r).toMatchObject({ abgerechnet: false, bezahlt: false, bezahltAm: undefined });
  });
});
