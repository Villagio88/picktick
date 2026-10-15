import { useState, useMemo, useCallback, useEffect } from 'react';
import type { ViewMode, TimeEntry, Employer } from './types';
import { useEntries } from './hooks/useEntries';
import { useIsMobile } from './hooks/useMediaQuery';
import { MobileApp } from './components/mobile/MobileApp';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EntryForm } from './components/EntryForm';
import { History } from './components/History';
import { Report } from './components/Report';
import { Archiv } from './components/Archiv';
import { AbrechnungPage } from './components/AbrechnungPage';
import { ArbeitgeberPage } from './components/ArbeitgeberPage';
import { EinstellungenPage } from './components/EinstellungenPage';
import { Willkommen } from './components/Willkommen';
import { useAbmelden } from './components/Zugang';
import { Uebersicht } from './components/Uebersicht';
import { ImportModal } from './components/ImportModal';
import { fetchEmployers, fetchPensum } from './utils/api';
import { getPeriodeKey, periodeKeyToRange, periodeKeyToLabel, getPeriodeOptions, getPeriodeLabel, todayISO } from './utils/format';
import type { PensumMap } from './utils/pensum';
import { PeriodeBanner } from './components/PeriodeBanner';
import { gueltigeAuswahl } from './utils/arbeitgeberWahl';

const VIEW_KEY = 'picktick-ansicht';
const EMPLOYER_KEY = 'picktick-arbeitgeber';

function loadPersistedView(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  if (v === 'dashboard' || v === 'uebersicht' || v === 'historie' || v === 'bericht' || v === 'abrechnung' || v === 'archiv' || v === 'arbeitgeber' || v === 'einstellungen') return v;
  return 'dashboard';
}

function loadPersistedEmployer(): string {
  return localStorage.getItem(EMPLOYER_KEY) || '';
}

export default function App() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileApp />;

  return <DesktopApp />;
}

