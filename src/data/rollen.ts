/**
 * Rollen im ICT-Support einer Schule. Gespeichert wird der Wert im Feld `kategorie`
 * des Eintrags; die Werte sind seit den ersten Versionen gleich, damit bestehende
 * Daten ohne Umbau weiter gelten.
 *
 * TICTS: technischer ICT-Support (First-Level-Support, Geräte, Konten, Netzwerk).
 * PICTS: pädagogischer ICT-Support (Weiterbildung, Beratung, Medienbildung, Konzepte).
 */
export type RolleWert = '' | 'technischer Support' | 'pädagogischer Support' | 'beides';

export interface Rolle {
  wert: Exclude<RolleWert, ''>;
  kurz: string;
  lang: string;
  farbe: string;
}

export const ROLLEN: readonly Rolle[] = [
  { wert: 'technischer Support', kurz: 'TICTS', lang: 'TICTS · technischer Support', farbe: '#2563eb' },
  { wert: 'pädagogischer Support', kurz: 'PICTS', lang: 'PICTS · pädagogischer Support', farbe: '#16a34a' },
  { wert: 'beides', kurz: 'PICTS + TICTS', lang: 'PICTS und TICTS', farbe: '#9333ea' },
];

export function rolleKurz(wert: string | undefined): string {
  return ROLLEN.find((r) => r.wert === wert)?.kurz ?? '';
}

export function istRolle(wert: unknown): wert is RolleWert {
  return wert === '' || ROLLEN.some((r) => r.wert === wert);
}

/**
 * Schlägt die Rolle aus den gewählten Leistungen vor. Leistungen ohne Rolle zählen
 * nicht. Nur technische Leistungen ergeben TICTS, nur pädagogische PICTS, beides
 * gemischt «beides». Ohne Hinweis bleibt der Vorschlag leer.
 */
export function rolleVorschlag(
  leistungen: string[],
  liste: readonly { name: string; rolle: RolleWert }[],
): RolleWert {
  const rollen = new Set(
    leistungen
      .map((l) => liste.find((x) => x.name === l)?.rolle)
      .filter((r): r is Exclude<RolleWert, ''> => !!r && r !== 'beides'),
  );
  const beides = leistungen.some((l) => liste.find((x) => x.name === l)?.rolle === 'beides');
  if (beides || rollen.size > 1) return 'beides';
  if (rollen.has('technischer Support')) return 'technischer Support';
  if (rollen.has('pädagogischer Support')) return 'pädagogischer Support';
  return '';
}
