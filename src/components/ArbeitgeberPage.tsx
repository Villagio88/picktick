import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { Employer, TimeEntry } from '../types';
import { apiAddEmployer, apiDeleteEmployer, apiUpdateEmployer, apiSavePensum } from '../utils/api';
import type { PensumMap } from '../utils/pensum';
import { getPeriodeOptions, getPeriodeKey, todayISO } from '../utils/format';

interface Props {
  employers: Employer[];
  onEmployersChange: (employers: Employer[]) => void;
  entries: TimeEntry[];
  pensumMap: PensumMap;
  onPensumChange: (map: PensumMap) => void;
}

const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

/** Compute sollStundenJahr + pensum from the raw fields */
function computeSoll(fields: {
  vollzeitStunden: string;
  pensum: string;
  lektionen: string;
  lektionenVollzeit: string;
}) {
  const vz = parseFloat(fields.vollzeitStunden);
  const lekt = parseFloat(fields.lektionen);
  const lektVoll = parseFloat(fields.lektionenVollzeit);
  let pensum = parseFloat(fields.pensum);

  // Auto-compute Pensum from Lektionen
  if (!isNaN(lekt) && !isNaN(lektVoll) && lektVoll > 0) {
    pensum = Math.round(lekt / lektVoll * 10000) / 100;
  }

  const sollJahr =
    !isNaN(vz) && !isNaN(pensum) && vz > 0 && pensum > 0
      ? Math.round(vz * pensum / 100 * 100) / 100
      : 0;

  return { pensum: isNaN(pensum) ? 0 : pensum, sollJahr };
}

const inputCls = (filled?: boolean) =>
  `w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${filled ? 'bg-gray-100' : 'bg-white'}`;

