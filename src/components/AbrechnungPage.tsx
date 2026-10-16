import { useState, useMemo } from 'react';
import { FileText, CheckSquare, Square, MinusSquare, ChevronDown, ChevronRight, Download, CheckCircle2, Circle } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { formatDatum, formatDauer, formatStunden, getMonatName } from '../utils/format';
import { apiGenerateRechnungsnummer } from '../utils/api';
import { generateAbrechnung, generateStundenuebersicht } from '../utils/pdf';
import { useEinstellungen } from '../hooks/useEinstellungen';
import { rolleKurz } from '../data/rollen';
import { lokalesDatum } from '../utils/datum';

interface Props {
  entries: TimeEntry[];
  employer: string;
  employers: Employer[];
  onMarkAbgerechnet: (ids: string[], rechnungsnummer: string) => void;
  onMarkBezahlt: (rechnungsnummer: string, bezahltVon: string, bezahltAm: string) => void;
  onUnmarkBezahlt: (rechnungsnummer: string, fuerWen: string) => void;
}

interface MonthGroup {
  key: string;
  label: string;
  entries: TimeEntry[];
  totalMin: number;
}

interface InvoiceGroup {
  rechnungsnummer: string;
  entries: TimeEntry[];
  totalMin: number;
  dateRange: string;
  bezahlt: boolean;
  bezahltAm?: string;
  bezahltVon?: string;
}

