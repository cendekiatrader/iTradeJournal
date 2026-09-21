import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, 
  CalendarDays, 
  BookOpen, 
  BarChart3, 
  WalletCards, 
  Calculator, 
  PanelLeftClose, 
  PanelLeftOpen,
  TrendingUp,
  Flame,
  GraduationCap,
  BookMarked,
  LayoutGrid,
  Target,
  Settings as SettingsIcon,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { NAV_MODULES, getNavPrefs, subscribeNavPrefs, isTabVisible, isAdvancedModule, type NavPrefs } from '../utils/navPrefs';

export type NavTab = 'dashboard' | 'workspace' | 'calendar' | 'journal' | 'analytics' | 'playbook' | 'queue' | 'news' | 'accounts' | 'calculator' | 'coaching' | 'settings';

/** Label + icon for every navigation module. Order and tier come from NAV_MODULES. */
export const NAV_META: Record<NavTab, { label: string; icon: any }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  journal: { label: 'Trade Log', icon: BookOpen },
  calendar: { label: 'Calendar View', icon: CalendarDays },
  accounts: { label: 'Account Manager', icon: WalletCards },
  coaching: { label: 'Coaching', icon: GraduationCap },
  workspace: { label: 'Workspace', icon: LayoutGrid },
  analytics: { label: 'Analytics & Setups', icon: BarChart3 },
  playbook: { label: 'Playbook', icon: BookMarked },
  queue: { label: 'Setup Queue', icon: Target },
  news: { label: 'Economic Calendar', icon: Flame },
  calculator: { label: 'Position Size Calc', icon: Calculator },
  settings: { label: 'Settings', icon: SettingsIcon }
};

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  showCoaching?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onSelectTab, 
  isCollapsed, 
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  showCoaching = false
}) => {
  const { trades, playbooks, activeAccount } = useJournal();

  const [navPrefs, setNavPrefs] = useState<NavPrefs>(getNavPrefs);
  useEffect(() => subscribeNavPrefs(setNavPrefs), []);

  const badgeFor = (id: NavTab): number | null => {
    if (id === 'journal') return trades.length;
    if (id === 'playbook') return playbooks.length;
    return null;
  };

  // Progressive disclosure: only modules the user kept visible, in NAV_MODULES order.
  const navItems = NAV_MODULES
    .filter(m => isTabVisible(m.id, navPrefs))
    .filter(m => m.id !== 'coaching' || showCoaching)
    .map(m => ({
      id: m.id,
      isAdvanced: isAdvancedModule(m.id),
      label: NAV_META[m.id].label,
      icon: NAV_META[m.id].icon,
      badge: badgeFor(m.id)
    }));

  const settingsItem = {
    id: 'settings' as NavTab,
    label: NAV_META.settings.label,
    icon: NAV_META.settings.icon,
    badge: null as number | null
  };

  // Count only modules this surface could actually render (coaching is role-gated elsewhere).
  const hiddenCount = NAV_MODULES.filter(m => !isTabVisible(m.id, navPrefs) && (m.id !== 'coaching' || showCoaching)).length;

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavButton = (item: { id: NavTab; label: string; icon: any; badge: number | null; isAdvanced?: boolean }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item.id)}
        data-tour={`nav-${item.id}`}
        title={isCollapsed ? `${item.label} ${item.badge !== null ? `(${item.badge})` : ''}` : undefined}
        aria-current={isActive ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          width: '100%',
          padding: isCollapsed ? '10px 0' : '10px 12px',
          borderRadius: '10px',
          backgroundColor: isActive ? '#131b2e' : 'transparent',
          border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
          color: isActive ? 'var(--theme-secondary)' : 'var(--text-secondary)',
          fontSize: '0.875rem',
          fontWeight: isActive ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon size={19} color={isActive ? 'var(--theme-secondary-strong)' : 'var(--text-muted)'} />
          <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
        </div>

        {/* Badge (when expanded) */}
        {item.badge !== null && (
          <span className="sidebar-badge" style={{
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: isActive ? 'color-mix(in srgb, var(--theme-secondary-strong) 20%, transparent)' : 'var(--bg-chip)',
            color: isActive ? 'var(--theme-secondary)' : 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            {item.badge}
          </span>
        )}

        {/* Dot badge when collapsed */}
        {isCollapsed && item.badge !== null && (
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
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Navigation Header & List */}
        <div>
          {/* Mobile-only header with logo & close button */}
          <div className="sidebar-mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary-strong))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={18} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Desktop Top Header Row with Toggle Button */}
          <div className="sidebar-desktop-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0 0 14px 0' : '0 8px 12px 8px',
            borderBottom: '1px solid #141d2e',
            marginBottom: '12px'
          }}>
            {!isCollapsed && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                Menu Navigation
              </span>
            )}

            <button
              type="button"
              onClick={onToggleCollapse}
              className="btn btn-ghost btn-icon btn-sm"
              title={isCollapsed ? 'Expand Navigation Menu' : 'Collapse / Hide Navigation Menu'}
              aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
              aria-expanded={!isCollapsed}
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: '#0e1627',
                border: '1px solid #1c2a3f',
                color: isCollapsed ? 'var(--theme-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {navItems.map(renderNavButton)}
          </nav>

          {hiddenCount > 0 && !isCollapsed && (
            <button
              type="button"
              onClick={() => handleSelect('settings')}
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

        {/* Account Info Pill & Footer */}
        <div className="sidebar-footer">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
            {renderNavButton(settingsItem)}
          </nav>

          {activeAccount && (
            <div
              title={isCollapsed ? `${activeAccount.name} (${activeAccount.type})` : undefined}
              style={{
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: isCollapsed ? '10px 4px' : '12px',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCollapsed ? 'center' : 'stretch',
                textAlign: isCollapsed ? 'center' : 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px', marginBottom: isCollapsed ? '0' : '4px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: activeAccount.colorTag,
                  boxShadow: `0 0 8px ${activeAccount.colorTag}`
                }} />
                {!isCollapsed && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeAccount.name}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>Type</span>
                    <span style={{ color: 'var(--text-strong)' }}>{activeAccount.type}</span>
                  </div>
                  {activeAccount.targetProfit && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span>Profit Target</span>
                      <span style={{ color: 'var(--profit-green)', fontFamily: 'var(--font-mono)' }}>${activeAccount.targetProfit.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