function DesktopApp() {
  const [view, setViewState] = useState<ViewMode>(loadPersistedView);
  const [showImport, setShowImport] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>();
  const [selectedEmployer, setSelectedEmployerState] = useState(loadPersistedEmployer);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employersGeladen, setEmployersGeladen] = useState(false);
  const [selectedPeriodeKey, setSelectedPeriodeKey] = useState<string | null>(null);
  const [pensumMap, setPensumMap] = useState<PensumMap>({});
  const abmelden = useAbmelden();
  const { entries, loading, error, clearError, add, update, remove, importEntries, replaceAll, markAbgerechnet, markBezahlt, unmarkBezahlt } =
    useEntries();

  useEffect(() => {
    fetchEmployers()
      .then((liste) => {
        setEmployers(liste);
        setEmployersGeladen(true);
        setSelectedEmployerState((bisher) => gueltigeAuswahl(bisher, liste));
      })
      .catch((err) => console.error('Arbeitgeber konnten nicht geladen werden:', err));
    fetchPensum()
      .then(setPensumMap)
      .catch((err) => console.error('Pensum-Historie konnte nicht geladen werden:', err));
  }, []);

  const isAlleMode = selectedEmployer === '__alle__';
  // Erster Start: noch kein Arbeitgeber erfasst
  const ersterStart = employersGeladen && employers.length === 0 && view !== 'arbeitgeber' && view !== 'einstellungen';

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    localStorage.setItem(VIEW_KEY, v);
    // Auto-switch from "Alle" when navigating to single-employer views
    const singleOnly = new Set(['dashboard', 'bericht', 'abrechnung', 'archiv']);
    if (selectedEmployer === '__alle__' && singleOnly.has(v) && employers.length > 0) {
      setSelectedEmployerState(employers[0].name);
      localStorage.setItem(EMPLOYER_KEY, employers[0].name);
    }
  }, [selectedEmployer, employers]);

  const setSelectedEmployer = useCallback((name: string) => {
    setSelectedEmployerState(name);
    localStorage.setItem(EMPLOYER_KEY, name);
  }, []);

  const handleEmployersChange = useCallback((updated: Employer[]) => {
    setEmployers(updated);
  }, []);

  const employerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employers) {
      map.set(emp.name, emp.farbe || '#6b7280');
    }
    return map;
  }, [employers]);

  const selectedEmp = useMemo(
    () => employers.find((e) => e.name === selectedEmployer),
    [employers, selectedEmployer]
  );

  const employerEntries = useMemo(
    () => isAlleMode ? entries : entries.filter((e) => e.fuerWen === selectedEmployer),
    [entries, selectedEmployer, isAlleMode]
  );

  const modus = selectedEmp?.periodeModus || 'schuljahr';
  // In der Übersicht und im Alle-Modus gibt es keinen einzelnen Arbeitgeber;
  // dort gilt für Auswahl, Optionen und Banner einheitlich der Schuljahr-Modus.
  const uiModus = view === 'uebersicht' || isAlleMode ? 'schuljahr' : modus;
  const currentPeriodeKey = getPeriodeKey(todayISO(), uiModus).key;

  // Wählbare Perioden: Einträge des gewählten Arbeitgebers; in der
  // Übersicht und im Alle-Modus alle Einträge.
  const periodeOptions = useMemo(() => {
    const source = view === 'uebersicht' || isAlleMode ? entries : employerEntries;
    return getPeriodeOptions(source.map((e) => e.datum), uiModus);
  }, [entries, employerEntries, uiModus, view, isAlleMode]);

  // Eine Auswahl, die es in den aktuellen Optionen nicht gibt (z.B. nach
  // Arbeitgeberwechsel), fällt auf die aktuelle Periode zurück.
  const validSelectedKey =
    selectedPeriodeKey && periodeOptions.some((o) => o.key === selectedPeriodeKey)
      ? selectedPeriodeKey
      : null;
  const effectivePeriodeKey = validSelectedKey ?? currentPeriodeKey;
  const isCurrentPeriode = effectivePeriodeKey === currentPeriodeKey;

  const activeEntries = useMemo(() => {
    const range = periodeKeyToRange(effectivePeriodeKey, modus);
    return employerEntries.filter((e) => e.datum >= range.start && e.datum <= range.end);
  }, [employerEntries, effectivePeriodeKey, modus]);

  function openNewEntry(date?: string) {
    setEditEntry(null);
    setInitialDate(date);
    setShowEntryForm(true);
  }

  function handleSave(entry: TimeEntry) {
    if (editEntry) {
      // rechnungsnummer wird von der Abrechnungs-Seite verwaltet -> erhalten
      entry.rechnungsnummer = editEntry.rechnungsnummer;
      if (entry.abgerechnet !== editEntry.abgerechnet) {
        // abgerechnet wurde im Formular per Dropdown geändert -> bezahlt mitführen
        if (entry.abgerechnet) {
          entry.bezahlt = true;
          entry.bezahltVon = editEntry.bezahltVon || entry.fuerWen;
          entry.bezahltAm = editEntry.bezahltAm || entry.datum;
        } else {
          entry.bezahlt = false;
          entry.bezahltAm = undefined;
          entry.bezahltVon = undefined;
        }
      } else {
        // unverändert -> Abrechnungs-/Zahlungsfelder unangetastet übernehmen
        entry.bezahlt = editEntry.bezahlt;
        entry.bezahltAm = editEntry.bezahltAm;
        entry.bezahltVon = editEntry.bezahltVon;
      }
      update(entry);
    } else {
      // Auto-bill for employers with autoAbgerechnet (abgerechnet impliziert bezahlt)
      const emp = employers.find(e => e.name === entry.fuerWen);
      if (emp?.autoAbgerechnet) {
        entry.abgerechnet = true;
        entry.bezahlt = true;
        entry.bezahltVon = entry.fuerWen;
        entry.bezahltAm = entry.datum;
      }
      add(entry);
    }
    setEditEntry(null);
    setShowEntryForm(false);
  }

  function handleEdit(entry: TimeEntry) {
    setEditEntry(entry);
    setShowEntryForm(true);
  }

  function handleCancelEntry() {
    setEditEntry(null);
    setInitialDate(undefined);
    setShowEntryForm(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Error banner */}
      {error && (
        <div className="fixed top-4 right-4 z-[100] max-w-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
          <span className="text-sm flex-1">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 font-bold cursor-pointer shrink-0">
            &times;
          </button>
        </div>
      )}

      <Sidebar
        currentView={view}
        onNavigate={setView}
        onNewEntry={openNewEntry}
        onImport={() => setShowImport(true)}
        employers={employers}
        selectedEmployer={selectedEmployer}
        onSelectEmployer={setSelectedEmployer}
        periodeOptions={periodeOptions}
        selectedPeriodeKey={validSelectedKey}
        currentPeriodeKey={currentPeriodeKey}
        onSelectPeriode={setSelectedPeriodeKey}
        periodeSelectLabel={getPeriodeLabel(uiModus)}
        onLogout={abmelden}
      />

      <main className="flex-1 p-6 overflow-auto">
        {ersterStart ? (
          <Willkommen onNavigate={setView} />
        ) : (
        <>
        {!isCurrentPeriode && (view === 'uebersicht' || view === 'dashboard' || view === 'bericht') && (
          <PeriodeBanner
            modusLabel={getPeriodeLabel(uiModus)}
            label={periodeKeyToLabel(effectivePeriodeKey, uiModus)}
            onReset={() => setSelectedPeriodeKey(null)}
          />
        )}
        {view === 'uebersicht' && (
          <Uebersicht entries={entries} employers={employers} periodeKey={validSelectedKey} />
        )}
        {view === 'dashboard' && !isAlleMode && (
          <Dashboard
            key={selectedEmployer}
            entries={activeEntries}
            allEntries={employerEntries}
            onNewEntry={openNewEntry}
            onNavigate={setView}
            employer={selectedEmployer}
            employers={employers}
            periodeKey={effectivePeriodeKey}
            isCurrentPeriode={isCurrentPeriode}
            pensumMap={pensumMap}
          />
        )}
        {view === 'historie' && (
          <History
            key={selectedEmployer}
            entries={employerEntries}
            onEdit={handleEdit}
            onDelete={remove}
            onNewEntry={openNewEntry}
            employerColorMap={employerColorMap}
            showEmployerName={isAlleMode}
            periodeModus={selectedEmp?.periodeModus || 'schuljahr'}
          />
        )}
        {view === 'bericht' && !isAlleMode && (
          <Report
            key={selectedEmployer}
            entries={employerEntries}
            employer={selectedEmployer}
            employers={employers}
            periodeKey={effectivePeriodeKey}
            isCurrentPeriode={isCurrentPeriode}
            pensumMap={pensumMap}
          />
        )}
        {view === 'abrechnung' && !isAlleMode && (
          <AbrechnungPage
            key={selectedEmployer}
            entries={employerEntries}
            employer={selectedEmployer}
            employers={employers}
            onMarkAbgerechnet={markAbgerechnet}
            onMarkBezahlt={markBezahlt}
            onUnmarkBezahlt={unmarkBezahlt}
          />
        )}
        {view === 'archiv' && !isAlleMode && <Archiv key={selectedEmployer} entries={entries} employer={selectedEmployer} employers={employers} />}
        {view === 'einstellungen' && <EinstellungenPage />}
        {view === 'arbeitgeber' && (
          <ArbeitgeberPage
            employers={employers}
            onEmployersChange={handleEmployersChange}
            entries={entries}
            pensumMap={pensumMap}
            onPensumChange={setPensumMap}
          />
        )}
        </>
        )}
      </main>

      {/* Neuer Eintrag / Bearbeiten Modal */}
      {showEntryForm && (
        <EntryForm
          onSave={handleSave}
          onCancel={handleCancelEntry}
          editEntry={editEntry}
          employers={employers}
          initialDate={initialDate}
        />
      )}

      {showImport && (
        <ImportModal
          existingCount={entries.length}
          onImport={importEntries}
          onReplace={replaceAll}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
