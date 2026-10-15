import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Einstellungen } from '../types';
import { STANDARD_EINSTELLUNGEN } from '../data/standard';
import { fetchEinstellungen, apiSaveEinstellungen } from '../utils/api';

interface Wert {
  einstellungen: Einstellungen;
  speichern: (neu: Einstellungen) => Promise<void>;
}

const Ctx = createContext<Wert>({
  einstellungen: STANDARD_EINSTELLUNGEN,
  speichern: async () => {},
});

export function EinstellungenProvider({ children }: { children: ReactNode }) {
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD_EINSTELLUNGEN);

  useEffect(() => {
    fetchEinstellungen()
      .then(setEinstellungen)
      .catch((err) => console.error('Einstellungen konnten nicht geladen werden:', err));
  }, []);

  const speichern = useCallback(async (neu: Einstellungen) => {
    setEinstellungen(await apiSaveEinstellungen(neu));
  }, []);

  return <Ctx.Provider value={{ einstellungen, speichern }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEinstellungen(): Wert {
  return useContext(Ctx);
}
