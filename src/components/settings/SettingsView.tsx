import React, { useEffect, useRef, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../common/ConfirmDialog';
import { ThemeSelectorModal } from '../common/ThemeSelectorModal';
import { ProfileSettingsModal } from '../profile/ProfileSettingsModal';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { DEFAULT_HIDDEN_TABS, getNavPrefs, setTabHidden, showAllTabs, resetNavPrefs, subscribeNavPrefs, type NavPrefs } from '../../utils/navPrefs';
import { getUiPrefs, setUiPref, type UiPrefs } from '../../utils/uiPrefs';
import { exportDatabaseToJSON } from '../../utils/storage';
import { NAV_META, NAV_MODULES, type NavTab } from '../navigation/navCatalog';
import {
  User as UserIcon,
  Palette,
  Moon,
  Zap,
  Calculator,
  Eye,
  EyeOff,
  Keyboard,
  MessageSquarePlus,
  FileJson,
  FileSpreadsheet,
  Upload,
  Trash2,
  LogOut,
  Globe,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react';

interface SettingsViewProps {
  onOpenFeedback?: () => void;
  onSelectTab?: (tab: NavTab) => void;
}

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ icon, title, subtitle, children }) => (
  <section style={{
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        flexShrink: 0,
        borderRadius: '8px',
        backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--theme-secondary)'
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </header>
    {children}
  </section>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  right: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, hint, right }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-sidebar)',
    border: '1px solid var(--bg-chip)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>{right}</div>
  </div>
);

interface PillProps {
  on: boolean;
  labelOn: string;
  labelOff: string;
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  tone?: 'accent' | 'danger';
}

