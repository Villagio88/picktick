import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TimeEntry, Employer } from '../../types';
import { useEntries } from '../../hooks/useEntries';
import { fetchEmployers } from '../../utils/api';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeute } from './MobileHeute';
import { MobileNeu } from './MobileNeu';
import { MobileHistorie } from './MobileHistorie';
import { MobileMehr } from './MobileMehr';
import { gueltigeAuswahl } from '../../utils/arbeitgeberWahl';
import { zumSpeichern } from '../../utils/eintragSpeichern';

export type MobileTab = 'heute' | 'neu' | 'historie' | 'mehr';

const MOBILE_TAB_KEY = 'zeiterfassung-mobile-tab';
const EMPLOYER_KEY = 'picktick-arbeitgeber';

function loadPersistedTab(): MobileTab {
  const v = localStorage.getItem(MOBILE_TAB_KEY);
  if (v === 'heute' || v === 'neu' || v === 'historie' || v === 'mehr') return v;
  return 'heute';
}

function loadPersistedEmployer(): string {
  return localStorage.getItem(EMPLOYER_KEY) || '';
}

export function MobileApp() {
  const [tab, setTabState] = useState<MobileTab>(loadPersistedTab);
  const [selectedEmployer, setSelectedEmployerState] = useState(loadPersistedEmployer);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employersGeladen, setEmployersGeladen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const { entries, loading, error, clearError, add, update, remove } = useEntries();

  useEffect(() => {
    fetchEmployers()
      .then((liste) => {
        setEmployers(liste);
        setEmployersGeladen(true);
        setSelectedEmployerState((bisher) => gueltigeAuswahl(bisher, liste));
      })
      .catch((err) => console.error('Arbeitgeber laden:', err));
  }, []);

  const setTab = useCallback((t: MobileTab) => {
    setTabState(t);
    localStorage.setItem(MOBILE_TAB_KEY, t);
    if (t !== 'neu') setEditEntry(null);
  }, []);

  const setSelectedEmployer = useCallback((name: string) => {
    setSelectedEmployerState(name);
    localStorage.setItem(EMPLOYER_KEY, name);
  }, []);

  const employerEntries = useMemo(
    () => selectedEmployer === '__alle__'
      ? entries
      : entries.filter((e) => e.fuerWen === selectedEmployer),
    [entries, selectedEmployer]
  );

  const handleSave = (entry: TimeEntry) => {
    const fertig = zumSpeichern(entry, editEntry, employers);
    if (editEntry) update(fertig);
    else add(fertig);
    setEditEntry(null);
    setTab('heute');
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditEntry(entry);
    setTab('neu');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Lade Daten…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {error && (
        <div className="fixed top-3 left-3 right-3 z-[100] bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg shadow-lg flex items-start gap-2">
          <span className="text-xs flex-1">{error}</span>
          <button onClick={clearError} className="text-red-400 font-bold shrink-0">&times;</button>
        </div>
      )}

      {/* Content (Bottom-Padding für Tab-Nav) */}
      <main className="flex-1 pb-20">
        {employersGeladen && employers.length === 0 && (
          <div className="m-4 p-4 bg-white rounded-xl border border-gray-200">
            <div className="font-semibold text-gray-900">Willkommen bei PickTick</div>
            <p className="text-sm text-gray-600 mt-1">
              Lege zuerst am Computer unter «Arbeitgeber» deine Schule an und passe unter «Einstellungen» die Leistungen an.
              Danach kannst du hier unterwegs erfassen.
            </p>
          </div>
        )}
        {tab === 'heute' && (
          <MobileHeute
            entries={employerEntries}
            allEntries={entries}
            employer={selectedEmployer}
            employers={employers}
            onEdit={handleEdit}
            onDelete={remove}
            onNewEntry={() => { setEditEntry(null); setTab('neu'); }}
            onSwitchEmployer={setSelectedEmployer}
          />
        )}
        {tab === 'neu' && (
          <MobileNeu
            key={editEntry?.id ?? "neu"}
            employers={employers}
            selectedEmployer={selectedEmployer}
            editEntry={editEntry}
            onSave={handleSave}
            onCancel={() => { setEditEntry(null); setTab('heute'); }}
          />
        )}
        {tab === 'historie' && (
          <MobileHistorie
            entries={employerEntries}
            employers={employers}
            employer={selectedEmployer}
            onEdit={handleEdit}
            onDelete={remove}
          />
        )}
        {tab === 'mehr' && (
          <MobileMehr
            employers={employers}
            selectedEmployer={selectedEmployer}
            onSelectEmployer={setSelectedEmployer}
            entriesCount={entries.length}
          />
        )}
      </main>

      <MobileBottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
