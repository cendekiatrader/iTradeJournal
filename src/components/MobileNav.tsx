import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { NAV_META, NAV_MODULES, type NavTab } from './navigation/navCatalog';
import { getNavPrefs, subscribeNavPrefs, isTabVisible, type NavPrefs } from '../utils/navPrefs';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenTradeModal: () => void;
}

/** Preferred bottom-bar slots, in order. Hidden modules are skipped, next ones take their place. */
const MOBILE_ORDER: NavTab[] = ['dashboard', 'journal', 'accounts', 'calendar'];

const SLOTS = 4;

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab, onOpenTradeModal }) => {
  const [navPrefs, setNavPrefs] = useState<NavPrefs>(getNavPrefs);
  useEffect(() => subscribeNavPrefs(setNavPrefs), []);

  const visible = (id: NavTab) => isTabVisible(id, navPrefs) && id !== 'coaching' && id !== 'settings';

  const items = [
    ...MOBILE_ORDER.filter(visible),
    ...NAV_MODULES.map(m => m.id).filter(id => !MOBILE_ORDER.includes(id) && visible(id))
  ].slice(0, SLOTS);

  const [left, right] = [items.slice(0, 2), items.slice(2)];

  const renderItem = (id: NavTab) => {
    const isActive = activeTab === id;
    const Icon = NAV_META[id].icon;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelectTab(id)}
        aria-label={NAV_META[id].label}
        aria-current={isActive ? 'page' : undefined}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isActive ? 'var(--theme-secondary)' : 'var(--text-muted)',
          fontSize: '0.62rem',
          fontWeight: 700,
          padding: '6px 0'
        }}
      >
        <Icon size={20} />
        {NAV_META[id].label.split(' ')[0]}
      </button>
    );
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {left.map(renderItem)}

      <button
        type="button"
        onClick={onOpenTradeModal}
        aria-label="Log new trade"
        className="mobile-fab"
      >
        <Plus size={22} strokeWidth={2.6} />
      </button>

      {right.map(renderItem)}
    </nav>
  );
};
