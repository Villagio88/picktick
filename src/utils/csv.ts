import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { TimeEntry } from '../types';

interface CsvRowCurrent {
  'Beschreibung der Tätigkeit': string;
  'für wen': string;
  Kategorie: string;
  Leistung: string;
  Datum: string;
  Dauer: string;
  abgerechnet: string;
  'Dauer in Minuten mit Formel checked': string;
  'Dauer in Minuten': string;
}

interface CsvRowAll extends CsvRowCurrent {
  Jahr: string;
  Monat: string;
  Rechnungsnummer: string;
}

function parseDatumField(datum: string): {
  date: string;
  startZeit: string;
  endZeit: string;
} {
  // Format: "DD/MM/YYYY HH:MM (MEZ) → HH:MM" or "DD/MM/YYYY HH:MM (MEZ) → DD/MM/YYYY HH:MM"
  const fallback = { date: '', startZeit: '', endZeit: '' };
  if (!datum) return fallback;

  // Nur Datum ohne Zeit, wie es der Export für Einträge ohne Uhrzeit schreibt: "DD/MM/YYYY"
  const nurDatum = datum.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (nurDatum) return { date: `${nurDatum[3]}-${nurDatum[2]}-${nurDatum[1]}`, startZeit: '', endZeit: '' };

  try {
    const parts = datum.split('→').map((s) => s.trim());
    if (parts.length !== 2) return fallback;

    const startPart = parts[0];
    const endPart = parts[1];

    // Parse start: "DD/MM/YYYY HH:MM (MEZ)"
    const startMatch = startPart.match(
      /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/
    );
    if (!startMatch) return fallback;

    const day = startMatch[1];
    const month = startMatch[2];
    const year = startMatch[3];
    const startHour = startMatch[4].padStart(2, '0');
    const startMin = startMatch[5];

    const date = `${year}-${month}-${day}`;
    const startZeit = `${startHour}:${startMin}`;

    // Parse end: could be just "HH:MM" or "DD/MM/YYYY HH:MM"
    const endTimeOnly = endPart.match(/^(\d{1,2}):(\d{2})$/);
    const endFull = endPart.match(
      /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/
    );

    let endZeit = '';
    if (endTimeOnly) {
      endZeit = `${endTimeOnly[1].padStart(2, '0')}:${endTimeOnly[2]}`;
    } else if (endFull) {
      endZeit = `${endFull[4].padStart(2, '0')}:${endFull[5]}`;
    }

    return { date, startZeit, endZeit };
  } catch {
    return fallback;
  }
}

function parseDauerMinuten(value: string): number {
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

/** Wandelt CSV-Zeilen (Export von PickTick oder das ältere Notion-Format) in Einträge. */
export function zeilenZuEintraegen(zeilen: CsvRowAll[]): TimeEntry[] {
  return zeilen
          .filter(
            (row) =>
              row['Beschreibung der Tätigkeit'] &&
              row['Beschreibung der Tätigkeit'].trim() !== ''
          )
          .map((row) => {
            const { date, startZeit, endZeit } = parseDatumField(
              row.Datum || row['Datum'] || ''
            );
            return {
              id: uuidv4(),
              beschreibung: (
                row['Beschreibung der Tätigkeit'] || ''
              ).trim(),
              fuerWen: (row['für wen'] || '').trim(),
              kategorie: (row.Kategorie || row['Kategorie'] || '').trim(),
              leistung: (row.Leistung || row['Leistung'] || '').trim(),
              datum: date,
              startZeit,
              endZeit,
              dauerMinuten: parseDauerMinuten(
                row['Dauer in Minuten'] || row['Dauer in Minuten mit Formel checked'] || '0'
              ),
              abgerechnet:
                (row.abgerechnet || '').trim().toLowerCase() === 'yes',
              rechnungsnummer: (row.Rechnungsnummer || '').trim(),
              createdAt: new Date().toISOString(),
            };
          });
}

export function importCsv(file: File): Promise<TimeEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRowAll>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(zeilenZuEintraegen(results.data));
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export function exportCsv(entries: TimeEntry[]): string {
  const rows = entries.map((e) => {
    const [year, month, day] = e.datum.split('-');
    const datumStr = e.startZeit
      ? `${day}/${month}/${year} ${e.startZeit} (MEZ) → ${e.endZeit}`
      : `${day}/${month}/${year}`;

    const hours = Math.floor(e.dauerMinuten / 60);
    const mins = e.dauerMinuten % 60;
    const dauerStr = `${hours} Stunden ${mins}  Minuten`;

    const monatNamen: Record<string, string> = {
      '01': 'Januar',
      '02': 'Februar',
      '03': 'März',
      '04': 'April',
      '05': 'Mai',
      '06': 'Juni',
      '07': 'Juli',
      '08': 'August',
      '09': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Dezember',
    };

    return {
      'Beschreibung der Tätigkeit': e.beschreibung,
      Datum: datumStr,
      Dauer: dauerStr,
      'Dauer in Minuten': e.dauerMinuten,
      Jahr: year,
      Kategorie: e.kategorie,
      Leistung: e.leistung,
      Monat: monatNamen[month] || '',
      Rechnungsnummer: e.rechnungsnummer,
      abgerechnet: e.abgerechnet ? 'Yes' : 'No',
      'für wen': e.fuerWen,
    };
  });

  return Papa.unparse(rows);
}

export function downloadCsv(entries: TimeEntry[], filename: string): void {
  const csv = exportCsv(entries);
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
