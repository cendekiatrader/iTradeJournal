import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { NavTab } from '../Sidebar';
import { exportTradesToCSV } from '../../utils/storage';
import { getUiPrefs, setUiPref } from '../../utils/uiPrefs';
import { Trade } from '../../types';
import {
  Search,
  LayoutDashboard,
  LayoutGrid,
  CalendarDays,
  BookOpen,
  BarChart3,
  BookMarked,
  Flame,
  WalletCards,
  Calculator,
  Target,
  Plus,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Keyboard,
  Palette,
  Compass,
  Moon,
  Zap
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenTradeModal: () => void;
  onOpenAccountModal: () => void;
  onOpenShortcuts: () => void;
  onOpenThemeModal: () => void;
  onViewTradeDetail: (trade: Trade) => void;
  onStartTour: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const PAGES: Array<{ id: NavTab; label: string; hint: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', hint: 'D', icon: <LayoutDashboard size={15} /> },
  { id: 'workspace', label: 'Workspace (multi-monitor)', hint: 'W', icon: <LayoutGrid size={15} /> },
  { id: 'calendar', label: 'Calendar View', hint: '', icon: <CalendarDays size={15} /> },
  { id: 'journal', label: 'Trade Log', hint: 'J', icon: <BookOpen size={15} /> },
  { id: 'analytics', label: 'Analytics & Setups', hint: 'A', icon: <BarChart3 size={15} /> },
  { id: 'playbook', label: 'Playbook', hint: 'P', icon: <BookMarked size={15} /> },
  { id: 'queue', label: 'Setup Queue', hint: '', icon: <Target size={15} /> },
  { id: 'news', label: 'Economic Calendar', hint: 'E', icon: <Flame size={15} /> },
  { id: 'accounts', label: 'Account Manager', hint: 'M', icon: <WalletCards size={15} /> },
  { id: 'calculator', label: 'Position Size Calc', hint: 'C', icon: <Calculator size={15} /> }
];

export const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
  const { isOpen, onClose } = props;
  const {
    trades,
    accounts,
    accountsMap,
    filteredTrades,
    setActiveAccountId,
    isStealthMode,
    toggleStealthMode,
    showToast,
    customFieldDefs
  } = useJournal();

  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlighted(0);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    list.push(
      {
        id: 'action-new-trade',
        label: 'Log new trade',
        hint: 'N',
        group: 'Actions',
        icon: <Plus size={15} />,
        keywords: 'new entry create',
        run: () => {
          onClose();
          props.onOpenTradeModal();
        }
      },
      {
        id: 'action-new-account',
        label: 'Add trading account',
        group: 'Actions',
        icon: <WalletCards size={15} />,
        keywords: 'new broker prop',
        run: () => {
          onClose();
          props.onOpenAccountModal();
        }
      },
      {
        id: 'action-stealth',
        label: isStealthMode ? 'Show balances (stealth off)' : 'Hide balances (stealth mode)',
        group: 'Actions',
        icon: isStealthMode ? <Eye size={15} /> : <EyeOff size={15} />,
        keywords: 'privacy sensor saldo',
        run: () => {
          toggleStealthMode();
          showToast(isStealthMode ? 'Balances visible.' : 'Balances hidden.', 'info');
          onClose();
        }
      },
      {
        id: 'action-export-csv',
        label: `Export CSV (${filteredTrades.length} trades)`,
        group: 'Actions',
        icon: <FileSpreadsheet size={15} />,
        keywords: 'download excel spreadsheet',
        run: () => {
          exportTradesToCSV(filteredTrades, accountsMap, customFieldDefs);
          showToast(`Exported ${filteredTrades.length} trades to CSV.`, 'success');
          onClose();
        }
      },
      {
        id: 'action-theme',
        label: 'Change theme',
        group: 'Actions',
        icon: <Palette size={15} />,
        keywords: 'color design appearance',
        run: () => {
          onClose();
          props.onOpenThemeModal();
        }
      },
      {
        id: 'action-shortcuts',
        label: 'Keyboard shortcuts',
        hint: '?',
        group: 'Actions',
        icon: <Keyboard size={15} />,
        keywords: 'help keys cheatsheet',
        run: () => {
          onClose();
          props.onOpenShortcuts();
        }
      },
      {
        id: 'action-tour',
        label: 'Start product tour',
        group: 'Actions',
        icon: <Compass size={15} />,
        keywords: 'onboarding guide help walkthrough',
        run: () => {
          onClose();
          props.onStartTour();
        }
      },
      {
        id: 'action-dim',
        label: 'Toggle dim mode',
        group: 'Actions',
        icon: <Moon size={15} />,
        keywords: 'brightness dark long session night eye',
        run: () => {
          const prefs = setUiPref('dim', !getUiPrefs().dim);
          showToast(prefs.dim ? 'Dim mode ON — brightness reduced.' : 'Dim mode OFF.', 'info');
          onClose();
        }
      },
      {
        id: 'action-perf',
        label: 'Toggle performance mode',
        group: 'Actions',
        icon: <Zap size={15} />,
        keywords: 'animations confetti reduce battery',
        run: () => {
          const prefs = setUiPref('performance', !getUiPrefs().performance);
          showToast(prefs.performance ? 'Performance mode ON — animations disabled.' : 'Performance mode OFF.', 'info');
          onClose();
        }
      }
    );

    PAGES.forEach((page) => {
      list.push({
        id: `page-${page.id}`,
        label: page.label,
        hint: page.hint,
        group: 'Go to',
        icon: page.icon,
        keywords: 'navigate open page',
        run: () => {
          props.onNavigate(page.id);
          onClose();
        }
      });
    });

    accounts.forEach((acc) => {
      list.push({
        id: `account-${acc.id}`,
        label: `Switch to ${acc.name}`,
        hint: 'account',
        group: 'Accounts',
        icon: <WalletCards size={15} />,
        keywords: `${acc.broker} ${acc.type}`,
        run: () => {
          setActiveAccountId(acc.id);
          showToast(`Viewing ${acc.name}.`, 'info');
          onClose();
        }
      });
    });

    [...trades]
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 150)
      .forEach((trade) => {
        list.push({
          id: `trade-${trade.id}`,
          label: `${trade.symbol} · ${trade.direction} · ${trade.status}`,
          hint: trade.entryDate.slice(0, 10),
          group: 'Trades',
          icon: <Target size={15} />,
          keywords: `${trade.setup} ${trade.session} ${trade.notes || ''}`.slice(0, 120),
          run: () => {
            onClose();
            props.onViewTradeDetail(trade);
          }
        });
      });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, accounts, filteredTrades.length, isStealthMode, customFieldDefs.length]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    const scored: Array<{ item: CommandItem; score: number }> = [];
    items.forEach((item) => {
      const hay = `${item.label} ${item.group} ${item.hint || ''} ${item.keywords || ''}`.toLowerCase();
      const idx = hay.indexOf(q);
      if (idx !== -1) scored.push({ item, score: idx });
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 12).map((s) => s.item);
  }, [items, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelectorAll('button')[highlighted];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  if (!isOpen) return null;

  const runItem = (item: CommandItem) => item.run();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[highlighted];
      if (item) runItem(item);
    }
  };

  let lastGroup = '';

  return (
    <div
      className="modal-backdrop"
      style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', borderRadius: '14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={17} color="var(--text-secondary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, actions, accounts, trades…"
            aria-label="Search commands"
            autoFocus
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              flex: 1,
              fontSize: '0.92rem',
              color: 'var(--text-primary)',
              fontFamily: 'inherit'
            }}
          />
          <kbd className="kbd-hint">ESC</kbd>
        </div>

        <div ref={listRef} style={{ maxHeight: '48vh', overflowY: 'auto', padding: '8px' }}>
          {results.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No results for “{query}”
            </div>
          ) : (
            results.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <div style={{ padding: '8px 10px 4px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setHighlighted(index)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      backgroundColor: index === highlighted ? 'color-mix(in srgb, var(--theme-secondary-strong) 14%, transparent)' : 'transparent',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span style={{ display: 'flex', color: 'var(--text-secondary)' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {item.hint && <kbd className="kbd-hint">{item.hint}</kbd>}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '14px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span><kbd className="kbd-hint">↑↓</kbd> navigate</span>
          <span><kbd className="kbd-hint">↵</kbd> run</span>
          <span><kbd className="kbd-hint">ctrl K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
};