// Sollzeit form fields (reused in new + edit)
function SollzeitFields({
  vollzeit,
  setVollzeit,
  pensum,
  setPensum,
  lektionen,
  setLektionen,
  lektVollzeit,
  setLektVollzeit,
  computed,
}: {
  vollzeit: string;
  setVollzeit: (v: string) => void;
  pensum: string;
  setPensum: (v: string) => void;
  lektionen: string;
  setLektionen: (v: string) => void;
  lektVollzeit: string;
  setLektVollzeit: (v: string) => void;
  computed: { pensum: number; sollJahr: number };
}) {
  const hasLekt =
    !isNaN(parseFloat(lektionen)) &&
    !isNaN(parseFloat(lektVollzeit)) &&
    parseFloat(lektVollzeit) > 0;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vollzeit-Jahresarbeitszeit
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={vollzeit}
            onChange={(e) => setVollzeit(e.target.value)}
            placeholder="z.B. 1900"
            className={inputCls(!!vollzeit)}
          />
          <span className="absolute right-3 top-2 text-sm text-gray-400">Std</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lektionen <span className="font-normal text-gray-400">(optional, für Schulen)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={lektionen}
            onChange={(e) => setLektionen(e.target.value)}
            placeholder="z.B. 10"
            className={inputCls(!!lektionen)}
            style={{ width: '80px' }}
          />
          <span className="text-gray-400">/</span>
          <input
            type="number"
            inputMode="decimal"
            value={lektVollzeit}
            onChange={(e) => setLektVollzeit(e.target.value)}
            placeholder="z.B. 28"
            className={inputCls(!!lektVollzeit)}
            style={{ width: '80px' }}
          />
          <span className="text-xs text-gray-500">Lekt.</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pensum {hasLekt && <span className="font-normal text-gray-400">(aus Lektionen)</span>}
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={hasLekt ? computed.pensum.toFixed(2) : pensum}
            onChange={(e) => setPensum(e.target.value)}
            readOnly={hasLekt}
            className={`${inputCls(!hasLekt && !!pensum)} ${hasLekt ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
        </div>
      </div>
      {computed.sollJahr > 0 && (
        <div className="md:col-span-2 bg-primary-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-primary-800">
            Deine Jahresarbeitszeit: {computed.sollJahr.toFixed(1)} Stunden
          </span>
          <span className="text-sm text-primary-600 ml-2">
            ({(computed.sollJahr / 12).toFixed(1)} Std/Monat)
          </span>
        </div>
      )}
    </>
  );
}

export function ArbeitgeberPage({ employers, onEmployersChange, entries, pensumMap, onPensumChange }: Props) {
  // New employer form
  const [newName, setNewName] = useState('');
  const [newStundenlohn, setNewStundenlohn] = useState('');
  const [newHasSoll, setNewHasSoll] = useState(false);
  const [newVollzeit, setNewVollzeit] = useState('');
  const [newPensum, setNewPensum] = useState('');
  const [newLektionen, setNewLektionen] = useState('');
  const [newLektVollzeit, setNewLektVollzeit] = useState('');
  const [newAnsprechpartner, setNewAnsprechpartner] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefon, setNewTelefon] = useState('');
  const [newAdresse, setNewAdresse] = useState('');
  const [newFarbe, setNewFarbe] = useState(() => COLOR_PALETTE[employers.length % COLOR_PALETTE.length]);
  const [newPeriodeModus, setNewPeriodeModus] = useState<'schuljahr' | 'kalenderjahr'>('schuljahr');

  // Expanded editing
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [ef, setEf] = useState({
    stundenlohn: '',
    vollzeitStunden: '',
    pensum: '',
    lektionen: '',
    lektionenVollzeit: '',
    ansprechpartner: '',
    email: '',
    telefon: '',
    adresse: '',
    farbe: '#6b7280',
    periodeModus: 'schuljahr' as 'schuljahr' | 'kalenderjahr',
    pauschale: '',
  });
  // Pensum-Historie: Eingaben pro Schuljahr-Key (nur Soll-Arbeitgeber)
  const [pensumEdits, setPensumEdits] = useState<Record<string, string>>({});

  const editComputed = computeSoll(ef);

  // Same for new form
  const newComputed = computeSoll({
    vollzeitStunden: newVollzeit,
    pensum: newPensum,
    lektionen: newLektionen,
    lektionenVollzeit: newLektVollzeit,
  });

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || employers.find((e) => e.name === name)) return;
    const rate = parseFloat(newStundenlohn);
    const vz = parseFloat(newVollzeit);
    const lekt = parseFloat(newLektionen);
    const lektVoll = parseFloat(newLektVollzeit);

    try {
      let updated = await apiAddEmployer({
        name,
        hasSoll: newHasSoll,
        stundenlohn: isNaN(rate) ? undefined : rate,
        sollStundenJahr: newHasSoll && newComputed.sollJahr > 0 ? newComputed.sollJahr : undefined,
      });
      // Set additional fields
      const extras: Partial<Omit<Employer, 'name'>> = {};
      if (newFarbe) extras.farbe = newFarbe;
      extras.periodeModus = newPeriodeModus;
      if (newAnsprechpartner.trim()) extras.ansprechpartner = newAnsprechpartner.trim();
      if (newEmail.trim()) extras.email = newEmail.trim();
      if (newTelefon.trim()) extras.telefon = newTelefon.trim();
      if (newAdresse.trim()) extras.adresse = newAdresse.trim();
      if (newHasSoll) {
        if (!isNaN(vz) && vz > 0) extras.vollzeitStunden = vz;
        if (newComputed.pensum > 0) extras.pensum = newComputed.pensum;
        if (!isNaN(lekt) && lekt > 0) extras.lektionen = lekt;
        if (!isNaN(lektVoll) && lektVoll > 0) extras.lektionenVollzeit = lektVoll;
      }
      if (Object.keys(extras).length > 0) {
        updated = await apiUpdateEmployer(name, extras);
      }
      onEmployersChange(updated);
      setNewName('');
      setNewStundenlohn('');
      setNewHasSoll(false);
      setNewVollzeit('');
      setNewPensum('');
      setNewLektionen('');
      setNewLektVollzeit('');
      setNewAnsprechpartner('');
      setNewEmail('');
      setNewTelefon('');
      setNewAdresse('');
      setNewFarbe(COLOR_PALETTE[(employers.length + 1) % COLOR_PALETTE.length]);
      setNewPeriodeModus('schuljahr');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Arbeitgeber konnte nicht hinzugefügt werden: ${msg}`);
    }
  };

  const handleExpand = (name: string) => {
    if (expandedEmp === name) {
      setExpandedEmp(null);
      return;
    }
    const emp = employers.find((e) => e.name === name);
    if (emp) {
      setEf({
        stundenlohn: emp.stundenlohn ? String(emp.stundenlohn) : '',
        vollzeitStunden: emp.vollzeitStunden ? String(emp.vollzeitStunden) : '',
        pensum: emp.pensum ? String(emp.pensum) : '',
        lektionen: emp.lektionen ? String(emp.lektionen) : '',
        lektionenVollzeit: emp.lektionenVollzeit ? String(emp.lektionenVollzeit) : '',
        ansprechpartner: emp.ansprechpartner || '',
        email: emp.email || '',
        telefon: emp.telefon || '',
        adresse: emp.adresse || '',
        farbe: emp.farbe || '#6b7280',
        periodeModus: emp.periodeModus || 'schuljahr',
        pauschale: emp.pauschaleStundenProMonat ? String(emp.pauschaleStundenProMonat) : '',
      });
      if (emp.hasSoll) {
        const jahre = getPeriodeOptions(
          entries.filter((e) => e.fuerWen === emp.name).map((e) => e.datum),
          'schuljahr'
        );
        const edits: Record<string, string> = {};
        jahre.forEach((j) => {
          const val = pensumMap[`${emp.name}|${j.key}`];
          edits[j.key] = val != null ? String(val) : '';
        });
        setPensumEdits(edits);
      }
    }
    setExpandedEmp(name);
  };

  const handleSavePensumJahr = async (empName: string, key: string) => {
    const lekt = parseFloat(pensumEdits[key]);
    if (isNaN(lekt) || lekt <= 0) return;
    try {
      const map = await apiSavePensum(`${empName}|${key}`, lekt);
      onPensumChange(map);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Pensum-Historie konnte nicht gespeichert werden: ${msg}`);
    }
  };

  const handleSave = async (name: string) => {
    const emp = employers.find((e) => e.name === name);
    const rate = parseFloat(ef.stundenlohn);
    const vz = parseFloat(ef.vollzeitStunden);
    const lekt = parseFloat(ef.lektionen);
    const lektVoll = parseFloat(ef.lektionenVollzeit);

    const updates: Partial<Omit<Employer, 'name'>> = {
      stundenlohn: isNaN(rate) || rate <= 0 ? undefined : rate,
      farbe: ef.farbe || undefined,
      periodeModus: ef.periodeModus,
      ansprechpartner: ef.ansprechpartner.trim() || undefined,
      email: ef.email.trim() || undefined,
      telefon: ef.telefon.trim() || undefined,
      adresse: ef.adresse.trim() || undefined,
    };

    if (emp?.hasSoll) {
      updates.vollzeitStunden = isNaN(vz) || vz <= 0 ? undefined : vz;
      updates.pensum = editComputed.pensum > 0 ? editComputed.pensum : undefined;
      updates.lektionen = isNaN(lekt) || lekt <= 0 ? undefined : lekt;
      updates.lektionenVollzeit = isNaN(lektVoll) || lektVoll <= 0 ? undefined : lektVoll;
      updates.sollStundenJahr = editComputed.sollJahr > 0 ? editComputed.sollJahr : undefined;
      const pauschale = parseFloat(ef.pauschale);
      updates.pauschaleStundenProMonat = isNaN(pauschale) || pauschale <= 0 ? undefined : pauschale;
    } else {
      updates.vollzeitStunden = undefined;
      updates.pensum = undefined;
      updates.lektionen = undefined;
      updates.lektionenVollzeit = undefined;
      updates.sollStundenJahr = undefined;
    }

    try {
      const updated = await apiUpdateEmployer(name, updates);
      onEmployersChange(updated);
      // Aktuelle Lektionen zusätzlich in die Pensum-Historie des laufenden Schuljahres schreiben
      if (emp?.hasSoll && !isNaN(lekt) && lekt > 0) {
        const currentKey = getPeriodeKey(todayISO(), 'schuljahr').key;
        try {
          const map = await apiSavePensum(`${name}|${currentKey}`, lekt);
          onPensumChange(map);
        } catch (err) {
          console.error('Pensum-Historie konnte nicht aktualisiert werden:', err);
        }
      }
      setExpandedEmp(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Speichern fehlgeschlagen: ${msg}`);
    }
  };

  const handleToggleSoll = async (name: string, hasSoll: boolean) => {
    const updates: Partial<Omit<Employer, 'name'>> = { hasSoll };
    if (!hasSoll) {
      updates.sollStundenJahr = undefined;
      updates.vollzeitStunden = undefined;
      updates.pensum = undefined;
      updates.lektionen = undefined;
      updates.lektionenVollzeit = undefined;
    }
    try {
      const updated = await apiUpdateEmployer(name, updates);
      onEmployersChange(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Sollzeit-Änderung fehlgeschlagen: ${msg}`);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    try {
      const updated = await apiDeleteEmployer(name);
      onEmployersChange(updated);
      if (expandedEmp === name) setExpandedEmp(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Löschen fehlgeschlagen: ${msg}`);
    }
  };


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Arbeitgeber</h1>

      {/* ── Neuer Arbeitgeber ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Neuer Arbeitgeber</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={inputCls(!!newName)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newFarbe}
                onChange={(e) => setNewFarbe(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={newFarbe}
                onChange={(e) => setNewFarbe(e.target.value)}
                className={inputCls(true)}
                style={{ maxWidth: '120px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abrechnungsperiode</label>
            <select
              value={newPeriodeModus}
              onChange={(e) => setNewPeriodeModus(e.target.value as 'schuljahr' | 'kalenderjahr')}
              className={inputCls(true)}
            >
              <option value="schuljahr">Schuljahr (Aug – Jul)</option>
              <option value="kalenderjahr">Kalenderjahr (Jan – Dez)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newHasSoll}
                onChange={(e) => setNewHasSoll(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Sollzeit</span>
            </label>
          </div>
          {newHasSoll ? (
            <SollzeitFields
              vollzeit={newVollzeit}
              setVollzeit={setNewVollzeit}
              pensum={newPensum}
              setPensum={setNewPensum}
              lektionen={newLektionen}
              setLektionen={setNewLektionen}
              lektVollzeit={newLektVollzeit}
              setLektVollzeit={setNewLektVollzeit}
              computed={newComputed}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stundenlohn (CHF)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={newStundenlohn}
                onChange={(e) => setNewStundenlohn(e.target.value)}
                placeholder="z.B. 120"
                className={inputCls(!!newStundenlohn)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ansprechpartner
            </label>
            <input
              type="text"
              value={newAnsprechpartner}
              onChange={(e) => setNewAnsprechpartner(e.target.value)}
              placeholder="Name der Kontaktperson"
              className={inputCls(!!newAnsprechpartner)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="info@beispiel.ch"
              className={inputCls(!!newEmail)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={newTelefon}
              onChange={(e) => setNewTelefon(e.target.value)}
              placeholder="+41 00 000 00 00"
              className={inputCls(!!newTelefon)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <textarea
              value={newAdresse}
              onChange={(e) => setNewAdresse(e.target.value)}
              placeholder={'Strasse Nr.\nPLZ Ort'}
              rows={2}
              className={inputCls(!!newAdresse) + ' resize-none'}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* ── Arbeitgeber-Liste ── */}
      <div className="space-y-3">
        {employers.map((emp) => {
          const hatEintraege = entries.some((e) => e.fuerWen === emp.name);
          const isExpanded = expandedEmp === emp.name;

          return (
            <div
              key={emp.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Summary row */}
              <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleExpand(emp.name)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: emp.farbe || '#6b7280' }}
                  />
                  <span className="font-medium text-gray-900">{emp.name}</span>
                </div>
                <div className="flex items-center gap-5 text-sm shrink-0">
                  {emp.hasSoll ? (
                    <>
                      {emp.pensum != null && (
                        <span className="text-gray-500">
                          {emp.pensum.toFixed(1)}%
                          {emp.lektionen != null && emp.lektionenVollzeit != null && (
                            <span className="text-gray-400 ml-1">
                              ({emp.lektionen}/{emp.lektionenVollzeit} Lekt.)
                            </span>
                          )}
                        </span>
                      )}
                      {emp.sollStundenJahr != null && (
                        <span className="text-gray-500">{emp.sollStundenJahr} Std/J</span>
                      )}
                    </>
                  ) : (
                    emp.stundenlohn != null && (
                      <span className="text-gray-700">CHF {emp.stundenlohn}.-/h</span>
                    )
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-5 py-5 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Abrechnungsperiode</label>
                      <select
                        value={ef.periodeModus}
                        onChange={(e) => setEf((p) => ({ ...p, periodeModus: e.target.value as 'schuljahr' | 'kalenderjahr' }))}
                        className={inputCls(true)}
                      >
                        <option value="schuljahr">Schuljahr (Aug – Jul)</option>
                        <option value="kalenderjahr">Kalenderjahr (Jan – Dez)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.hasSoll}
                          onChange={(e) => handleToggleSoll(emp.name, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Sollzeit</span>
                      </label>
                    </div>
                    {emp.hasSoll ? (
                      <>
                      <SollzeitFields
                        vollzeit={ef.vollzeitStunden}
                        setVollzeit={(v) => setEf((p) => ({ ...p, vollzeitStunden: v }))}
                        pensum={ef.pensum}
                        setPensum={(v) => setEf((p) => ({ ...p, pensum: v }))}
                        lektionen={ef.lektionen}
                        setLektionen={(v) => setEf((p) => ({ ...p, lektionen: v }))}
                        lektVollzeit={ef.lektionenVollzeit}
                        setLektVollzeit={(v) => setEf((p) => ({ ...p, lektionenVollzeit: v }))}
                        computed={editComputed}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pauschale pro Monat (Std)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={ef.pauschale}
                          onChange={(e) => setEf((p) => ({ ...p, pauschale: e.target.value }))}
                          placeholder="z.B. 8, leer = keine"
                          className={inputCls(!!ef.pauschale)}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Wird jedem vergangenen Monat angerechnet, etwa für Erreichbarkeit und Kleinstanfragen.
                        </p>
                      </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stundenlohn (CHF)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={ef.stundenlohn}
                          onChange={(e) => setEf((p) => ({ ...p, stundenlohn: e.target.value }))}
                          placeholder="z.B. 120"
                          className={inputCls(!!ef.stundenlohn)}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ansprechpartner
                      </label>
                      <input
                        type="text"
                        value={ef.ansprechpartner}
                        onChange={(e) =>
                          setEf((p) => ({ ...p, ansprechpartner: e.target.value }))
                        }
                        placeholder="Name der Kontaktperson"
                        className={inputCls(!!ef.ansprechpartner)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-Mail
                      </label>
                      <input
                        type="email"
                        value={ef.email}
                        onChange={(e) => setEf((p) => ({ ...p, email: e.target.value }))}
                        placeholder="info@beispiel.ch"
                        className={inputCls(!!ef.email)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={ef.telefon}
                        onChange={(e) => setEf((p) => ({ ...p, telefon: e.target.value }))}
                        placeholder="+41 00 000 00 00"
                        className={inputCls(!!ef.telefon)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse
                      </label>
                      <textarea
                        value={ef.adresse}
                        onChange={(e) => setEf((p) => ({ ...p, adresse: e.target.value }))}
                        placeholder={'Strasse Nr.\nPLZ Ort'}
                        rows={2}
                        className={inputCls(!!ef.adresse) + ' resize-none'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={ef.farbe}
                          onChange={(e) => setEf((p) => ({ ...p, farbe: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={ef.farbe}
                          onChange={(e) => setEf((p) => ({ ...p, farbe: e.target.value }))}
                          className={inputCls(true)}
                          style={{ maxWidth: '120px' }}
                        />
                      </div>
                    </div>
                  </div>
                  {emp.hasSoll && (
                    <div className="mt-4 pt-4 border-t border-gray-200 max-w-3xl">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Pensum-Historie (Lektionen pro Schuljahr)</h4>
                      <p className="text-xs text-gray-400 mb-3">
                        Für den Soll-Vergleich alter Schuljahre. Leere Jahre nutzen das aktuelle Pensum.
                      </p>
                      <div className="space-y-2">
                        {getPeriodeOptions(
                          entries.filter((e) => e.fuerWen === emp.name).map((e) => e.datum),
                          'schuljahr'
                        ).map((jahr) => (
                          <div key={jahr.key} className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-28 shrink-0">SJ {jahr.label}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={pensumEdits[jahr.key] ?? ''}
                              onChange={(e) => setPensumEdits((p) => ({ ...p, [jahr.key]: e.target.value }))}
                              placeholder="Lektionen"
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <button
                              onClick={() => handleSavePensumJahr(emp.name, jahr.key)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
                            >
                              Speichern
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4 max-w-3xl">
                    <button
                      onClick={() => handleSave(emp.name)}
                      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      <Check className="w-4 h-4" />
                      Speichern
                    </button>
                    {!hatEintraege && (
                      <button
                        onClick={() => handleDelete(emp.name)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
