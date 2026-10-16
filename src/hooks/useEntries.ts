import { useState, useCallback, useEffect } from 'react';
import type { TimeEntry } from '../types';
import {
  fetchEntries,
  apiAddEntry,
  apiUpdateEntry,
  apiDeleteEntry,
  apiReplaceAllEntries,
  apiImportEntries,
  apiMarkAbgerechnet,
  apiMarkBezahlt,
  apiUnmarkBezahlt,
} from '../utils/api';

export function useEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .catch((err) => setError(`Laden fehlgeschlagen: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (entry: TimeEntry) => {
    try {
      setEntries(await apiAddEntry(entry));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Eintrag konnte nicht erstellt werden: ${msg}`);
    }
  }, []);

  const update = useCallback(async (entry: TimeEntry) => {
    try {
      setEntries(await apiUpdateEntry(entry));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Eintrag konnte nicht aktualisiert werden: ${msg}`);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      setEntries(await apiDeleteEntry(id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Eintrag konnte nicht gelöscht werden: ${msg}`);
    }
  }, []);

  const importEntries = useCallback(async (newEntries: TimeEntry[]) => {
    try {
      setEntries(await apiImportEntries(newEntries));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Import fehlgeschlagen: ${msg}`);
    }
  }, []);

  const replaceAll = useCallback(async (newEntries: TimeEntry[]) => {
    try {
      setEntries(await apiReplaceAllEntries(newEntries));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Ersetzen fehlgeschlagen: ${msg}`);
    }
  }, []);

  const markAbgerechnet = useCallback(async (ids: string[], rechnungsnummer: string) => {
    try {
      setEntries(await apiMarkAbgerechnet(ids, rechnungsnummer));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Abrechnung fehlgeschlagen: ${msg}`);
    }
  }, []);

  const markBezahlt = useCallback(async (rechnungsnummer: string, bezahltVon: string, bezahltAm: string) => {
    try {
      setEntries(await apiMarkBezahlt(rechnungsnummer, bezahltVon, bezahltAm));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Bezahlt-Markierung fehlgeschlagen: ${msg}`);
    }
  }, []);

  const unmarkBezahlt = useCallback(async (rechnungsnummer: string, fuerWen: string) => {
    try {
      setEntries(await apiUnmarkBezahlt(rechnungsnummer, fuerWen));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Zurücksetzen fehlgeschlagen: ${msg}`);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { entries, loading, error, clearError, add, update, remove, importEntries, replaceAll, markAbgerechnet, markBezahlt, unmarkBezahlt };
}
