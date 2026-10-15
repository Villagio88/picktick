import type { TimeEntry } from '../types';
import { ROLLEN } from '../data/rollen';

export type RollenSchluessel = 'technischer Support' | 'pädagogischer Support' | 'beides' | 'ohne';

export interface RollenSumme {
  schluessel: RollenSchluessel;
  minuten: number;
}

export interface RollenMonat {
  monat: string; // JJJJ-MM
  minuten: Record<RollenSchluessel, number>;
  total: number;
}

const SCHLUESSEL: RollenSchluessel[] = ['technischer Support', 'pädagogischer Support', 'beides', 'ohne'];

function schluessel(kategorie: string | undefined): RollenSchluessel {
  return ROLLEN.some((r) => r.wert === kategorie) ? (kategorie as RollenSchluessel) : 'ohne';
}

function leer(): Record<RollenSchluessel, number> {
  return { 'technischer Support': 0, 'pädagogischer Support': 0, beides: 0, ohne: 0 };
}

/** Summe der Minuten je Rolle, in fester Reihenfolge TICTS, PICTS, beides, ohne. */
export function rollenSummen(entries: TimeEntry[]): RollenSumme[] {
  const m = leer();
  for (const e of entries) m[schluessel(e.kategorie)] += e.dauerMinuten;
  return SCHLUESSEL.map((s) => ({ schluessel: s, minuten: m[s] }));
}

/** Minuten je Rolle und Monat, chronologisch sortiert. */
export function rollenProMonat(entries: TimeEntry[]): RollenMonat[] {
  const map = new Map<string, Record<RollenSchluessel, number>>();
  for (const e of entries) {
    const monat = e.datum.slice(0, 7);
    if (!map.has(monat)) map.set(monat, leer());
    map.get(monat)![schluessel(e.kategorie)] += e.dauerMinuten;
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, minuten]) => ({ monat, minuten, total: SCHLUESSEL.reduce((s, k) => s + minuten[k], 0) }));
}

/**
 * Anteil PICTS an der Arbeit mit Rolle, in Prozent. «beides» zählt je zur Hälfte,
 * Einträge ohne Rolle zählen nicht. Ohne Einträge mit Rolle: null.
 */
export function anteilPicts(summen: RollenSumme[]): number | null {
  const get = (s: RollenSchluessel) => summen.find((x) => x.schluessel === s)?.minuten ?? 0;
  const picts = get('pädagogischer Support') + get('beides') / 2;
  const basis = get('pädagogischer Support') + get('technischer Support') + get('beides');
  return basis > 0 ? Math.round((picts / basis) * 100) : null;
}
