import { useState } from 'react';
import { apiLogin } from '../utils/api';

/** Anmeldemaske, wenn die Instanz mit PICKTICK_PASSWORT läuft. */
export function Anmeldung({ onAngemeldet }: { onAngemeldet: () => void }) {
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFehler('');
    setLaeuft(true);
    try {
      await apiLogin(passwort);
      onAngemeldet();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PickTick</h1>
          <p className="text-sm text-gray-500">Zeiterfassung für PICTS und TICTS</p>
        </div>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Passwort</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        {fehler && <p className="text-sm text-red-700" role="alert">{fehler}</p>}
        <button
          type="submit"
          disabled={laeuft || !passwort}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-medium cursor-pointer disabled:cursor-not-allowed"
        >
          Anmelden
        </button>
      </form>
    </div>
  );
}