export function AbrechnungPage({ entries, employer, employers, onMarkAbgerechnet, onMarkBezahlt, onUnmarkBezahlt }: Props) {
  const emp = employers.find(e => e.name === employer);
  const stundenlohn = emp?.stundenlohn;
  const { einstellungen } = useEinstellungen();
  const absenderFehlt = !einstellungen.absender.name.trim();

  // --- Unbilled ---
  const unbilled = useMemo(
    () => entries.filter((e) => !e.abgerechnet).sort((a, b) => a.datum.localeCompare(b.datum)),
    [entries]
  );

  const monthGroups = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of unbilled) {
      const [y, m] = e.datum.split('-');
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const groups: MonthGroup[] = [];
    for (const [key, grpEntries] of map) {
      const [y, m] = key.split('-');
      groups.push({
        key,
        label: `${getMonatName(parseInt(m))} ${y}`,
        entries: grpEntries,
        totalMin: grpEntries.reduce((s, e) => s + e.dauerMinuten, 0),
      });
    }
    return groups.sort((a, b) => a.key.localeCompare(b.key));
  }, [unbilled]);

  // --- Billed, grouped by Rechnungsnummer ---
  const invoiceGroups = useMemo(() => {
    const billed = entries.filter((e) => e.abgerechnet);
    const map = new Map<string, TimeEntry[]>();
    for (const e of billed) {
      const key = e.rechnungsnummer || 'ohne-nr';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const groups: InvoiceGroup[] = [];
    for (const [nr, grpEntries] of map) {
      grpEntries.sort((a, b) => a.datum.localeCompare(b.datum));
      const first = grpEntries[0];
      const last = grpEntries[grpEntries.length - 1];
      // Payment status from first entry (all entries in group share same status)
      const bezahlt = grpEntries[0]?.bezahlt ?? false;
      groups.push({
        rechnungsnummer: nr,
        entries: grpEntries,
        totalMin: grpEntries.reduce((s, e) => s + e.dauerMinuten, 0),
        dateRange: first.datum === last.datum
          ? formatDatum(first.datum)
          : `${formatDatum(first.datum)} – ${formatDatum(last.datum)}`,
        bezahlt,
        bezahltAm: grpEntries[0]?.bezahltAm,
        bezahltVon: grpEntries[0]?.bezahltVon,
      });
    }
    return groups.sort((a, b) => b.rechnungsnummer.localeCompare(a.rechnungsnummer));
  }, [entries]);

  // --- Selection state ---
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(unbilled.map((e) => e.id))
  );
  const [showBilled, setShowBilled] = useState(false);

  // --- Payment form state (per rechnungsnummer) ---
  const [paymentForm, setPaymentForm] = useState<string | null>(null);
  const [payAm, setPayAm] = useState('');

  const toggleEntry = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonth = (group: MonthGroup) => {
    const allSelected = group.entries.every((e) => selected.has(e.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of group.entries) {
        if (allSelected) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unbilled.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unbilled.map((e) => e.id)));
    }
  };

  const selectedEntries = unbilled.filter((e) => selected.has(e.id));
  const totalSelectedMin = selectedEntries.reduce((s, e) => s + e.dauerMinuten, 0);

  const isUebersicht = emp?.abrechnungsModus === 'stundenuebersicht';

  const handleAbrechnen = async () => {
    if (selectedEntries.length === 0) return;
    const was = isUebersicht ? 'eine Stundenübersicht' : 'eine Rechnung mit neuer Nummer';
    const ok = window.confirm(
      `${selectedEntries.length === 1 ? '1 Eintrag' : `${selectedEntries.length} Einträge`} (${formatStunden(totalSelectedMin)} Std) ${selectedEntries.length === 1 ? 'wird' : 'werden'} als abgerechnet markiert und ${was} wird erstellt. Fortfahren?`,
    );
    if (!ok) return;
    try {
      if (isUebersicht) {
        generateStundenuebersicht({ entries: selectedEntries, employer, emp, einstellungen });
        const marker = `uebersicht-${lokalesDatum()}`;
        onMarkAbgerechnet(
          selectedEntries.map((e) => e.id),
          marker
        );
      } else {
        const rechnungsnummer = await apiGenerateRechnungsnummer(employer);
        generateAbrechnung({ entries: selectedEntries, employer, rechnungsnummer, stundenlohn, emp, einstellungen });
        onMarkAbgerechnet(
          selectedEntries.map((e) => e.id),
          rechnungsnummer
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export fehlgeschlagen: ${msg}`);
    }
  };

  const handleDownloadInvoice = (group: InvoiceGroup) => {
    if (isUebersicht) {
      generateStundenuebersicht({ entries: group.entries, employer, emp, einstellungen });
    } else {
      generateAbrechnung({
        entries: group.entries,
        employer,
        rechnungsnummer: group.rechnungsnummer,
        stundenlohn,
        emp,
        einstellungen,
      });
    }
  };

  const openPaymentForm = (group: InvoiceGroup) => {
    setPaymentForm(group.rechnungsnummer);
    setPayAm(group.bezahltAm || lokalesDatum());
  };

  const handleMarkBezahlt = () => {
    if (!paymentForm) return;
    onMarkBezahlt(paymentForm, employer, payAm);
    setPaymentForm(null);
    setPayAm('');
  };

  const totalBilledMin = invoiceGroups.reduce((s, g) => s + g.totalMin, 0);
  const unpaidGroups = invoiceGroups.filter((g) => !g.bezahlt);

  const inputCls = (filled?: boolean) =>
    `px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${filled ? 'bg-gray-100' : 'bg-white'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Abrechnung: {employer}
          </h1>
          <p className="text-sm text-gray-500">
            {unbilled.length} offene Einträge &middot;{' '}
            {formatStunden(unbilled.reduce((s, e) => s + e.dauerMinuten, 0))} Std offen
            {invoiceGroups.length > 0 && (
              <> &middot; {formatStunden(totalBilledMin)} Std abgerechnet</>
            )}
            {unpaidGroups.length > 0 && (
              <> &middot; <span className="text-amber-600">{unpaidGroups.length} unbezahlt</span></>
            )}
          </p>
        </div>
        <button
          onClick={handleAbrechnen}
          disabled={selectedEntries.length === 0}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <FileText className="w-4 h-4" />
          {isUebersicht ? 'Stundenübersicht exportieren' : 'Abrechnung erstellen'} ({selectedEntries.length})
        </button>
      </div>

      {absenderFehlt && !isUebersicht && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Für die Rechnung fehlen Absender und Bankverbindung. Bitte zuerst unter «Einstellungen» erfassen.
        </div>
      )}

      {/* Selection summary */}
      {unbilled.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600 cursor-pointer"
          >
            {selected.size === unbilled.length ? (
              <CheckSquare className="w-4 h-4 text-primary-600" />
            ) : selected.size === 0 ? (
              <Square className="w-4 h-4" />
            ) : (
              <MinusSquare className="w-4 h-4 text-primary-600" />
            )}
            {selected.size === unbilled.length ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{selectedEntries.length}</span> ausgewählt &middot;{' '}
            <span className="font-semibold">{formatStunden(totalSelectedMin)} Std</span>
          </div>
        </div>
      )}

      {/* Unbilled month groups */}
      {monthGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckSquare className="w-8 h-8 text-green-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Keine offenen Einträge vorhanden</p>
          <p className="text-sm text-gray-400 mt-1">Alle Tätigkeiten für {employer} wurden bereits abgerechnet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const allSelected = group.entries.every((e) => selected.has(e.id));
            const someSelected = group.entries.some((e) => selected.has(e.id));
            return (
              <div key={group.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
                  onClick={() => toggleMonth(group)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => toggleMonth(group)}
                      className="rounded"
                    />
                    <span className="font-semibold text-gray-900">{group.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {group.entries.length} Einträge &middot; {formatStunden(group.totalMin)} Std
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.entries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleEntry(entry.id)}
                        className="rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{entry.beschreibung}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>{formatDatum(entry.datum)}</span>
                          {entry.startZeit && entry.endZeit && (
                            <span className="text-gray-400">
                              {entry.startZeit} – {entry.endZeit}
                            </span>
                          )}
                          {entry.kategorie && (
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {rolleKurz(entry.kategorie) || entry.kategorie}
                            </span>
                          )}
                          {entry.leistung && (
                            <span className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">
                              {entry.leistung}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDauer(entry.dauerMinuten)}
                        </span>
                        {entry.kilometer ? (
                          <span className="text-xs text-gray-500 ml-2">{entry.kilometer} km</span>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- Billed section --- */}
      {invoiceGroups.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowBilled(!showBilled)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 cursor-pointer"
          >
            {showBilled ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Abgerechnete Stunden anzeigen ({invoiceGroups.length} {isUebersicht ? (invoiceGroups.length === 1 ? 'Übersicht' : 'Übersichten') : (invoiceGroups.length === 1 ? 'Rechnung' : 'Rechnungen')} &middot; {formatStunden(totalBilledMin)} Std)
          </button>

          {showBilled && (
            <div className="space-y-4">
              {invoiceGroups.map((group) => {
                const totalStd = group.totalMin / 60;
                const isPayFormOpen = paymentForm === group.rechnungsnummer;

                return (
                  <div key={group.rechnungsnummer} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Invoice header */}
                    <div className={`flex items-center justify-between px-5 py-3 border-b ${isUebersicht ? 'bg-gray-50 border-gray-200' : group.bezahlt ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-3">
                        {isUebersicht ? (
                          <FileText className="w-4 h-4 text-gray-500" />
                        ) : group.bezahlt ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <span className="font-semibold text-gray-900">
                            {group.rechnungsnummer === 'ohne-nr'
                              ? 'Ohne Rechnungsnummer'
                              : isUebersicht
                                ? `Übersicht vom ${group.rechnungsnummer.replace('uebersicht-', '').split('-').reverse().join('.')}`
                                : `Rechnung ${group.rechnungsnummer}`}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">{group.dateRange}</span>
                          {!isUebersicht && (
                            group.bezahlt ? (
                              <span className="text-xs text-green-600 ml-2">
                                Bezahlt{group.bezahltAm ? ` am ${formatDatum(group.bezahltAm)}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 ml-2">Nicht bezahlt</span>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {group.entries.length} Einträge &middot; {formatStunden(group.totalMin)} Std
                          {stundenlohn ? ` · CHF ${(totalStd * stundenlohn).toFixed(2)}` : ''}
                        </span>
                        {group.rechnungsnummer !== 'ohne-nr' && (
                          <button
                            onClick={() => handleDownloadInvoice(group)}
                            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="PDF herunterladen"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        )}
                        {!isUebersicht && (
                          !group.bezahlt ? (
                            <button
                              onClick={() => openPaymentForm(group)}
                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Bezahlt
                            </button>
                          ) : (
                            <button
                              onClick={() => onUnmarkBezahlt(group.rechnungsnummer, employer)}
                              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Zurücksetzen
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Payment form */}
                    {isPayFormOpen && (
                      <div className="px-5 py-3 bg-green-50 border-b border-green-200 flex items-end gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Bezahlt am <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            value={payAm}
                            onChange={(e) => setPayAm(e.target.value)}
                            className={inputCls(!!payAm)}
                          />
                        </div>
                        <button
                          onClick={handleMarkBezahlt}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => setPaymentForm(null)}
                          className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Abbrechen
                        </button>
                      </div>
                    )}

                    {/* Entries */}
                    <div className="divide-y divide-gray-100">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 px-5 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{entry.beschreibung}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                              <span>{formatDatum(entry.datum)}</span>
                              {entry.startZeit && entry.endZeit && (
                                <span className="text-gray-400">
                                  {entry.startZeit} – {entry.endZeit}
                                </span>
                              )}
                              {entry.kategorie && (
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                  {rolleKurz(entry.kategorie) || entry.kategorie}
                                </span>
                              )}
                              {entry.leistung && (
                                <span className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">
                                  {entry.leistung}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatDauer(entry.dauerMinuten)}
                            </span>
                            {entry.kilometer ? (
                              <span className="text-xs text-gray-500 ml-2">{entry.kilometer} km</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
