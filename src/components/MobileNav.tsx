import React from 'react';
import { LayoutDashboard, BookOpen, BarChart3, Target, Plus } from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenTradeModal: () => void;
}

const ITEMS: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'journal', label: 'Journal', icon: <BookOpen size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: 'queue', label: 'Queue', icon: <Target size={20} /> }
];

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab, onOpenTradeModal }) => {
  const [left, right] = [ITEMS.slice(0, 2), ITEMS.slice(2)];

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id)}
        aria-label={item.label}
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
        {item.icon}
        {item.label}
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
