import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BookOpen, 
  BarChart3, 
  WalletCards, 
  Calculator, 
  PanelLeftClose, 
  PanelLeftOpen,
  Check,
  X,
  TrendingUp
} from 'lucide-react';
import { useJournal } from '../context/JournalContext';

export type NavTab = 'dashboard' | 'calendar' | 'journal' | 'analytics' | 'accounts' | 'calculator';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onSelectTab, 
  isCollapsed, 
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { trades, activeAccount } = useJournal();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'calendar', label: 'Calendar View', icon: CalendarDays, badge: null },
    { id: 'journal', label: 'Trade Log', icon: BookOpen, badge: trades.length },
    { id: 'analytics', label: 'Analytics & Setups', icon: BarChart3, badge: null },
    { id: 'accounts', label: 'Account Manager', icon: WalletCards, badge: null },
    { id: 'calculator', label: 'Position Size Calc', icon: Calculator, badge: 'PRO' }
  ];

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
        {/* Navigation Header & List */}
        <div>
          {/* Mobile-only header with logo & close button */}
          <div className="sidebar-mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={18} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: '#94a3b8' }}
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
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: '#0e1627',
                border: '1px solid #1c2a3f',
                color: isCollapsed ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id as NavTab)}
                  title={isCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    width: '100%',
                    padding: isCollapsed ? '10px 0' : '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#131b2e' : 'transparent',
                    border: isActive ? '1px solid #233148' : '1px solid transparent',
                    color: isActive ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={19} color={isActive ? '#3b82f6' : '#64748b'} />
                    <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  </div>

                  {/* Badge (when expanded) */}
                  {item.badge !== null && (
                    <span className="sidebar-badge" style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                      color: isActive ? '#60a5fa' : '#94a3b8',
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
                      backgroundColor: '#3b82f6'
                    }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Info Pill & Footer */}
        <div className="sidebar-footer">
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeAccount.name}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>Type</span>
                    <span style={{ color: '#cbd5e1' }}>{activeAccount.type}</span>
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
