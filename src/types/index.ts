export interface TimeEntry {
  id: string;
  beschreibung: string;
  fuerWen: string;
  kategorie: string;
  leistung: string;
  datum: string; // ISO date string YYYY-MM-DD
  startZeit: string; // HH:MM
  endZeit: string; // HH:MM
  dauerMinuten: number;
  abgerechnet: boolean;
  rechnungsnummer: string;
  bezahlt?: boolean;
  bezahltAm?: string; // ISO date YYYY-MM-DD
  bezahltVon?: string;
  kilometer?: number;
  createdAt: string;
}

export interface Employer {
  name: string;
  hasSoll: boolean;
  stundenlohn?: number;
  sollStundenJahr?: number;
  vollzeitStunden?: number;
  pensum?: number;
  lektionen?: number;
  lektionenVollzeit?: number;
  adresse?: string;
  ansprechpartner?: string;
  email?: string;
  telefon?: string;
  autoAbgerechnet?: boolean;
  farbe?: string;
  periodeModus?: 'schuljahr' | 'kalenderjahr';
  abrechnungsModus?: 'rechnung' | 'stundenuebersicht';
  /** Pauschal angerechnete Stunden pro Monat (zum Beispiel für Erreichbarkeit), nur mit Soll. */
  pauschaleStundenProMonat?: number;
}

export interface Leistung {
  name: string;
  /** Rolle, die diese Leistung nahelegt; leer heisst «kein Hinweis». */
  rolle: '' | 'technischer Support' | 'pädagogischer Support' | 'beides';
}

export interface Einstellungen {
  absender: { name: string; strasse: string; ort: string; telefon: string; email: string };
  bank: { name: string; iban: string; inhaber: string };
  leistungen: Leistung[];
}

export type ViewMode = 'dashboard' | 'uebersicht' | 'historie' | 'bericht' | 'abrechnung' | 'archiv' | 'arbeitgeber' | 'einstellungen';
