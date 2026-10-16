import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Save, X } from 'lucide-react';
import type { TimeEntry, Employer } from '../types';
import { berechneMinuten, todayISO, currentTime } from '../utils/format';
import { LeistungChips } from './LeistungChips';
import { RolleAuswahl } from './RolleAuswahl';
import { rolleVorschlag } from '../data/rollen';
import type { RolleWert } from '../data/rollen';
import { useEinstellungen } from '../hooks/useEinstellungen';
import { parseLeistungen } from '../utils/format';

interface Props {
  onSave: (entry: TimeEntry) => void;
  onCancel: () => void;
  editEntry?: TimeEntry | null;
  employers: Employer[];
  initialDate?: string;
  /** Arbeitgeber, der für neue Einträge vorgewählt ist (in der Seitenleiste gewählt) */
  vorgabeArbeitgeber?: string;
}

export function EntryForm({ onSave, onCancel, editEntry, employers, initialDate, vorgabeArbeitgeber }: Props) {
  // Startwerte aus dem bearbeiteten Eintrag; App setzt einen key je Eintrag, damit das
  // Formular beim Wechsel neu startet statt Werte per Effect nachzuziehen.
  const [beschreibung, setBeschreibung] = useState(editEntry?.beschreibung ?? '');
  const [fuerWen, setFuerWen] = useState(
    () => editEntry?.fuerWen
      ?? (employers.some((e) => e.name === vorgabeArbeitgeber) ? vorgabeArbeitgeber : undefined)
      ?? (employers.find((e) => e.hasSoll) ?? employers[0])?.name ?? '',
  );
  const [kategorie, setKategorie] = useState(editEntry?.kategorie ?? '');
  // true, solange die Rolle nur aus den Leistungen vorgeschlagen ist
  const [rolleVorgeschlagen, setRolleVorgeschlagen] = useState(false);
  const { leistungen: leistungsListe } = useEinstellungen().einstellungen;
  const [leistung, setLeistung] = useState(editEntry?.leistung ?? '');
  const [datum, setDatum] = useState(editEntry?.datum ?? (initialDate || todayISO()));
  const [startZeit, setStartZeit] = useState(editEntry ? editEntry.startZeit ?? '' : currentTime());
  const [endZeit, setEndZeit] = useState(editEntry?.endZeit ?? '');
  const [dauerEingabe, setDauerMinuten] = useState(editEntry?.dauerMinuten ?? 0);
  // Manuell, wenn keine Zeiten da sind oder die gespeicherte Dauer nicht zu den Zeiten passt
  const [manualDauer, setManualDauer] = useState(() => !!editEntry && (
    !(editEntry.startZeit && editEntry.endZeit)
    || berechneMinuten(editEntry.startZeit, editEntry.endZeit) !== editEntry.dauerMinuten));
  const [kilometer, setKilometer] = useState(editEntry?.kilometer || 0);
  const [abgerechnet, setAbgerechnet] = useState(editEntry?.abgerechnet ?? false);
  const [rechnungsnummer] = useState('');
  // Mit Start und Ende wird die Dauer berechnet, sonst gilt die Eingabe
  const dauerMinuten = !manualDauer && startZeit && endZeit ? berechneMinuten(startZeit, endZeit) : dauerEingabe;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  function aendereLeistung(neu: string) {
    setLeistung(neu);
    // Vorschlag nur, solange die Rolle nicht von Hand gesetzt wurde
    if (!kategorie || rolleVorgeschlagen) {
      const v = rolleVorschlag(parseLeistungen(neu), leistungsListe);
      setKategorie(v);
      setRolleVorgeschlagen(v !== '');
    }
  }

  function waehleRolle(wert: RolleWert) {
    setKategorie(wert);
    setRolleVorgeschlagen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!beschreibung.trim() || !datum || !fuerWen) return;

    const entry: TimeEntry = {
      id: editEntry?.id || uuidv4(),
      beschreibung: beschreibung.trim(),
      fuerWen,
      kategorie,
      leistung,
      datum,
      // Zeiten bleiben auch bei manueller Dauer (etwa mit Pause); beim nächsten Öffnen
      // erkennt das Formular die abweichende Dauer und rechnet sie nicht still um
      startZeit,
      endZeit,
      dauerMinuten,
      kilometer: kilometer > 0 ? kilometer : undefined,
      abgerechnet,
      rechnungsnummer,
      createdAt: editEntry?.createdAt || new Date().toISOString(),
    };
    onSave(entry);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={editEntry ? 'Eintrag bearbeiten' : 'Neuer Zeiteintrag'}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editEntry ? 'Eintrag bearbeiten' : 'Neuer Zeiteintrag'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors rounded-lg p-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Schliessen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung der Tätigkeit <span className="text-red-500">*</span>
            </label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${beschreibung ? 'bg-gray-100' : 'bg-white'}`}
              placeholder="Was wurde gemacht? Ohne Namen von Schülerinnen und Schülern."
              required
              autoFocus
            />
          </div>

          {/* Für wen & Rolle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Für wen <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={fuerWen}
                  onChange={(e) => setFuerWen(e.target.value)}
                  className={`flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${fuerWen ? 'bg-gray-100' : 'bg-white'}`}
                >
                  {employers.map((emp) => (
                    <option key={emp.name} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
                <div
                  className="w-5 h-5 rounded-full shrink-0 border border-gray-200"
                  style={{ backgroundColor: employers.find((e) => e.name === fuerWen)?.farbe || '#6b7280' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rolle
              </label>
              <RolleAuswahl value={kategorie} onChange={waehleRolle} vorgeschlagen={rolleVorgeschlagen} />
            </div>
          </div>

          {/* Datum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${datum ? 'bg-gray-100' : 'bg-white'}`}
                required
              />
            </div>
          </div>

          {/* Leistungen (Mehrfachauswahl) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leistungen <span className="text-xs font-normal text-gray-400">(mehrere möglich)</span>
            </label>
            <LeistungChips value={leistung} onChange={aendereLeistung} />
          </div>

          {/* Zeit & Dauer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startzeit
              </label>
              <input
                type="time"
                value={startZeit}
                onChange={(e) => setStartZeit(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${startZeit ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endzeit
              </label>
              <input
                type="time"
                value={endZeit}
                onChange={(e) => setEndZeit(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${endZeit ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Dauer (Min)
                </label>
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={manualDauer}
                    onChange={(e) => { if (e.target.checked) setDauerMinuten(dauerMinuten); setManualDauer(e.target.checked); }}
                    className="rounded"
                  />
                  Manuell
                </label>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={dauerMinuten}
                onChange={(e) => setDauerMinuten(parseInt(e.target.value) || 0)}
                disabled={!manualDauer}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 ${!manualDauer ? '' : dauerMinuten > 0 ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
          </div>
          {!manualDauer && dauerMinuten > 0 && (
            <p className="text-xs text-gray-500 -mt-2">
              Berechnet: {Math.floor(dauerMinuten / 60)} Std {dauerMinuten % 60} Min
            </p>
          )}

          {/* Kilometer (Spesen) & Abgerechnet */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilometer (Spesen)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={kilometer || ''}
                onChange={(e) => setKilometer(parseInt(e.target.value) || 0)}
                placeholder="0"
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${kilometer > 0 ? 'bg-gray-100' : 'bg-white'}`}
              />
            </div>
            {!employers.find((e) => e.name === fuerWen)?.autoAbgerechnet && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abgerechnet
                </label>
                <select
                  value={abgerechnet ? 'ja' : 'nein'}
                  onChange={(e) => setAbgerechnet(e.target.value === 'ja')}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${abgerechnet ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}
                >
                  <option value="nein">Nicht abgerechnet</option>
                  <option value="ja">Abgerechnet</option>
                </select>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <Save className="w-4 h-4" />
              {editEntry ? 'Speichern' : 'Eintrag erstellen'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
