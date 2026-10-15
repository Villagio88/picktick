import { Building2, Settings } from 'lucide-react';
import type { ViewMode } from '../types';

/** Erster Start ohne Arbeitgeber: erklärt die drei Schritte bis zum ersten Eintrag. */
export function Willkommen({ onNavigate }: { onNavigate: (v: ViewMode) => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Willkommen bei PickTick</h1>
        <p className="text-gray-600 mt-1">Zeiterfassung für PICTS und TICTS. Drei Schritte bis zum ersten Eintrag:</p>
      </div>
      <ol className="space-y-3">
        <li className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-900">1. Schule anlegen</div>
          <p className="text-sm text-gray-600 mt-1">
            Unter «Arbeitgeber» die Schule erfassen, «Sollzeit» aktivieren und Vollzeitstunden sowie Pensum oder
            Lektionen eintragen. Nebenaufträge mit Stundenlohn kommen auf dieselbe Seite.
          </p>
          <button onClick={() => onNavigate('arbeitgeber')} className="mt-3 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
            <Building2 className="w-4 h-4" /> Zu den Arbeitgebern
          </button>
        </li>
        <li className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-900">2. Leistungen anpassen</div>
          <p className="text-sm text-gray-600 mt-1">
            Unter «Einstellungen» die Leistungen deiner Schule festlegen und angeben, welche eher TICTS oder PICTS ist.
            Absender und Bank braucht es nur für Rechnungen.
          </p>
          <button onClick={() => onNavigate('einstellungen')} className="mt-3 inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
            <Settings className="w-4 h-4" /> Zu den Einstellungen
          </button>
        </li>
        <li className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-900">3. Erfassen</div>
          <p className="text-sm text-gray-600 mt-1">Mit «Neuer Eintrag» die erste Tätigkeit festhalten. Die Rolle schlägt PickTick aus den Leistungen vor.</p>
        </li>
      </ol>
    </div>
  );
}
