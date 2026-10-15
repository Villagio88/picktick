import { useState, useRef } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { importCsv } from '../utils/csv';
import type { TimeEntry } from '../types';

interface Props {
  onImport: (entries: TimeEntry[]) => void;
  onReplace: (entries: TimeEntry[]) => void;
  onClose: () => void;
  existingCount: number;
}

export function ImportModal({
  onImport,
  onReplace,
  onClose,
  existingCount,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TimeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setFile(f);
    setError('');
    setLoading(true);
    try {
      const entries = await importCsv(f);
      setPreview(entries);
    } catch (err) {
      setError(`Fehler beim Lesen der CSV: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="CSV Import">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">CSV Import</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors rounded-lg p-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Schliessen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!preview ? (
          <div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 focus-visible:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              role="button"
              tabIndex={0}
              aria-label="CSV-Datei auswählen oder hierher ziehen"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                CSV-Datei hierher ziehen oder klicken
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Liest den CSV-Export von PickTick
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-sm text-primary-800 font-medium">
                {preview.length} Einträge in "{file?.name}" gefunden
              </p>
            </div>

            {existingCount > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  Du hast bereits {existingCount} Einträge. Wähle, ob die
                  neuen Einträge hinzugefügt oder die bestehenden ersetzt
                  werden sollen.
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Wird verarbeitet...</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onImport(preview);
                    onClose();
                  }}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Hinzufügen
                </button>
                {existingCount > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Alle ${existingCount} bestehenden Einträge werden durch ${preview.length} neue ersetzt. Fortfahren?`
                        )
                      ) {
                        onReplace(preview);
                        onClose();
                      }
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    Ersetzen
                  </button>
                )}
                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors cursor-pointer"
                >
                  Zurück
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
