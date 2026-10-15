import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TimeEntry, Employer, Einstellungen } from '../types';

interface AbrechnungParams {
  entries: TimeEntry[];
  employer: string;
  rechnungsnummer: string;
  stundenlohn?: number;
  emp?: Employer;
  einstellungen: Einstellungen;
}

/** Absender und Bank kommen aus den Einstellungen der Instanz. */
function absenderAus(e: Einstellungen) {
  return {
    SENDER: { name: e.absender.name, strasse: e.absender.strasse, ort: e.absender.ort, tel: e.absender.telefon, email: e.absender.email },
    BANK: { name: e.bank.name, iban: e.bank.iban, inhaber: e.bank.inhaber || e.absender.name },
  };
}

export function generateAbrechnung({ entries, employer, rechnungsnummer, stundenlohn, emp, einstellungen }: AbrechnungParams): void {
  const { SENDER, BANK } = absenderAus(einstellungen);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const rightX = pageWidth - mR;
  const rate = stundenlohn ?? 0;

  const sorted = [...entries].sort((a, b) => a.datum.localeCompare(b.datum));
  const totalMinuten = sorted.reduce((s, e) => s + e.dauerMinuten, 0);
  const totalStunden = totalMinuten / 60;
  const gesamtNetto = totalStunden * rate;

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const zahlbarBis = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // ─── Absenderzeile (klein, oben) ───
  let y = 20;
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text(`${SENDER.name}  ·  ${SENDER.strasse}  ·  ${SENDER.ort}`, mL, y);

  // ─── Empfänger ───
  y = 38;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  if (emp?.ansprechpartner) {
    doc.text(emp.ansprechpartner, mL, y);
    y += 5;
  }
  doc.text(employer, mL, y);
  if (emp?.adresse) {
    for (const line of emp.adresse.split('\n')) {
      y += 5;
      doc.text(line, mL, y);
    }
  }

  // ─── Titel: RECHNUNG ───
  y += 18;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('RECHNUNG', mL, y);

  // ─── Info-Block mit Linien ───
  y += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(mL, y, rightX, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Datum: ${fmtDate(todayISO)}`, mL, y);
  doc.text(`Zahlbar bis: ${fmtDate(zahlbarBis)}`, rightX, y, { align: 'right' });

  y += 5.5;
  doc.text(`Rechnungsnummer: ${rechnungsnummer}`, mL, y);

  y += 4;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(mL, y, rightX, y);

  // ─── Anrede & Einleitung ───
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const anrede = emp?.ansprechpartner
    ? `Sehr geehrte/r ${emp.ansprechpartner}`
    : 'Sehr geehrte Damen und Herren';
  doc.text(anrede, mL, y);

  y += 8;
  doc.text('Ich erlaube mir, Ihnen wie folgt in Rechnung zu stellen:', mL, y);

  y += 8;

  // ─── Positionstabelle ───
  const body: string[][] = [];

  sorted.forEach((e, i) => {
    const std = e.dauerMinuten / 60;
    const datumStr = fmtDate(e.datum);
    const desc = e.leistung && e.leistung !== e.beschreibung
      ? `${datumStr} – ${e.beschreibung} (${e.leistung})`
      : `${datumStr} – ${e.beschreibung}`;

    if (rate > 0) {
      body.push([
        String(i + 1),
        desc,
        fmtStd(std),
        `${rate.toFixed(2)} CHF`,
        `${(std * rate).toFixed(2)} CHF`,
      ]);
    } else {
      body.push([
        String(i + 1),
        desc,
        fmtStd(std),
      ]);
    }
  });

  const headRow = rate > 0
    ? [['Pos.', 'Beschreibung', 'Stunden', 'Ansatz', 'Preis in CHF']]
    : [['Pos.', 'Beschreibung', 'Stunden']];

  const colStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right' }> = rate > 0
    ? {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      }
    : {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
      };

  autoTable(doc, {
    startY: y,
    head: headRow,
    body,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      overflow: 'linebreak',
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: colStyles,
    margin: { left: mL, right: mR },
    showHead: 'everyPage',
  });

  // @ts-expect-error jspdf-autotable extends doc
  y = doc.lastAutoTable.finalY + 2;

  // ─── Totals (unterhalb Tabelle, rechtsbündig) ───
  if (rate > 0) {
    const labelX = rightX - 65;
    const valX = rightX;

    // Trennlinie über Totals
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(labelX, y, rightX, y);

    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('Gesamt (netto):', labelX, y);
    doc.text(`${gesamtNetto.toFixed(2)} CHF`, valX, y, { align: 'right' });

    y += 5.5;
    doc.text('Mehrwertsteuer 0.0 %', labelX, y);
    doc.text('0.00 CHF', valX, y, { align: 'right' });

    y += 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(labelX, y, rightX, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamt (brutto):', labelX, y);
    doc.text(`${gesamtNetto.toFixed(2)} CHF`, valX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  } else {
    // Ohne Stundenlohn: nur Total Stunden
    const labelX = rightX - 50;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(labelX, y, rightX, y);

    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', labelX, y);
    doc.text(`${fmtStd(totalStunden)} Stunden`, rightX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  // ─── Schlusstext ───
  y += 16;

  // Seitenumbruch falls nötig
  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    y = 25;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Bei Fragen stehe ich Ihnen gerne zur Verfügung.', mL, y);

  y += 10;
  doc.text('Freundliche Grüsse', mL, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text(SENDER.name, mL, y);

  // ─── Footer auf jeder Seite ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(mL, footerY, rightX, footerY);

    const fY = footerY + 4;
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');

    // Spalte 1: Adresse
    doc.text(SENDER.name, mL, fY);
    doc.text(SENDER.strasse, mL, fY + 3.5);
    doc.text(SENDER.ort, mL, fY + 7);

    // Spalte 2: Kontakt
    const col2 = mL + 42;
    doc.text(`Tel.: ${SENDER.tel}`, col2, fY);
    doc.text(`E-Mail: ${SENDER.email}`, col2, fY + 3.5);

    // Spalte 3: Bank
    const col3 = mL + 100;
    doc.text(BANK.name, col3, fY);
    doc.text(`IBAN: ${BANK.iban}`, col3, fY + 3.5);
    doc.text(`Kontoinhaber: ${BANK.inhaber}`, col3, fY + 7);

    if (pageCount > 1) {
      doc.text(`Seite ${i} / ${pageCount}`, rightX, fY, { align: 'right' });
    }
  }

  doc.setTextColor(0);
  doc.save(`Rechnung_${employer.replace(/\s+/g, '_')}_${rechnungsnummer}.pdf`);
}

interface StundenuebersichtParams {
  entries: TimeEntry[];
  employer: string;
  emp?: Employer;
  einstellungen: Einstellungen;
}

export function generateStundenuebersicht({ entries, employer, emp, einstellungen }: StundenuebersichtParams): void {
  const { SENDER } = absenderAus(einstellungen);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const rightX = pageWidth - mR;

  const sorted = [...entries].sort((a, b) => a.datum.localeCompare(b.datum));
  const totalMinuten = sorted.reduce((s, e) => s + e.dauerMinuten, 0);
  const totalStunden = totalMinuten / 60;
  const totalKm = sorted.reduce((s, e) => s + (e.kilometer || 0), 0);

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // --- Absenderzeile ---
  let y = 20;
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text(`${SENDER.name}  ·  ${SENDER.strasse}  ·  ${SENDER.ort}`, mL, y);

  // --- Empfänger ---
  y = 38;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  if (emp?.ansprechpartner) {
    doc.text(emp.ansprechpartner, mL, y);
    y += 5;
  }
  doc.text(employer, mL, y);
  if (emp?.adresse) {
    for (const line of emp.adresse.split('\n')) {
      y += 5;
      doc.text(line, mL, y);
    }
  }

  // --- Titel ---
  y += 18;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('STUNDENÜBERSICHT', mL, y);

  // --- Info-Block ---
  y += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(mL, y, rightX, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Datum: ${fmtDate(todayISO)}`, mL, y);

  // Zeitraum
  if (sorted.length > 0) {
    const von = fmtDate(sorted[0].datum);
    const bis = fmtDate(sorted[sorted.length - 1].datum);
    doc.text(`Zeitraum: ${von} – ${bis}`, rightX, y, { align: 'right' });
  }

  y += 4;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(mL, y, rightX, y);

  // --- Einleitung ---
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const anrede = emp?.ansprechpartner
    ? `Hallo ${emp.ansprechpartner}`
    : 'Hallo';
  doc.text(anrede, mL, y);

  y += 8;
  doc.text('Hier die Übersicht meiner geleisteten Stunden:', mL, y);

  y += 8;

  // --- Tabelle ---
  const hasKm = sorted.some((e) => e.kilometer && e.kilometer > 0);

  const body: string[][] = [];
  sorted.forEach((e, i) => {
    const std = e.dauerMinuten / 60;
    const datumStr = fmtDate(e.datum);
    const desc = e.leistung && e.leistung !== e.beschreibung
      ? `${e.beschreibung} (${e.leistung})`
      : e.beschreibung;

    const row = [String(i + 1), datumStr, desc, fmtStd(std)];
    if (hasKm) {
      row.push(e.kilometer ? `${e.kilometer} km` : '');
    }
    body.push(row);
  });

  const headRow = hasKm
    ? [['Pos.', 'Datum', 'Beschreibung', 'Stunden', 'km']]
    : [['Pos.', 'Datum', 'Beschreibung', 'Stunden']];

  const colStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right' }> = hasKm
    ? {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 22, halign: 'left' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
      }
    : {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 22, halign: 'left' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right' },
      };

  autoTable(doc, {
    startY: y,
    head: headRow,
    body,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      overflow: 'linebreak',
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: colStyles,
    margin: { left: mL, right: mR },
    showHead: 'everyPage',
  });

  // @ts-expect-error jspdf-autotable extends doc
  y = doc.lastAutoTable.finalY + 2;

  // --- Totals ---
  const labelX = rightX - 60;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(labelX, y, rightX, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Stunden:', labelX, y);
  doc.text(`${fmtStd(totalStunden)}`, rightX, y, { align: 'right' });

  if (totalKm > 0) {
    y += 5.5;
    doc.text('Total Kilometer:', labelX, y);
    doc.text(`${totalKm} km`, rightX, y, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');

  // --- Schlusstext ---
  y += 16;
  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    y = 25;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Freundliche Grüsse', mL, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text(SENDER.name, mL, y);

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(mL, footerY, rightX, footerY);

    const fY = footerY + 4;
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');

    doc.text(SENDER.name, mL, fY);
    doc.text(SENDER.strasse, mL, fY + 3.5);
    doc.text(SENDER.ort, mL, fY + 7);

    const col2 = mL + 42;
    doc.text(`Tel.: ${SENDER.tel}`, col2, fY);
    doc.text(`E-Mail: ${SENDER.email}`, col2, fY + 3.5);

    if (pageCount > 1) {
      doc.text(`Seite ${i} / ${pageCount}`, rightX, fY, { align: 'right' });
    }
  }

  doc.setTextColor(0);

  // Dateiname: Zeitraum
  const vonDate = sorted.length > 0 ? sorted[0].datum : todayISO;
  const bisDate = sorted.length > 0 ? sorted[sorted.length - 1].datum : todayISO;
  doc.save(`Stundenuebersicht_${employer.replace(/\s+/g, '_')}_${vonDate}_${bisDate}.pdf`);
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function fmtStd(std: number): string {
  const h = Math.floor(std);
  const m = Math.round((std - h) * 60);
  return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`;
}
