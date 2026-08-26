import React, { useState, useRef, useEffect } from 'react';
import { useJournal } from '../context/JournalContext';
import { formatCurrency } from '../utils/formatters';
import { exportDatabaseToJSON, exportTradesToCSV } from '../utils/storage';
import { 
  TrendingUp, 
  Plus, 
  Layers, 
  ChevronDown, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  RotateCcw, 
  Check, 
  Sparkles,
  Wallet,
  ShieldCheck,
  Trash2,
  Menu
} from 'lucide-react';

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
    trades, 
    withdrawals,
    accountsMap,
    metrics,
    importData,
    resetAllData,
    showToast
  } = useJournal();

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [dataDropdownOpen, setDataDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
      if (dataRef.current && !dataRef.current.contains(event.target as Node)) {
        setDataDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importData(json);
      } catch {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setDataDropdownOpen(false);
  };

  const totalPortfolioBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  return (
    <header className="app-navbar" style={{
      height: '70px',
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
      {/* Brand & Logo + Mobile Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <TrendingUp size={22} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div className="navbar-logo-text">
            <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc', whiteSpace: 'nowrap' }}>
              iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
            </span>
          </div>
        </div>

        {/* Multi-Account Selector Switcher */}
        <div ref={accountRef} className="navbar-account-switcher" style={{ position: 'relative' }}>
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#0f172a',
              border: '1px solid #29384f',
              padding: '8px 14px',
              borderRadius: '10px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: activeAccount?.colorTag || '#3b82f6',
              boxShadow: `0 0 8px ${activeAccount?.colorTag || '#3b82f6'}`
            }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {activeAccount ? activeAccount.name : 'All Accounts (Combined)'}
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8'
                }}>
                  {activeAccount ? activeAccount.type : `${accounts.length} Active`}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                {activeAccount 
                  ? formatCurrency(activeAccount.currentBalance, activeAccount.currency)
                  : formatCurrency(totalPortfolioBalance, 'USD')}
              </div>
            </div>
            <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: '4px' }} />
          </button>

          {/* Account Dropdown Menu */}
          {accountDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '320px',
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
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: activeAccountId === 'all' ? '#1e293b' : 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>All Accounts (Portfolio)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Combined analytics & metrics</div>
                  </div>
                </div>
                {activeAccountId === 'all' && <Check size={16} color="#3b82f6" />}
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

              {/* Individual Accounts List */}
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
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
                      padding: '9px 12px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: acc.colorTag
                      }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{acc.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {acc.broker} • {acc.type}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--profit-green)' }}>
                        {formatCurrency(acc.currentBalance, acc.currency)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Init: {formatCurrency(acc.initialBalance, acc.currency, true)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

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
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#60a5fa',
                  border: '1px dashed #3b82f6',
                  fontSize: '0.78rem',
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

      {/* Right Controls: Data Backup, Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Data Tools Menu */}
        <div ref={dataRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDataDropdownOpen(!dataDropdownOpen)}
            className="btn btn-secondary btn-sm"
            title="Backup & Export Options"
          >
            <Download size={14} />
            <span>Data / Export</span>
            <ChevronDown size={12} />
          </button>

          {dataDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '240px',
              backgroundColor: '#0c1222',
              border: '1px solid #233148',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
              padding: '6px',
              zIndex: 200
            }}>
              <button
                onClick={() => {
                  exportTradesToCSV(trades, accountsMap);
                  setDataDropdownOpen(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1' }}
              >
                <FileSpreadsheet size={15} color="#10b981" /> Export Trades to CSV
              </button>

              <button
                onClick={() => {
                  exportDatabaseToJSON(accounts, trades, withdrawals);
                  setDataDropdownOpen(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1' }}
              >
                <Download size={15} color="#3b82f6" /> Export Full JSON Backup
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#cbd5e1' }}
              >
                <Upload size={15} color="#f59e0b" /> Import JSON Backup
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                style={{ display: 'none' }}
              />

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  if (window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA (semua trade, riwayat withdraw, dan akun akan dihapus bersih tidak terkecuali)?\n\nTindakan ini tidak dapat dibatalkan.')) {
                    resetAllData();
                    setDataDropdownOpen(false);
                  }
                }}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444', fontWeight: 600 }}
              >
                <Trash2 size={15} color="#ef4444" /> Reset All Data (Hapus Semua)
              </button>
            </div>
          )}
        </div>

        {/* Add Trade Button */}
        <button
          onClick={onOpenTradeModal}
          className="btn btn-primary"
          style={{ padding: '9px 18px', fontWeight: 600 }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Log Trade</span>
        </button>
      </div>
    </header>
  );
};
