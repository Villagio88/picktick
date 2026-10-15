import { useEinstellungen } from '../hooks/useEinstellungen';
import { parseLeistungen, joinLeistungen } from '../utils/format';

interface Props {
  /** Feldwert wie gespeichert («A, B»). */
  value: string;
  onChange: (value: string) => void;
  /** Grössere Chips für Touch (Mobil). */
  size?: 'sm' | 'lg';
}

/**
 * Mehrfachauswahl der Leistungen als anklickbare Chips. Werte, die der Eintrag bereits
 * trägt, aber nicht (mehr) in der Liste der Einstellungen stehen (alte Importe wie «Mail»), bleiben
 * als zusätzliche Chips erhalten, damit beim Bearbeiten nichts verloren geht.
 */
export function LeistungChips({ value, onChange, size = 'sm' }: Props) {
  const LEISTUNGEN = useEinstellungen().einstellungen.leistungen.map((l) => l.name);
  const gewaehlt = parseLeistungen(value);
  const extra = gewaehlt.filter((l) => !LEISTUNGEN.includes(l));
  const optionen = [...LEISTUNGEN, ...extra];

  function toggle(l: string) {
    const neu = gewaehlt.includes(l) ? gewaehlt.filter((x) => x !== l) : [...gewaehlt, l];
    onChange(joinLeistungen(neu));
  }

  const base = size === 'lg'
    ? 'min-h-[40px] px-3 py-2 text-sm'
    : 'px-2.5 py-1 text-xs';

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Leistungen">
      {optionen.map((l) => {
        const aktiv = gewaehlt.includes(l);
        return (
          <button
            key={l}
            type="button"
            onClick={() => toggle(l)}
            aria-pressed={aktiv}
            className={`${base} rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              aktiv
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
