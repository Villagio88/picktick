import type { Einstellungen } from '../types';

/**
 * Einstellungen einer frischen Installation. Absender und Bank sind leer, bis sie in
 * der App unter «Einstellungen» erfasst werden. Die Leistungsliste ist ein Vorschlag
 * für den ICT-Support einer Schule und lässt sich frei anpassen.
 */
export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  absender: { name: '', strasse: '', ort: '', telefon: '', email: '' },
  bank: { name: '', iban: '', inhaber: '' },
  leistungen: [
    { name: '1st-Level-Support', rolle: 'technischer Support' },
    { name: 'Konten und Zugänge', rolle: 'technischer Support' },
    { name: 'Geräte', rolle: 'technischer Support' },
    { name: 'Geräteverwaltung (MDM)', rolle: 'technischer Support' },
    { name: 'Drucker', rolle: 'technischer Support' },
    { name: 'Netzwerk und WLAN', rolle: 'technischer Support' },
    { name: 'Software und Lizenzen', rolle: 'technischer Support' },
    { name: 'Cloud-Dienste', rolle: 'technischer Support' },
    { name: 'Schulverwaltung', rolle: 'technischer Support' },
    { name: 'Inventar und Beschaffung', rolle: 'technischer Support' },
    { name: 'Homepage', rolle: 'technischer Support' },
    { name: 'Weiterbildung Lehrpersonen', rolle: 'pädagogischer Support' },
    { name: 'Beratung Unterricht', rolle: 'pädagogischer Support' },
    { name: 'Unterrichtsprojekt', rolle: 'pädagogischer Support' },
    { name: 'Medienbildung', rolle: 'pädagogischer Support' },
    { name: 'Konzepte und Strategie', rolle: 'pädagogischer Support' },
    { name: 'Elternarbeit', rolle: 'pädagogischer Support' },
    { name: 'Sitzung', rolle: '' },
  ],
};
