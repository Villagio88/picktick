import { useEffect, useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { fetchAuthStatus, apiLogout, ABGEMELDET_EVENT } from '../utils/api';
import { Anmeldung } from './Anmeldung';
import { EinstellungenProvider } from '../hooks/useEinstellungen';

const AbmeldenCtx = createContext<(() => void) | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAbmelden(): (() => void) | undefined {
  return useContext(AbmeldenCtx);
}

/** Zeigt die Anmeldung, solange die Instanz eine verlangt und keine Sitzung besteht. */
export function Zugang({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<{ noetig: boolean; angemeldet: boolean } | null>(null);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    let aktiv = true;
    fetchAuthStatus()
      .then((s) => { if (aktiv) setStatus({ noetig: s.anmeldungNoetig, angemeldet: s.angemeldet }); })
      .catch((err) => { if (aktiv) setFehler(err instanceof Error ? err.message : String(err)); });
    const abgemeldet = () => setStatus((s) => (s ? { ...s, angemeldet: false } : s));
    window.addEventListener(ABGEMELDET_EVENT, abgemeldet);
    return () => { aktiv = false; window.removeEventListener(ABGEMELDET_EVENT, abgemeldet); };
  }, []);

  if (fehler) return <p className="p-6 text-red-700">Server nicht erreichbar: {fehler}</p>;
  if (!status) return null;
  if (status.noetig && !status.angemeldet) {
    return <Anmeldung onAngemeldet={() => setStatus({ noetig: true, angemeldet: true })} />;
  }

  const abmelden = status.noetig
    ? () => { apiLogout().finally(() => setStatus({ noetig: true, angemeldet: false })); }
    : undefined;

  return (
    <AbmeldenCtx.Provider value={abmelden}>
      <EinstellungenProvider>{children}</EinstellungenProvider>
    </AbmeldenCtx.Provider>
  );
}
