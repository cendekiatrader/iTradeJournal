import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useJournal } from '../../context/JournalContext';
import { NAV_MODULES, SETTINGS_MODULE, type NavTab } from './navCatalog';
import { isAdvancedTab, isTabVisible, useNavPrefs } from '../../utils/navPrefs';

interface NavMenuProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  showCoaching?: boolean;
}

interface NavMenuButtonProps {
  id: NavTab;
  label: string;
  icon: any;
  badge: number | null;
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: () => void;
}

const NavMenuButton: React.FC<NavMenuButtonProps> = ({ id, label, icon: Icon, badge, isActive, isCollapsed, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    data-tour={`nav-${id}`}
    title={isCollapsed ? `${label} ${badge !== null ? `(${badge})` : ''}` : undefined}
    aria-current={isActive ? 'page' : undefined}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'space-between',
      width: '100%',
      padding: isCollapsed ? '10px 0' : '10px 12px',
      borderRadius: '10px',
      backgroundColor: isActive ? 'var(--bg-main)' : 'transparent',
      boxShadow: isActive ? 'var(--neo-inset)' : 'none',
      border: 'none',
      color: isActive ? 'var(--theme-secondary)' : 'var(--text-secondary)',
      fontSize: '0.875rem',
      fontWeight: isActive ? 600 : 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      textAlign: 'left',
      position: 'relative'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
      <Icon size={19} color={isActive ? 'var(--theme-secondary-strong)' : 'var(--text-muted)'} />
      <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </div>

    {badge !== null && (
      <span className="sidebar-badge" style={{
        fontSize: '0.68rem',
        fontFamily: 'var(--font-mono)',
        backgroundColor: isActive ? 'var(--bg-main)' : 'var(--bg-main)',
        boxShadow: isActive ? 'var(--neo-inset-sm)' : 'none',
        color: isActive ? 'var(--theme-secondary)' : 'var(--text-secondary)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 700
      }}>
        {badge}
      </span>
    )}

    {isCollapsed && badge !== null && (
      <span style={{
        position: 'absolute',
        top: '6px',
        right: '12px',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--theme-secondary-strong)'
      }} />
    )}
  </button>
);

/**
 * The whole navigation list - modules, a divider, then Settings - plus the hint that
 * tells the user how many advanced modules are hidden. Exported on its own so the
 * menu UI lives apart from the sidebar chrome (logo, collapse toggle, account footer).
 */
export const NavMenu: React.FC<NavMenuProps> = ({ activeTab, onSelectTab, isCollapsed, showCoaching = false }) => {
  const { trades, playbooks } = useJournal();
  const navPrefs = useNavPrefs();

  const badgeFor = (id: NavTab): number | null => {
    if (id === 'journal') return trades.length;
    if (id === 'playbook') return playbooks.length;
    return null;
  };

  const items = NAV_MODULES
    .filter(m => isTabVisible(m.id, navPrefs))
    .filter(m => m.id !== 'coaching' || showCoaching);

  const hiddenCount = NAV_MODULES.filter(
    m => !isTabVisible(m.id, navPrefs) && (m.id !== 'coaching' || showCoaching)
  ).length;

  return (
    <div>
      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {items.map(m => (
          <NavMenuButton
            key={m.id}
            id={m.id}
            label={m.label}
            icon={m.icon}
            badge={badgeFor(m.id)}
            isActive={activeTab === m.id}
            isCollapsed={isCollapsed}
            onSelect={() => onSelectTab(m.id)}
          />
        ))}

        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '8px 4px' }} />

        <NavMenuButton
          id={SETTINGS_MODULE.id}
          label={SETTINGS_MODULE.label}
          icon={SETTINGS_MODULE.icon}
          badge={null}
          isActive={activeTab === SETTINGS_MODULE.id}
          isCollapsed={isCollapsed}
          onSelect={() => onSelectTab(SETTINGS_MODULE.id)}
        />
      </nav>

      {hiddenCount > 0 && !isCollapsed && (
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          title="Some modules are hidden - manage them in Settings"
          style={{
            marginTop: '10px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: 'transparent',
            border: '1px dashed #1e2c44',
            color: 'var(--text-muted)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <SlidersHorizontal size={14} />
          <span>{hiddenCount} module{hiddenCount > 1 ? 's' : ''} hidden · show in Settings</span>
        </button>
      )}
    </div>
  );
};

/** Modules flagged advanced get an extra marker in Settings; exported for reuse. */
export const isAdvancedModuleId = isAdvancedTab;
