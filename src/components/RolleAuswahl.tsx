import { ROLLEN } from '../data/rollen';
import type { RolleWert } from '../data/rollen';

interface Props {
  value: string;
  onChange: (wert: RolleWert) => void;
  /** true, wenn der aktuelle Wert aus den Leistungen vorgeschlagen und noch nicht bestätigt ist */
  vorgeschlagen?: boolean;
  size?: 'sm' | 'lg';
}

/** Auswahl der Rolle: TICTS, PICTS, beides oder keine Angabe. */
export function RolleAuswahl({ value, onChange, vorgeschlagen = false, size = 'sm' }: Props) {
  const base = size === 'lg' ? 'min-h-[40px] px-3 py-2 text-sm' : 'px-3 py-1.5 text-xs';
  const optionen: { wert: RolleWert; label: string; farbe?: string; titel: string }[] = [
    ...ROLLEN.map((r) => ({ wert: r.wert, label: r.kurz, farbe: r.farbe, titel: r.lang })),
    { wert: '' as RolleWert, label: 'keine', titel: 'Keine Rolle angeben' },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rolle">
        {optionen.map((o) => {
          const aktiv = value === o.wert;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={aktiv}
              title={o.titel}
              onClick={() => onChange(o.wert)}
              className={`${base} rounded-full border font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                aktiv ? 'text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              } ${aktiv && vorgeschlagen ? 'opacity-70 border-dashed' : ''}`}
              style={aktiv ? { backgroundColor: o.farbe || '#6b7280', borderColor: o.farbe || '#6b7280' } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {vorgeschlagen && value && (
        <p className="text-xs text-gray-400 mt-1">Vorschlag aus den Leistungen, mit einem Klick bestätigen oder ändern.</p>
      )}
    </div>
  );
}
