import { useState } from 'react';
import { Save, Plus, X, Download } from 'lucide-react';
import type { Einstellungen, Leistung } from '../types';
import { useEinstellungen } from '../hooks/useEinstellungen';
import { ROLLEN } from '../data/rollen';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

function Feld({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

/** Einstellungen der Instanz: Absender und Bank für Rechnungen, Leistungsliste mit Rolle. */
export function EinstellungenPage() {
  const { einstellungen, speichern } = useEinstellungen();
  const [e, setE] = useState<Einstellungen>(einstellungen);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [neueLeistung, setNeueLeistung] = useState('');

  const setAbs = (k: keyof Einstellungen['absender'], v: string) => setE((p) => ({ ...p, absender: { ...p.absender, [k]: v } }));
  const setBank = (k: keyof Einstellungen['bank'], v: string) => setE((p) => ({ ...p, bank: { ...p.bank, [k]: v } }));
  const setLeistung = (i: number, l: Partial<Leistung>) =>
    setE((p) => ({ ...p, leistungen: p.leistungen.map((x, j) => (j === i ? { ...x, ...l } : x)) }));

  function leistungHinzufuegen() {
    const name = neueLeistung.trim().replace(/,/g, '');
    if (!name || e.leistungen.some((l) => l.name === name)) return;
    setE((p) => ({ ...p, leistungen: [...p.leistungen, { name, rolle: '' }] }));
    setNeueLeistung('');
  }

  async function handleSpeichern() {
    setMeldung(null);
    const namen = e.leistungen.map((l) => l.name.trim());
    if (namen.some((n) => !n) || new Set(namen).size !== namen.length) {
      setMeldung({ ok: false, text: 'Jede Leistung braucht einen eigenen, nicht leeren Namen.' });
      return;
    }
    try {
      await speichern({ ...e, leistungen: e.leistungen.map((l) => ({ ...l, name: l.name.trim() })) });
      setMeldung({ ok: true, text: 'Gespeichert.' });
    } catch (err) {
      setMeldung({ ok: false, text: `Speichern fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500">Diese Angaben bleiben auf deinem Server. Sie erscheinen nur auf Rechnungen und Stundenübersichten.</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Absender</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feld label="Name" value={e.absender.name} onChange={(v) => setAbs('name', v)} placeholder="Vorname Nachname" />
          <Feld label="Strasse" value={e.absender.strasse} onChange={(v) => setAbs('strasse', v)} />
          <Feld label="PLZ und Ort" value={e.absender.ort} onChange={(v) => setAbs('ort', v)} />
          <Feld label="Telefon" value={e.absender.telefon} onChange={(v) => setAbs('telefon', v)} />
          <Feld label="E-Mail" value={e.absender.email} onChange={(v) => setAbs('email', v)} />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Bankverbindung</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feld label="Bank" value={e.bank.name} onChange={(v) => setBank('name', v)} />
          <Feld label="IBAN" value={e.bank.iban} onChange={(v) => setBank('iban', v)} placeholder="CH.." />
          <Feld label="Kontoinhaber" value={e.bank.inhaber} onChange={(v) => setBank('inhaber', v)} placeholder="leer = Name des Absenders" />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Leistungen</h2>
          <p className="text-sm text-gray-500">
            Die Leistungen erscheinen im Formular als Auswahl. Die Rolle daneben schlägt beim Erfassen PICTS oder TICTS vor.
          </p>
        </div>
        <div className="space-y-2">
          {e.leistungen.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label="Name der Leistung"
                value={l.name}
                onChange={(ev) => setLeistung(i, { name: ev.target.value.replace(/,/g, '') })}
                className={inputCls}
              />
              <select
                aria-label="Rolle der Leistung"
                value={l.rolle}
                onChange={(ev) => setLeistung(i, { rolle: ev.target.value as Leistung['rolle'] })}
                className="w-44 shrink-0 px-2 py-2 rounded-lg border border-gray-300 text-sm bg-white"
              >
                <option value="">kein Vorschlag</option>
                {ROLLEN.map((r) => <option key={r.wert} value={r.wert}>{r.kurz}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setE((p) => ({ ...p, leistungen: p.leistungen.filter((_, j) => j !== i) }))}
                className="p-2 text-gray-400 hover:text-red-600 cursor-pointer rounded-lg"
                aria-label={`${l.name} entfernen`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={neueLeistung}
            onChange={(ev) => setNeueLeistung(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); leistungHinzufuegen(); } }}
            placeholder="Neue Leistung"
            className={inputCls}
          />
          <button type="button" onClick={leistungHinzufuegen} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer shrink-0">
            <Plus className="w-4 h-4" /> Hinzufügen
          </button>
        </div>
        <p className="text-xs text-gray-400">Bestehende Einträge behalten ihre Leistungen, auch wenn du eine Leistung hier entfernst.</p>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Sicherung</h2>
        <p className="text-sm text-gray-500">
          Alle Daten in einer Datei: Einträge, Arbeitgeber, Pensum und Einstellungen. Lege sie regelmässig an einem
          zweiten Ort ab; die automatischen Tagessicherungen liegen auf demselben Datenträger wie PickTick.
        </p>
        <a href="/api/sicherung" download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50">
          <Download className="w-4 h-4" /> Gesamtsicherung herunterladen
        </a>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSpeichern}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" /> Speichern
        </button>
        {meldung && <span className={`text-sm ${meldung.ok ? 'text-green-700' : 'text-red-700'}`}>{meldung.text}</span>}
      </div>
    </div>
  );
}
