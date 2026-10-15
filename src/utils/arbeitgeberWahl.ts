import type { Employer } from '../types';

/**
 * Behält die gespeicherte Auswahl, solange es den Arbeitgeber gibt; sonst den ersten
 * mit Soll (die Schule), sonst den ersten überhaupt. «__alle__» bleibt erhalten.
 */
export function gueltigeAuswahl(bisher: string, liste: Employer[]): string {
  if (bisher === '__alle__' || liste.some((e) => e.name === bisher)) return bisher;
  return (liste.find((e) => e.hasSoll) ?? liste[0])?.name ?? bisher;
}
