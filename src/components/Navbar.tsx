import React, { useState, useRef, useEffect } from 'react';
import { useJournal } from '../context/JournalContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { 
  TrendingUp,
  Plus, 
  ChevronDown, 
  Layers, 
  Check, 
  LogIn,
  Menu,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import { AuthModal, AuthMode } from './auth/AuthModal';
import { NotificationCenter } from './common/NotificationCenter';

interface NavbarProps {
  onOpenTradeModal: () => void;
  onOpenAccountModal: () => void;
  onOpenMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenTradeModal, 
  onOpenAccountModal,
  onOpenMobileMenu,
  onOpenCommandPalette
}) => {
  const { 
    accounts, 
    activeAccountId, 
    activeAccount, 
    setActiveAccountId,
    isStealthMode,
    toggleStealthMode
  } = useJournal();

  const { user } = useAuth();

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  const accountRef = useRef<HTMLDivElement>(null);

  const totalPortfolioBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  // Close the account dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-navbar" style={{
      height: '64px',
      backgroundColor: 'var(--bg-nav)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '12px'
    }}>
      {/* Left: Brand Logo & Mobile Menu */}
      <div className="navbar-left-group" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="mobile-only-btn btn btn-ghost btn-icon btn-sm"
            title="Open Menu Navigation"
            aria-label="Open navigation menu"
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: '#0d1527',
              border: '1px solid #1e2c44',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary-strong))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <TrendingUp size={20} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div className="navbar-logo-text">
            <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
            </span>
          </div>
        </div>

        <div className="navbar-divider" style={{ width: '1px', height: '24px', backgroundColor: 'var(--bg-chip)', flexShrink: 0 }} />
      </div>

      {/* Right: User Profile (with integrated Data/Export & Shortcuts) & + Log Trade */}
      <div className="navbar-right-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
        
        {/* Signed-out visitors get a Sign In entry here; signed-in users reach their account
            through the Settings tab (sidebar item, S shortcut or the command palette). */}
        {!user && (
          <button
            onClick={() => {
              setAuthMode('signin');
              setAuthModalOpen(true);
            }}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0e1628',
              borderColor: '#243750',
              color: 'var(--theme-secondary)',
              fontWeight: 600
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}

        {/* Command Palette Trigger (Ctrl+K) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="btn btn-secondary btn-sm hide-on-mobile"
            aria-label="Open command palette"
            title="Command palette (Ctrl+K)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', padding: '7px 10px' }}
          >
            <Search size={15} />
            <kbd className="kbd-hint">ctrl K</kbd>
          </button>
        )}

        {/* Notification Center (risk alerts + mentor feedback) */}
        <NotificationCenter />

        {/* Stealth / Privacy Toggle Button */}
        <button
          type="button"
          onClick={toggleStealthMode}
          className="btn btn-secondary btn-icon btn-sm navbar-stealth-btn"
          title={isStealthMode ? 'Show Balance (Stealth Mode Active)' : 'Hide Balance (Stealth Mode)'}
          aria-label={isStealthMode ? 'Show balances (stealth mode is on)' : 'Hide balances (stealth mode)'}
          aria-pressed={isStealthMode}
          style={{
            backgroundColor: isStealthMode ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-panel)',
            borderColor: isStealthMode ? '#ef4444' : 'var(--bg-chip)',
            color: isStealthMode ? '#f87171' : 'var(--text-secondary)',
            padding: '7px 10px'
          }}
        >
          {isStealthMode ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {/* Primary Action: Log Trade Button */}
        <button
          onClick={onOpenTradeModal}
          data-tour="log-trade"
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hide-on-mobile">Log Trade</span>
          <kbd className="kbd-hint hide-on-mobile" style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>N</kbd>
        </button>
      </div>

      {/* Account Selector (Single-Line Compact) */}
      <div ref={accountRef} className="navbar-account-switcher" style={{ position: 'relative' }}>
        <button
          onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
          aria-haspopup="menu"
          aria-expanded={accountDropdownOpen}
          aria-label={`Select trading account (current: ${activeAccount ? activeAccount.name : 'All Accounts'})`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--bg-chip)',
            padding: '6px 12px',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: activeAccount?.colorTag || 'var(--theme-secondary-strong)',
            boxShadow: `0 0 6px ${activeAccount?.colorTag || 'var(--theme-secondary-strong)'}`
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeAccount ? activeAccount.name : 'All Accounts'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--profit-green)', fontWeight: 700 }}>
              {activeAccount 
                ? formatCurrency(activeAccount.currentBalance, activeAccount.currency, true)
                : formatCurrency(totalPortfolioBalance, 'USD', true)}
            </span>
          </div>
          <ChevronDown size={14} color="var(--text-secondary)" />
        </button>

        {/* Account Dropdown Menu */}
        {accountDropdownOpen && (
          <div
            className="navbar-account-menu"
            style={{
              position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '300px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            padding: '8px',
            zIndex: 200,
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Select Trading Portfolio
            </div>

            {/* All Accounts Option */}
            <button
              onClick={() => {
                setActiveAccountId('all');
                setAccountDropdownOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: activeAccountId === 'all' ? 'var(--bg-chip)' : 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--theme-secondary-strong)" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>All Accounts (Portfolio)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Combined analytics & metrics</div>
                </div>
              </div>
              {activeAccountId === 'all' && <Check size={14} color="var(--theme-secondary-strong)" />}
            </button>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

            {/* Individual Accounts List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setActiveAccountId(acc.id);
                    setAccountDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: activeAccountId === acc.id ? '#1a2336' : 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '2px',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: acc.colorTag
                    }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {acc.broker} • {acc.type}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--profit-green)' }}>
                      {formatCurrency(acc.currentBalance, acc.currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

            {/* Add New Account Button */}
            <button
              onClick={() => {
                setAccountDropdownOpen(false);
                onOpenAccountModal();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 12%, transparent)',
                color: 'var(--theme-secondary)',
                border: '1px dashed var(--theme-secondary-strong)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Add New Account
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal (signed-out visitors only - profile/theme/shortcut modals moved to Settings) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  );
};
