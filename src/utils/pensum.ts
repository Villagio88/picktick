import type { Employer } from '../types';

/** Pensum-Historie: Key "{Arbeitgeber}|{Startjahr}" → Lektionen (Quelle: /api/pensum). */
export type PensumMap = Record<string, number>;

export interface PensumInfo {
  sollJahr: number;
  lektionen?: number;
  pensum?: number; // Prozent
}

/**
 * Pensum-Angaben für eine Periode: Lektionen aus der Historie, sonst aktuelle
 * Arbeitgeber-Einstellungen. Soll wird direkt aus Lektionen gerechnet (nicht über
 * das gerundete Pensum), damit der Wert zum gespeicherten sollStundenJahr passt.
 */
export function getPensumInfo(
  emp: Employer | undefined,
  periodeKey: string,
  pensumMap: PensumMap
): PensumInfo {
  if (!emp) return { sollJahr: 0 };
  const histLekt = pensumMap[`${emp.name}|${periodeKey}`];
  const lekt = histLekt ?? emp.lektionen;
  if (
    lekt != null && lekt > 0 &&
    emp.lektionenVollzeit != null && emp.lektionenVollzeit > 0 &&
    emp.vollzeitStunden != null && emp.vollzeitStunden > 0
  ) {
    const pensum = Math.round((lekt / emp.lektionenVollzeit) * 10000) / 100;
    const sollJahr = Math.round((emp.vollzeitStunden * lekt) / emp.lektionenVollzeit * 100) / 100;
    return { sollJahr, lektionen: lekt, pensum };
  }
  return { sollJahr: emp.sollStundenJahr ?? 0, lektionen: emp.lektionen, pensum: emp.pensum };
}
