import type { TimeEntry, Employer, Einstellungen } from '../types';

/** Meldet der App, dass die Sitzung abgelaufen ist; sie zeigt dann die Anmeldung. */
export const ABGEMELDET_EVENT = 'picktick:abgemeldet';

async function pruefe(res: Response, was: string): Promise<void> {
  if (res.status === 401) {
    window.dispatchEvent(new Event(ABGEMELDET_EVENT));
    throw new Error('Nicht angemeldet');
  }
  if (!res.ok) {
    // Meldung des Servers zeigen, falls vorhanden (etwa bei beschädigten Daten)
    let meldung = '';
    try { meldung = (await res.json())?.error ?? ''; } catch { /* keine JSON-Antwort */ }
    throw new Error(meldung ? `${meldung} (${res.status})` : `${was}: ${res.status}`);
  }
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  await pruefe(res, `GET ${url}`);
  return res.json();
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await pruefe(res, `POST ${url}`);
  return res.json();
}

async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await pruefe(res, `PUT ${url}`);
  return res.json();
}

async function del<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' });
  await pruefe(res, `DELETE ${url}`);
  return res.json();
}

// --- Entries ---

export function fetchEntries(): Promise<TimeEntry[]> {
  return get('/api/entries');
}

export function apiAddEntry(entry: TimeEntry): Promise<TimeEntry[]> {
  return post('/api/entries', entry);
}

export function apiUpdateEntry(entry: TimeEntry): Promise<TimeEntry[]> {
  return put(`/api/entries/${entry.id}`, entry);
}

export function apiDeleteEntry(id: string): Promise<TimeEntry[]> {
  return del(`/api/entries/${id}`);
}

export function apiReplaceAllEntries(entries: TimeEntry[]): Promise<TimeEntry[]> {
  return put('/api/entries', entries);
}

export function apiImportEntries(entries: TimeEntry[]): Promise<TimeEntry[]> {
  return post('/api/entries/import', entries);
}

export function apiMarkAbgerechnet(ids: string[], rechnungsnummer: string): Promise<TimeEntry[]> {
  return post('/api/entries/mark-abgerechnet', { ids, rechnungsnummer });
}

export function apiMarkBezahlt(rechnungsnummer: string, bezahltVon: string, bezahltAm: string): Promise<TimeEntry[]> {
  // bezahltVon ist der Auftraggeber; der Server filtert die Rechnung danach
  return post('/api/entries/mark-bezahlt', { rechnungsnummer, bezahltVon, bezahltAm, fuerWen: bezahltVon });
}

export function apiUnmarkBezahlt(rechnungsnummer: string, fuerWen: string): Promise<TimeEntry[]> {
  return post('/api/entries/unmark-bezahlt', { rechnungsnummer, fuerWen });
}

// --- Employers ---

export function fetchEmployers(): Promise<Employer[]> {
  return get('/api/employers');
}

export function apiAddEmployer(employer: Partial<Employer> & { name: string }): Promise<Employer[]> {
  return post('/api/employers', employer);
}

export function apiUpdateEmployer(name: string, updates: Partial<Omit<Employer, 'name'>>): Promise<Employer[]> {
  return put(`/api/employers/${encodeURIComponent(name)}`, updates);
}

export function apiDeleteEmployer(name: string): Promise<Employer[]> {
  return del(`/api/employers/${encodeURIComponent(name)}`);
}

// --- Pensum-Historie ---

export function fetchPensum(): Promise<Record<string, number>> {
  return get('/api/pensum');
}

export function apiSavePensum(label: string, lektionen: number): Promise<Record<string, number>> {
  return put(`/api/pensum/${encodeURIComponent(label)}`, { lektionen });
}

// --- Invoice ---

export async function apiGenerateRechnungsnummer(employer: string): Promise<string> {
  const result = await post<{ nummer: string }>('/api/invoice/generate-nummer', { employer });
  return result.nummer;
}

// --- Einstellungen ---

export function fetchEinstellungen(): Promise<Einstellungen> {
  return get('/api/settings');
}

export function apiSaveEinstellungen(e: Einstellungen): Promise<Einstellungen> {
  return put('/api/settings', e);
}

// --- Anmeldung ---

export interface AuthStatus {
  anmeldungNoetig: boolean;
  angemeldet: boolean;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/status');
  if (!res.ok) throw new Error(`Status: ${res.status}`);
  return res.json();
}

export async function apiLogin(passwort: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwort }),
  });
  if (res.status === 401) throw new Error('Passwort falsch');
  if (res.status === 429) throw new Error('Zu viele Versuche, bitte später nochmals');
  if (!res.ok) throw new Error(`Anmeldung fehlgeschlagen: ${res.status}`);
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
}
