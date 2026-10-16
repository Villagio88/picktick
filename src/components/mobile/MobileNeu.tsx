import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Save, X } from 'lucide-react';
import type { TimeEntry, Employer } from '../../types';
import { berechneMinuten, todayISO, currentTime, formatDauer } from '../../utils/format';

import { LeistungChips } from '../LeistungChips';
import { RolleAuswahl } from '../RolleAuswahl';
import { rolleVorschlag } from '../../data/rollen';
import type { RolleWert } from '../../data/rollen';
import { useEinstellungen } from '../../hooks/useEinstellungen';
import { parseLeistungen } from '../../utils/format';

interface Props {
  employers: Employer[];
  selectedEmployer: string;
  editEntry: TimeEntry | null;
  onSave: (entry: TimeEntry) => void;
  onCancel: () => void;
}

export function MobileNeu({ employers, selectedEmployer, editEntry, onSave, onCancel }: Props) {
  const isEdit = !!editEntry;
  const defaultEmp = selectedEmployer === '__alle__' ? ((employers.find((e) => e.hasSoll) ?? employers[0])?.name || '') : selectedEmployer;

  const [beschreibung, setBeschreibung] = useState(editEntry?.beschreibung || '');
  const [fuerWen, setFuerWen] = useState(editEntry?.fuerWen || defaultEmp);
  const [kategorie, setKategorie] = useState(editEntry?.kategorie || '');
  const [rolleVorgeschlagen, setRolleVorgeschlagen] = useState(false);
  const { leistungen: leistungsListe } = useEinstellungen().einstellungen;

  function aendereLeistung(neu: string) {
    setLeistung(neu);
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
  const [leistung, setLeistung] = useState(editEntry?.leistung || '');
  const [datum, setDatum] = useState(editEntry?.datum || todayISO());
  const [startZeit, setStartZeit] = useState(editEntry?.startZeit || currentTime());
  const [endZeit, setEndZeit] = useState(editEntry?.endZeit || '');
  const [dauerEingabe, setDauerMinuten] = useState(editEntry?.dauerMinuten || 0);
  // Manuell, wenn keine Zeiten da sind oder die gespeicherte Dauer nicht zu den Zeiten passt
  const [manualDauer, setManualDauer] = useState(() => !!editEntry && (
    !(editEntry.startZeit && editEntry.endZeit)
    || berechneMinuten(editEntry.startZeit, editEntry.endZeit) !== editEntry.dauerMinuten));
  const [kilometer, setKilometer] = useState(editEntry?.kilometer || 0);
  const [abgerechnet, setAbgerechnet] = useState(editEntry?.abgerechnet ?? false);

  // Mit Start und Ende wird die Dauer berechnet, sonst gilt die Eingabe
  const dauerMinuten = !manualDauer && startZeit && endZeit ? berechneMinuten(startZeit, endZeit) : dauerEingabe;

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
      startZeit: manualDauer ? '' : startZeit,
      endZeit: manualDauer ? '' : endZeit,
      dauerMinuten,
      kilometer: kilometer > 0 ? kilometer : undefined,
      abgerechnet,
      rechnungsnummer: editEntry?.rechnungsnummer ?? '',
      createdAt: editEntry?.createdAt || new Date().toISOString(),
    };
    onSave(entry);
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col">
      {/* Sticky Topbar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-gray-600 active:text-gray-900"
        >
          <X className="w-4 h-4" /> Abbrechen
        </button>
        <h1 className="text-base font-semibold">{isEdit ? 'Bearbeiten' : 'Neuer Eintrag'}</h1>
        <button
          type="submit"
          disabled={!beschreibung.trim() || !datum || dauerMinuten <= 0}
          className="flex items-center gap-1 text-sm font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg active:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400"
        >
          <Save className="w-4 h-4" /> Speichern
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Beschreibung */}
        <Section label="Was hast du gemacht?">
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="z.B. Drucker im Lehrerzimmer neu eingerichtet (ohne Namen von Kindern)"
            rows={4}
            autoFocus={!isEdit}
            className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </Section>

        {/* Datum */}
        <Section label="Datum">
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        {/* Dauer Modus Toggle */}
        <Section label="Dauer">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setManualDauer(false)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                !manualDauer ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Von – Bis
            </button>
            <button
              type="button"
              onClick={() => { setDauerMinuten(dauerMinuten); setManualDauer(true); }}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                manualDauer ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Direkt eingeben
            </button>
          </div>

          {!manualDauer ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-gray-500 block mb-1">Start</span>
                <input
                  type="time"
                  value={startZeit}
                  onChange={(e) => setStartZeit(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 block mb-1">Ende</span>
                <input
                  type="time"
                  value={endZeit}
                  onChange={(e) => setEndZeit(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-gray-500 block mb-1">Stunden</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={Math.floor(dauerMinuten / 60)}
                  onChange={(e) => {
                    const h = parseInt(e.target.value) || 0;
                    setDauerMinuten(h * 60 + (dauerMinuten % 60));
                  }}
                  className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 block mb-1">Minuten</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={dauerMinuten % 60}
                  onChange={(e) => {
                    const m = parseInt(e.target.value) || 0;
                    setDauerMinuten(Math.floor(dauerMinuten / 60) * 60 + m);
                  }}
                  className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          )}

          {dauerMinuten > 0 && (
            <p className="text-xs text-gray-500 mt-2">Ergibt {formatDauer(dauerMinuten)}</p>
          )}
        </Section>

        {/* Arbeitgeber */}
        <Section label="Arbeitgeber">
          <select
            value={fuerWen}
            onChange={(e) => setFuerWen(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {employers.map(e => (
              <option key={e.name} value={e.name}>{e.name}</option>
            ))}
          </select>
        </Section>

        {/* Leistung + Rolle */}
        <Section label="Leistungen (mehrere möglich)">
          <LeistungChips value={leistung} onChange={aendereLeistung} size="lg" />
        </Section>

        <Section label="Rolle">
          <RolleAuswahl value={kategorie} onChange={waehleRolle} vorgeschlagen={rolleVorgeschlagen} size="lg" />
        </Section>

        {/* Kilometer (optional, klein) */}
        <Section label="Kilometer (optional)">
          <input
            type="number"
            min={0}
            step={1}
            value={kilometer || ''}
            onChange={(e) => setKilometer(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        {/* Abgerechnet (nur für Arbeitgeber ohne automatische Abrechnung) */}
        {!employers.find((e) => e.name === fuerWen)?.autoAbgerechnet && (
          <Section label="Abgerechnet">
            <select
              value={abgerechnet ? 'ja' : 'nein'}
              onChange={(e) => setAbgerechnet(e.target.value === 'ja')}
              className={`w-full min-h-[44px] px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${abgerechnet ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
            >
              <option value="nein">Nicht abgerechnet</option>
              <option value="ja">Abgerechnet</option>
            </select>
          </Section>
        )}

        {/* Spacer für scroll */}
        <div className="h-4" />
      </div>
    </form>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 px-1">{label}</div>
      {children}
    </div>
  );
}
