import { Home, Plus, List, MoreHorizontal } from 'lucide-react';
import type { MobileTab } from './MobileApp';

interface Props {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
}

const TABS: { id: MobileTab; label: string; icon: typeof Home }[] = [
  { id: 'heute', label: 'Heute', icon: Home },
  { id: 'neu', label: 'Neu', icon: Plus },
  { id: 'historie', label: 'Historie', icon: List },
  { id: 'mehr', label: 'Mehr', icon: MoreHorizontal },
];

export function MobileBottomNav({ tab, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 grid grid-cols-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = tab === t.id;
        const isAction = t.id === 'neu';
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              isActive
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700 active:text-gray-900'
            }`}
            aria-label={t.label}
          >
            {isAction ? (
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-full -mt-1 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium leading-none">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
