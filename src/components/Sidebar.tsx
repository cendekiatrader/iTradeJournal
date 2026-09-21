import React from 'react';
import { PanelLeftClose, PanelLeftOpen, TrendingUp, X } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { NavMenu } from './navigation/NavMenu';
import type { NavTab } from './navigation/navCatalog';

// Convenience re-exports so existing imports of `NavTab` / `NAV_META` from Sidebar keep working.
export type { NavTab } from './navigation/navCatalog';
export { NAV_META, NAV_MODULES, SETTINGS_MODULE } from './navigation/navCatalog';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  showCoaching?: boolean;
}

/**
 * Sidebar chrome only: brand header, collapse toggle, the navigation list (NavMenu)
 * and the read-only account card at the bottom. The menu itself lives in
 * ./navigation/NavMenu.tsx and the catalog in ./navigation/navCatalog.ts.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  showCoaching = false
}) => {
  const { activeAccount } = useJournal();

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
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
        {/* Sticky, viewport-height shell: the menu stays put while long pages scroll */}
        <div className="sidebar-inner">
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

            <NavMenu
              activeTab={activeTab}
              onSelectTab={handleSelect}
              isCollapsed={isCollapsed}
              showCoaching={showCoaching}
            />
          </div>

          {/* Account card (read-only status) */}
          <div className="sidebar-footer">
            {activeAccount && (
              <div
                title={isCollapsed ? `${activeAccount.name} (${activeAccount.type})` : undefined}
                style={{
                  background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: isCollapsed ? '10px 4px' : '12px',
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
        </div>
      </aside>
    </>
  );
};