const PillToggle: React.FC<PillProps> = ({ on, labelOn, labelOff, onClick, ariaLabel, title, tone = 'accent' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    aria-label={ariaLabel}
    title={title || ariaLabel}
    className="btn btn-sm"
    style={{
      minWidth: '86px',
      justifyContent: 'center',
      fontSize: '0.74rem',
      fontWeight: 700,
      padding: '5px 10px',
      backgroundColor: on
        ? 'color-mix(in srgb, var(--theme-secondary-strong) 20%, transparent)'
        : tone === 'danger'
          ? 'rgba(239, 68, 68, 0.12)'
          : 'transparent',
      border: `1px solid ${on ? 'var(--theme-secondary-strong)' : tone === 'danger' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
      color: on ? 'var(--theme-secondary)' : tone === 'danger' ? '#f87171' : 'var(--text-secondary)'
    }}
  >
    {on ? labelOn : labelOff}
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenFeedback, onSelectTab }) => {
  const {
    accounts,
    trades,
    withdrawals,
    filteredTrades,
    customFieldDefs,
    importData,
    resetAllData,
    isStealthMode,
    toggleStealthMode,
    showToast
  } = useJournal();
  const { user, signOut } = useAuth();
  const { activeThemeOption } = useTheme();
  const { confirm } = useConfirm();

  const [navPrefs, setNavPrefs] = useState<NavPrefs>(getNavPrefs);
  useEffect(() => subscribeNavPrefs(setNavPrefs), []);

  const [uiPrefsState, setUiPrefsState] = useState<UiPrefs>(getUiPrefs());
  useEffect(() => {
    const handler = () => setUiPrefsState(getUiPrefs());
    window.addEventListener('itrade-uiprefs-changed', handler);
    return () => window.removeEventListener('itrade-uiprefs-changed', handler);
  }, []);

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hiddenCount = navPrefs.hidden.length;
  const visibleCount = NAV_MODULES.length - hiddenCount;

  const toggleModule = (id: NavTab, currentlyVisible: boolean) => {
    const next = setTabHidden(id, currentlyVisible);
    setNavPrefs(next);
    showToast(
      currentlyVisible
        ? `${NAV_META[id].label} hidden - re-enable it here anytime.`
        : `${NAV_META[id].label} added to the navigation.`,
      'info'
    );
  };

  const handleShowAll = () => {
    setNavPrefs(showAllTabs());
    showToast('All modules are now shown in the navigation.', 'success');
  };

  const handleResetNav = () => {
    setNavPrefs(resetNavPrefs());
    showToast('Navigation reset to the compact default set.', 'info');
  };

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
      ...customFieldDefs.map((d) => d.label),
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
        ...customFieldDefs.map((d) => `"${String((t.customFields || {})[d.id] ?? '').replace(/"/g, '""')}"`),
        `"${(t.confluences || []).join('; ').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${(t.lessons || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `itrade-journal-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredTrades.length} trades to CSV!`, 'success');
  };

  const handleBackupJSON = () => {
    exportDatabaseToJSON(accounts, trades, withdrawals);
    showToast('Backup file downloaded successfully.', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importData(json);
      } catch (err) {
        showToast('Invalid JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetAll = async () => {
    const confirmed = await confirm({
      title: 'Reset all data?',
      message: 'All trading accounts, trades and withdrawal records will be permanently deleted. This action cannot be undone.',
      confirmText: 'Reset everything',
      variant: 'danger',
      typeToConfirm: 'RESET'
    });
    if (confirmed) resetAllData();
  };

  const userInitial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Settings
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Your profile, appearance, which modules show up in the navigation, and your data.
        </p>
      </div>

      {/* Account */}
      <SettingsCard
        icon={<UserIcon size={16} />}
        title="Account"
        subtitle="Who you are signed in as, and where your public page lives."
      >
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-sidebar)', borderRadius: '10px', border: '1px solid var(--bg-chip)' }}>
              <div style={{
                width: '42px',
                height: '42px',
                flexShrink: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--theme-secondary-strong), #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#ffffff'
              }}>
                {userInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
              >
                <Globe size={14} /> Public Portfolio Link
              </button>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  showToast('Signed out successfully.', 'info');
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--loss-red)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            You are using iTradeJournal locally. Sign in to sync accounts, trades and settings across devices.
          </div>
        )}
      </SettingsCard>

      {/* Appearance */}
      <SettingsCard
        icon={<Palette size={16} />}
        title="Appearance & Comfort"
        subtitle="Theme and the settings that make long sessions easier on the eyes."
      >
        <SettingsRow
          icon={<Palette size={15} />}
          label="Theme"
          hint={`Currently ${activeThemeOption.name}`}
          right={
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem' }}
            >
              Dark / Light
            </button>
          }
        />

        <SettingsRow
          icon={<Moon size={15} />}
          label="Dim Mode"
          hint="Softens the whole interface for night sessions."
          right={
            <PillToggle
              on={uiPrefsState.dim}
              labelOn="ON"
              labelOff="OFF"
              ariaLabel="Toggle dim mode"
              onClick={() => {
                const prefs = setUiPref('dim', !uiPrefsState.dim);
                setUiPrefsState(prefs);
                showToast(prefs.dim ? 'Dim mode ON - brightness reduced for long sessions.' : 'Dim mode OFF.', 'info');
              }}
            />
          }
        />

        <SettingsRow
          icon={<Zap size={15} />}
          label="Performance Mode"
          hint="Disables animations and confetti on slower machines."
          right={
            <PillToggle
              on={uiPrefsState.performance}
              labelOn="ON"
              labelOff="OFF"
              ariaLabel="Toggle performance mode"
              onClick={() => {
                const prefs = setUiPref('performance', !uiPrefsState.performance);
                setUiPrefsState(prefs);
                showToast(prefs.performance ? 'Performance mode ON - animations & confetti disabled.' : 'Performance mode OFF.', 'info');
              }}
            />
          }
        />

        <SettingsRow
          icon={<Calculator size={15} />}
          label="Quick Risk Dock"
          hint="Sticky mini position-size calculator with an always-on-top window."
          right={
            <PillToggle
              on={uiPrefsState.quickRisk}
              labelOn="ON"
              labelOff="OFF"
              ariaLabel="Toggle the Quick Risk dock"
              onClick={() => {
                const prefs = setUiPref('quickRisk', !uiPrefsState.quickRisk);
                setUiPrefsState(prefs);
                showToast(
                  prefs.quickRisk
                    ? 'Quick Risk dock ON - the mini calculator is back on screen.'
                    : 'Quick Risk dock OFF - press C or open Position Size Calc to use it.',
                  'info'
                );
              }}
            />
          }
        />

        <SettingsRow
          icon={isStealthMode ? <EyeOff size={15} /> : <Eye size={15} />}
          label="Stealth Mode"
          hint="Hides balances when someone is looking over your shoulder."
          right={
            <PillToggle
              on={isStealthMode}
              labelOn="HIDDEN"
              labelOff="VISIBLE"
              ariaLabel="Toggle stealth mode"
              onClick={() => toggleStealthMode()}
            />
          }
        />
      </SettingsCard>

      {/* Navigation & Modules - progressive disclosure */}
      <SettingsCard
        icon={<SlidersHorizontal size={16} />}
        title="Navigation & Modules"
        subtitle="Keep the app lean: advanced modules stay out of the way until you need them."
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px',
          borderRadius: '10px',
          backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 10%, transparent)',
          border: '1px solid var(--theme-secondary-strong)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Layers size={16} color="var(--theme-secondary)" />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {visibleCount} of {NAV_MODULES.length} modules shown
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {hiddenCount === 0
                  ? 'Everything is visible in the sidebar and command palette.'
                  : `${hiddenCount} advanced module${hiddenCount > 1 ? 's are' : ' is'} hidden to keep the navigation short.`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleShowAll} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              Show All
            </button>
            <button
              type="button"
              onClick={handleResetNav}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
            >
              <RotateCcw size={13} /> Simple Default
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
          {NAV_MODULES.map(m => {
            const meta = NAV_META[m.id];
            const Icon = meta.icon;
            const isVisible = !navPrefs.hidden.includes(m.id);
            const isAdvanced = m.tier === 'advanced';

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-sidebar)',
                  border: `1px solid ${isVisible ? 'var(--theme-secondary-strong)' : 'var(--bg-chip)'}`,
                  opacity: isVisible ? 1 : 0.72
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Icon size={16} color={isVisible ? 'var(--theme-secondary)' : 'var(--text-muted)'} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isVisible ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</span>
                      {isAdvanced && (
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-chip)',
                          color: 'var(--text-muted)'
                        }}>
                          ADVANCED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <PillToggle
                  on={isVisible}
                  labelOn="Shown"
                  labelOff="Hidden"
                  ariaLabel={`${isVisible ? 'Hide' : 'Show'} ${meta.label} in the navigation`}
                  tone={!isVisible && !isAdvanced ? 'danger' : 'accent'}
                  onClick={() => toggleModule(m.id, isVisible)}
                />
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Hidden modules also disappear from the command palette (Ctrl+K) and stop responding to their keyboard shortcut. Settings itself is always available.
        </div>
        {onSelectTab && (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
          >
            <Check size={13} /> Back to Dashboard
          </button>
        )}
      </SettingsCard>

      {/* Data & Backup */}
      <SettingsCard
        icon={<FileJson size={16} />}
        title="Data & Backup"
        subtitle="Export a copy of your journal, restore one, or start over."
      >
        <SettingsRow
          icon={<FileSpreadsheet size={15} />}
          label={`Export CSV (${filteredTrades.length} trades)`}
          hint="Spreadsheet-friendly export of the trades in the current view."
          right={
            <button type="button" onClick={handleExportCSV} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
              Export
            </button>
          }
        />
        <SettingsRow
          icon={<FileJson size={15} />}
          label="Backup Data (JSON)"
          hint="Full backup of accounts, trades and withdrawals. Also clears the backup reminder."
          right={
            <button type="button" onClick={handleBackupJSON} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
              Backup
            </button>
          }
        />
        <SettingsRow
          icon={<Upload size={15} />}
          label="Import JSON Backup"
          hint="Restore a previous backup file into this journal."
          right={
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
                Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                style={{ display: 'none' }}
              />
            </>
          }
        />
        <SettingsRow
          icon={<Trash2 size={15} />}
          label="Reset All Data"
          hint="Deletes every account, trade and withdrawal permanently."
          right={
            <button
              type="button"
              onClick={handleResetAll}
              className="btn btn-sm"
              style={{ fontSize: '0.76rem', color: 'var(--loss-red)', backgroundColor: 'var(--bg-main)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
            >
              Reset
            </button>
          }
        />
      </SettingsCard>

      {/* Support */}
      <SettingsCard
        icon={<Sparkles size={16} />}
        title="Help & Support"
        subtitle="Learn the shortcuts, send feedback, and see what version you are on."
      >
        <SettingsRow
          icon={<Keyboard size={15} />}
          label="Keyboard Shortcuts"
          hint="Every shortcut in the app on one screen."
          right={
            <button type="button" onClick={() => setShortcutsModalOpen(true)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
              Open
            </button>
          }
        />
        {onOpenFeedback && (
          <SettingsRow
            icon={<MessageSquarePlus size={15} />}
            label="Send Feedback"
            hint="Report a bug or suggest a feature - it goes straight to the admin inbox."
            right={
              <button type="button" onClick={onOpenFeedback} className="btn btn-secondary btn-sm" style={{ fontSize: '0.76rem' }}>
                Send
              </button>
            }
          />
        )}
        {DEFAULT_HIDDEN_TABS.length > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            iTradeJournal - advanced modules ({DEFAULT_HIDDEN_TABS.map(id => NAV_META[id].label).join(', ')}) are hidden by default.
          </div>
        )}
      </SettingsCard>

      <ThemeSelectorModal isOpen={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
      <ProfileSettingsModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
    </div>
  );
};
