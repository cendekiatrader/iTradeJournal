import React, { useState, useRef, useEffect } from 'react';
import { useJournal } from '../context/JournalContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';
import { 
  TrendingUp,
  Plus, 
  ChevronDown, 
  Download, 
  Upload, 
  Trash2, 
  Layers, 
  Check, 
  User as UserIcon,
  LogOut,
  LogIn,
  FileSpreadsheet,
  FileJson,
  Palette,
  Globe,
  Keyboard,
  Menu,
  Eye,
  EyeOff
} from 'lucide-react';
import { AuthModal, AuthMode } from './auth/AuthModal';
import { ThemeSelectorModal } from './common/ThemeSelectorModal';
import { ProfileSettingsModal } from './profile/ProfileSettingsModal';
import { KeyboardShortcutsModal } from './common/KeyboardShortcutsModal';

interface NavbarProps {
  onOpenTradeModal: () => void;
  onOpenAccountModal: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenTradeModal, 
  onOpenAccountModal,
  onOpenMobileMenu 
}) => {
  const { 
    accounts, 
    activeAccountId, 
    activeAccount, 
    setActiveAccountId,
    filteredTrades,
    trades,
    withdrawals,
    importData,
    resetAllData,
    isStealthMode,
    toggleStealthMode,
    showToast
  } = useJournal();

  const { user, signOut } = useAuth();
  const { theme, activeThemeOption } = useTheme();

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPortfolioBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = () => {
    if (filteredTrades.length === 0) {
      showToast('No trades to export', 'error');
      return;
    }

    const headers = [
      'ID', 'Account', 'Symbol', 'Asset Class', 'Direction', 'Status',
      'Entry Date', 'Exit Date', 'Timeframe', 'Entry Price', 'Exit Price',
      'Stop Loss', 'Take Profit', 'Quantity', 'PnL ($)', 'PnL (%)', 'Pips',
      'R:R Planned', 'R:R Achieved', 'Session', 'Setup', 'Emotion', 'Rules Followed',
      'Confluences', 'Notes', 'Lessons'
    ];

    const rows = filteredTrades.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      return [
        t.id,
        acc ? acc.name : t.accountId,
        t.symbol,
        t.assetClass,
        t.direction,
        t.status,
        t.entryDate,
        t.exitDate || '',
        t.timeframe,
        t.entryPrice,
        t.exitPrice || '',
        t.stopLoss || '',
        t.takeProfit || '',
        t.quantity,
        t.pnl,
        t.pnlPercent,
        t.pips || '',
        t.rrPlanned || '',
        t.rrAchieved || '',
        t.session,
        `"${(t.setup || '').replace(/"/g, '""')}"`,
        t.emotion,
        t.rulesFollowed ? 'YES' : 'NO',
        `"${(t.confluences || []).join('; ').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${(t.lessons || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `itrade-journal-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setUserDropdownOpen(false);
    showToast(`Exported ${filteredTrades.length} trades to CSV!`, 'success');
  };

  const handleExportJSON = () => {
    const backupData = {
      accounts,
      trades,
      withdrawals,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `itrade-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setUserDropdownOpen(false);
    showToast('Data backup JSON berhasil diunduh!', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importData(json);
        setUserDropdownOpen(false);
      } catch (err) {
        showToast('Invalid JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="app-navbar" style={{
      height: '64px',
      backgroundColor: '#080c1b',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '12px'
    }}>
      {/* Left: Brand Logo & Mobile Menu & Account Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="mobile-only-btn btn btn-ghost btn-icon btn-sm"
            title="Open Menu Navigation"
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: '#0d1527',
              border: '1px solid #1e2c44',
              color: '#94a3b8',
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
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <TrendingUp size={20} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div className="navbar-logo-text">
            <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc', whiteSpace: 'nowrap' }}>
              iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#1e293b' }} />

        {/* Account Selector (Single-Line Compact) */}
        <div ref={accountRef} className="navbar-account-switcher" style={{ position: 'relative' }}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0c1222',
              border: '1px solid #1e293b',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeAccount?.colorTag || '#3b82f6',
              boxShadow: `0 0 6px ${activeAccount?.colorTag || '#3b82f6'}`
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeAccount ? activeAccount.name : 'All Accounts'}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--profit-green)', fontWeight: 700 }}>
                {activeAccount 
                  ? formatCurrency(activeAccount.currentBalance, activeAccount.currency, true)
                  : formatCurrency(totalPortfolioBalance, 'USD', true)}
              </span>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </button>

          {/* Account Dropdown Menu */}
          {accountDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '300px',
              backgroundColor: '#0c1222',
              border: '1px solid #233148',
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
                  backgroundColor: activeAccountId === 'all' ? '#1e293b' : 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>All Accounts (Portfolio)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Combined analytics & metrics</div>
                  </div>
                </div>
                {activeAccountId === 'all' && <Check size={14} color="#3b82f6" />}
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
                      color: '#f8fafc',
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
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#60a5fa',
                  border: '1px dashed #3b82f6',
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
      </div>

      {/* Right: User Profile (with integrated Data/Export & Shortcuts) & + Log Trade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* User Profile Dropdown */}
        {user ? (
          <div ref={userRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 10px',
                borderRadius: '8px',
                backgroundColor: '#0c1222',
                borderColor: '#1e293b'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#ffffff',
                flexShrink: 0
              }}>
                {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <ChevronDown size={12} color="#94a3b8" />
            </button>

            {userDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '260px',
                backgroundColor: '#0c1222',
                border: '1px solid #233148',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
                padding: '8px',
                zIndex: 200,
                animation: 'fadeIn 0.15s ease'
              }}>
                <div style={{ padding: '6px 8px', borderBottom: '1px solid #1e293b', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.user_metadata?.full_name || 'Trader'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                </div>

                {/* Profile & Appearance */}
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#60a5fa', fontWeight: 600, fontSize: '0.78rem' }}
                >
                  <Globe size={14} color="#3b82f6" /> Public Portfolio Link
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setThemeModalOpen(true);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: activeThemeOption.primaryColor, fontWeight: 600, fontSize: '0.78rem' }}
                >
                  <Palette size={14} color={activeThemeOption.primaryColor} /> Ganti Tema ({activeThemeOption.name.split(' ')[0]})
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setShortcutsModalOpen(true);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1', fontSize: '0.78rem' }}
                >
                  <Keyboard size={14} color="#94a3b8" /> Keyboard Shortcuts (?)
                </button>

                <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '6px 0' }} />

                {/* Data & Backup Tools */}
                <div style={{ padding: '2px 8px', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Data & Backup
                </div>

                <button
                  onClick={handleExportCSV}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1', fontSize: '0.78rem' }}
                >
                  <FileSpreadsheet size={14} color="#10b981" /> Export CSV ({filteredTrades.length} Trades)
                </button>

                <button
                  onClick={handleExportJSON}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1', fontSize: '0.78rem' }}
                >
                  <FileJson size={14} color="#3b82f6" /> Backup Data (JSON)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1', fontSize: '0.78rem' }}
                >
                  <Upload size={14} color="#f59e0b" /> Import JSON Backup
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => {
                    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA?\n\nTindakan ini tidak dapat dibatalkan.')) {
                      resetAllData();
                      setUserDropdownOpen(false);
                    }
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444', fontSize: '0.75rem' }}
                >
                  <Trash2 size={14} color="#ef4444" /> Reset All Data
                </button>

                <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '6px 0' }} />

                {/* Logout */}
                <button
                  onClick={() => {
                    signOut();
                    setUserDropdownOpen(false);
                    showToast('Berhasil keluar dari akun.', 'info');
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444', fontWeight: 600, fontSize: '0.78rem' }}
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
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
              color: '#60a5fa',
              fontWeight: 600
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}

        {/* Stealth / Privacy Toggle Button */}
        <button
          type="button"
          onClick={toggleStealthMode}
          className="btn btn-secondary btn-icon btn-sm"
          title={isStealthMode ? 'Tampilkan Saldo (Stealth Mode Aktif)' : 'Sembunyikan Saldo (Stealth Mode)'}
          style={{
            backgroundColor: isStealthMode ? 'rgba(239, 68, 68, 0.15)' : '#0c1222',
            borderColor: isStealthMode ? '#ef4444' : '#1e293b',
            color: isStealthMode ? '#f87171' : '#94a3b8',
            padding: '7px 10px'
          }}
        >
          {isStealthMode ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {/* Primary Action: Log Trade Button */}
        <button
          onClick={onOpenTradeModal}
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hide-on-mobile">Log Trade</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  );
};
