/**
 * Fortschritt in Prozent, gleiche Formeln wie im Monatsbericht an die Schulleitung
 * (Anteil Jahressoll, Anteil vergangenes Jahr), damit
 * Dashboard und Bericht dieselben Zahlen zeigen.
 */

/** Ganzzahliger Prozentwert von ist zu soll; 0 ohne Soll, nie negativ, nicht bei 100 gedeckelt. */
export function prozent(ist: number, soll: number): number {
  if (soll <= 0 || ist <= 0) return 0;
  return Math.round((ist / soll) * 100);
}

export interface JahresFortschritt {
  /** Anteil des Jahressolls, der bereits geleistet ist (inkl. Pauschale). */
  erledigt: number;
  /** Anteil der Periode, der bereits vergangen ist (Monate inkl. laufendem). */
  vergangen: number;
  /** true, wenn mindestens so viel erledigt wie vergangen ist. */
  voraus: boolean;
}

export function jahresFortschritt(
  kumuliert: number,
  sollJahr: number,
  monateVergangen: number,
  monateTotal: number
): JahresFortschritt {
  const erledigt = prozent(kumuliert, sollJahr);
  const vergangen = prozent(monateVergangen, monateTotal);
  return { erledigt, vergangen, voraus: erledigt >= vergangen };
}
