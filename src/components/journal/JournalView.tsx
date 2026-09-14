import React, { useEffect, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency, formatDate, formatDateTimeDDMMYYYY, formatDuration } from '../../utils/formatters';
import { Trade, TradeFilter, AssetClass, StrategyType, TradingSession } from '../../types';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  FileText,
  Eye, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  Bookmark,
  Share2
} from 'lucide-react';
import { exportTradesToCSV } from '../../utils/storage';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';
import { EmptyState } from '../common/EmptyState';
import { createReviewSession } from '../../utils/review';
import { TableRowSkeleton } from '../common/Skeleton';
import { useConfirm } from '../common/ConfirmDialog';

const COLUMN_TOGGLES = [
  { id: 'account', label: 'Account' },
  { id: 'setup', label: 'Setup / Strategy' },
  { id: 'session', label: 'Session' },
  { id: 'qty', label: 'Lots / Qty' },
  { id: 'rr', label: 'R:R' },
  { id: 'status', label: 'Status' }
];

interface SavedJournalView {
  name: string;
  filters: TradeFilter;
}

const COLUMNS_KEY = 'itrade_journal_columns';
const DENSITY_KEY = 'itrade_journal_density';
const VIEWS_KEY = 'itrade_saved_views';

interface JournalViewProps {
  onOpenTradeModal: () => void;
  onEditTrade: (trade: Trade) => void;
  onViewTradeDetail: (trade: Trade) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  onOpenTradeModal,
  onEditTrade,
  onViewTradeDetail
}) => {
  const { 
    filteredTrades, 
    filters, 
    setFilters, 
    resetFilters, 
    accounts, 
    accountsMap, 
    activeAccount,
    deleteTrade,
    bulkDeleteTrades,
    updateTrade,
    trades,
    customFieldDefs,
    isLoadingCloud,
    showToast
  } = useJournal();

  const { confirm } = useConfirm();
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Pagination — avoid rendering thousands of rows at once
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTrades = filteredTrades.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filteredTrades.length]);

  // ---- Saved views / column & density config (A3) ----
  const [columns, setColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    return { account: true, setup: true, session: true, qty: true, rr: true, status: true };
  });
  const [density, setDensity] = useState<'normal' | 'compact'>(() =>
    localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'normal'
  );
  const [savedViews, setSavedViews] = useState<SavedJournalView[]>(() => {
    try {
      const raw = localStorage.getItem(VIEWS_KEY);
      if (raw) return JSON.parse(raw) as SavedJournalView[];
    } catch {
      /* ignore */
    }
    return [];
  });
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [editingCell, setEditingCell] = useState<{ tradeId: string; field: 'status' | 'setup' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    } catch {
      /* ignore */
    }
  }, [columns]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(savedViews));
    } catch {
      /* ignore */
    }
  }, [savedViews]);

  useEffect(() => {
    setFocusedRowIndex(-1);
  }, [safePage]);

  // Click-away closes inline cell editors
  useEffect(() => {
    if (!editingCell) return;
    const handler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (target.closest('[data-editing-cell]')) return;
      setEditingCell(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingCell]);

  const cellPad = density === 'compact' ? '7px 10px' : '12px 14px';
  const visibleColCount = 6 + COLUMN_TOGGLES.filter((c) => columns[c.id]).length;

  const toggleColumn = (id: string) => setColumns((prev) => ({ ...prev, [id]: !prev[id] }));

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) return;
    setSavedViews((prev) => [...prev.filter((v) => v.name !== name), { name, filters: { ...filters } }]);
    setViewName('');
    showToast(`View "${name}" saved.`, 'success');
  };

  const applySavedView = (view: SavedJournalView) => {
    setFilters({ ...view.filters });
    setViewsMenuOpen(false);
    showToast(`Applied view "${view.name}".`, 'info');
  };

  const deleteSavedView = (name: string) => {
    setSavedViews((prev) => prev.filter((v) => v.name !== name));
  };

  const handleShareForReview = async () => {
    const snapshot = trades.filter((tr) => selectedTradeIds.includes(tr.id));
    if (snapshot.length === 0) return;
    const { token, cloud } = await createReviewSession(selectedTradeIds, snapshot);
    const url = `${window.location.origin}${window.location.pathname}#/review/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(
        cloud
          ? 'Mentor review link copied to clipboard.'
          : 'Link copied — local only for now (run supabase_review_schema.sql to enable cloud sharing).',
        cloud ? 'success' : 'info'
      );
    } catch {
      showToast(`Review link: ${url}`, 'info');
    }
  };

  // ---- Keyboard row navigation (A8): j/k, Enter, x ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);
      if (isTyping) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((idx) => {
          const next = Math.min(pagedTrades.length - 1, idx + 1);
          window.requestAnimationFrame(() => {
            document.querySelector(`[data-row-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((idx) => {
          const next = Math.max(0, idx - 1);
          window.requestAnimationFrame(() => {
            document.querySelector(`[data-row-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < pagedTrades.length) {
        e.preventDefault();
        onViewTradeDetail(pagedTrades[focusedRowIndex]);
      } else if ((e.key === 'x' || e.key === 'X') && focusedRowIndex >= 0 && focusedRowIndex < pagedTrades.length) {
        e.preventDefault();
        const trade = pagedTrades[focusedRowIndex];
        setSelectedTradeIds((prev) =>
          prev.includes(trade.id) ? prev.filter((id) => id !== trade.id) : [...prev, trade.id]
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pagedTrades, focusedRowIndex, onViewTradeDetail]);

  const currentCurrency = activeAccount?.currency || 'USD';

  const toggleSelectAll = () => {
    if (selectedTradeIds.length === filteredTrades.length) {
      setSelectedTradeIds([]);
    } else {
      setSelectedTradeIds(filteredTrades.map(t => t.id));
    }
  };

  const toggleSelectTrade = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTradeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${selectedTradeIds.length} selected trade(s)?`,
      message: 'These trades will be permanently removed from your journal.',
      confirmText: 'Delete selected',
      variant: 'danger'
    });
    if (confirmed) {
      bulkDeleteTrades(selectedTradeIds);
      setSelectedTradeIds([]);
    }
  };

  const handleSort = (column: 'entryDate' | 'pnl' | 'pnlPercent' | 'symbol' | 'rrAchieved') => {
    if (filters.sortBy === column) {
      setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ sortBy: column, sortOrder: 'desc' });
    }
  };

  return (
    <div>
      {/* Header & Quick Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="var(--theme-secondary-strong)" />
            <span>Trading Journal Log</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Comprehensive trade records, setups, and psychological audit
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setReportModalOpen(true)} 
            className="btn btn-secondary btn-sm"
          >
            <FileText size={15} color="#38bdf8" /> Export PDF Report
          </button>

          <button 
            onClick={() => exportTradesToCSV(filteredTrades, accountsMap, customFieldDefs)} 
            className="btn btn-secondary btn-sm"
          >
            <FileSpreadsheet size={15} color="#10b981" /> Export CSV
          </button>
          
          <button onClick={onOpenTradeModal} className="btn btn-primary">
            <Plus size={16} strokeWidth={2.5} /> Log Trade
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search symbol (e.g. XAUUSD), setup, or notes..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="input-control"
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>

          {/* Quick Status Filter Tabs */}
          <div style={{ display: 'flex', backgroundColor: '#070a16', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {['all', 'WIN', 'LOSS', 'BREAKEVEN', 'OPEN'].map((st) => (
              <button
                key={st}
                onClick={() => setFilters({ status: st })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filters.status === st ? '#1e293b' : 'transparent',
                  color: filters.status === st ? 'var(--theme-secondary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter size={14} /> Advanced Filters
          </button>

          <button
            onClick={() => {
              setShowViewOptions((s) => !s);
              setViewsMenuOpen(false);
            }}
            className={`btn btn-sm ${showViewOptions ? 'btn-primary' : 'btn-secondary'}`}
          >
            <SlidersHorizontal size={14} /> View
          </button>

          <button
            onClick={() => {
              setViewsMenuOpen((s) => !s);
              setShowViewOptions(false);
            }}
            className={`btn btn-sm ${viewsMenuOpen ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Bookmark size={14} /> Saved Views ({savedViews.length})
          </button>

          {(filters.searchQuery || filters.status !== 'all' || filters.direction !== 'all' || filters.assetClass !== 'all' || filters.setup !== 'all' || filters.session !== 'all' || filters.startDate || filters.endDate) && (
            <button onClick={resetFilters} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
              <RefreshCw size={13} /> Reset
            </button>
          )}

          <span className="hide-on-mobile" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            j / k rows · Enter open · x select
          </span>
        </div>

        {/* Expandable Advanced Filter Options */}
        {showFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)'
          }}>
            {/* Account filter (if on 'all' mode) */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Filter Account</label>
              <select
                value={filters.accountId}
                onChange={(e) => setFilters({ accountId: e.target.value })}
                className="input-control"
              >
                <option value="all">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Direction</label>
              <select
                value={filters.direction}
                onChange={(e) => setFilters({ direction: e.target.value })}
                className="input-control"
              >
                <option value="all">All Directions</option>
                <option value="LONG">Long (Buy)</option>
                <option value="SHORT">Short (Sell)</option>
              </select>
            </div>

            {/* Asset Class */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Asset Class</label>
              <select
                value={filters.assetClass}
                onChange={(e) => setFilters({ assetClass: e.target.value })}
                className="input-control"
              >
                <option value="all">All Asset Classes</option>
                <option value="Forex">Forex</option>
                <option value="Commodities">Commodities / Gold</option>
                <option value="Indices">Indices (US30, NAS)</option>
                <option value="Crypto">Crypto</option>
                <option value="Stocks">Stocks</option>
              </select>
            </div>

            {/* Session */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Trading Session</label>
              <select
                value={filters.session}
                onChange={(e) => setFilters({ session: e.target.value })}
                className="input-control"
              >
                <option value="all">All Sessions</option>
                <option value="Asian">Asian Session</option>
                <option value="London">London Session</option>
                <option value="New York AM">New York AM</option>
                <option value="New York PM">New York PM</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ startDate: e.target.value })}
                className="input-control"
              />
            </div>

            {/* End Date */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ endDate: e.target.value })}
                className="input-control"
              />
            </div>
          </div>
        )}

        {/* View Options Popover (density + columns) */}
        {showViewOptions && (
          <div style={{ position: 'absolute', right: '16px', top: '64px', zIndex: 60, width: '272px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.7)', padding: '14px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>Density</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {(['normal', 'compact'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={`btn btn-sm ${density === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.75rem', textTransform: 'capitalize' }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>Columns</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {COLUMN_TOGGLES.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumn(col.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                >
                  {col.label}
                  {columns[col.id] ? <CheckSquare size={15} color="var(--theme-secondary-strong)" /> : <Square size={15} color="var(--text-muted)" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Views Popover */}
        {viewsMenuOpen && (
          <div style={{ position: 'absolute', right: '16px', top: '64px', zIndex: 60, width: '292px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.7)', padding: '14px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>Saved Views</div>
            {savedViews.length === 0 ? (
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                No saved views yet. Set your filters, then save the combination here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {savedViews.map((view) => (
                  <div key={view.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => applySavedView(view)}
                      style={{ flex: 1, textAlign: 'left', padding: '7px 9px', borderRadius: '7px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      aria-label={`Delete saved view ${view.name}`}
                      onClick={() => deleteSavedView(view.name)}
                      style={{ color: 'var(--loss-red)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="input-control"
                style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                placeholder="View name…"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCurrentView();
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={saveCurrentView} disabled={!viewName.trim()} style={!viewName.trim() ? { opacity: 0.5 } : undefined}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar if items selected */}
      {selectedTradeIds.length > 0 && (
        <div style={{
          backgroundColor: '#17223b',
          border: '1px solid #2e446d',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedTradeIds.length} trade(s) selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleShareForReview} className="btn btn-secondary btn-sm">
              <Share2 size={14} /> Share for Review
            </button>
            <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Trade Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="journal-table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: cellPad, width: '40px' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                    {selectedTradeIds.length === filteredTrades.length && filteredTrades.length > 0 ? (
                      <CheckSquare size={16} color="var(--theme-secondary-strong)" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th style={{ padding: cellPad, cursor: 'pointer' }} onClick={() => handleSort('entryDate')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Opened At <ArrowUpDown size={12} />
                  </div>
                </th>
                {columns.account && (<th style={{ padding: cellPad }}>Account</th>)}
                <th style={{ padding: cellPad, cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Symbol <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: cellPad }}>Side</th>
                {columns.setup && (<th style={{ padding: cellPad }}>Setup / Strategy</th>)}
                {columns.session && (<th style={{ padding: cellPad }}>Session</th>)}
                {columns.qty && (<th style={{ padding: cellPad, textAlign: 'right' }}>Lots/Qty</th>)}
                {columns.rr && (<th style={{ padding: cellPad, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('rrAchieved')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    R:R <ArrowUpDown size={12} />
                  </div>
                </th>)}
                <th style={{ padding: cellPad, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('pnl')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Net PnL <ArrowUpDown size={12} />
                  </div>
                </th>
                {columns.status && (<th style={{ padding: cellPad, textAlign: 'center' }}>Status</th>)}
                <th style={{ padding: cellPad, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(isLoadingCloud && filteredTrades.length === 0) ? (
                <>{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={visibleColCount} />)}</>
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} style={{ padding: 0, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {trades.length === 0 ? (
                      <EmptyState
                        icon={<BookOpen size={22} />}
                        title="No trades logged yet"
                        description="Log your first trade — Quick mode only asks for the essentials, or press N from anywhere in the app."
                        actionLabel="Log your first trade"
                        onAction={onOpenTradeModal}
                      />
                    ) : (
                      <div style={{ padding: '40px' }}>No trades match the selected filters.</div>
                    )}
                  </td>
                </tr>
              ) : (
                pagedTrades.map((trade, rowIndex) => {
                  const account = accountsMap[trade.accountId];
                  const isWin = trade.status === 'WIN';
                  const isLoss = trade.status === 'LOSS';
                  const isSelected = selectedTradeIds.includes(trade.id);

                  let tradeHolding = '';
                  if (trade.entryDate && trade.exitDate) {
                    const start = new Date(trade.entryDate).getTime();
                    const end = new Date(trade.exitDate).getTime();
                    if (!isNaN(start) && !isNaN(end) && end > start) {
                      tradeHolding = formatDuration((end - start) / (1000 * 60));
                    }
                  }

                  return (
                    <tr
                      key={trade.id}
                      data-row-index={rowIndex}
                      onClick={() => onViewTradeDetail(trade)}
                      style={{
                        borderBottom: '1px solid #121a29',
                        backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-secondary-strong) 8%, transparent)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        outline: focusedRowIndex === rowIndex ? '1px solid var(--theme-secondary-strong)' : 'none',
                        outlineOffset: '-1px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#0f1728';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: cellPad }} onClick={(e) => toggleSelectTrade(trade.id, e)}>
                        {isSelected ? <CheckSquare size={16} color="var(--theme-secondary-strong)" /> : <Square size={16} color="#475569" />}
                      </td>
                      <td style={{ padding: cellPad, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {formatDateTimeDDMMYYYY(trade.entryDate)}
                        </div>
                        {trade.exitDate && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            Closed: {formatDateTimeDDMMYYYY(trade.exitDate)} {tradeHolding ? `(${tradeHolding})` : ''}
                          </div>
                        )}
                      </td>
                      {columns.account && (<td style={{ padding: cellPad }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: account?.colorTag || 'var(--theme-secondary-strong)' }} />
                          {account?.name || 'Account'}
                        </span>
                      </td>)}
                      <td style={{ padding: cellPad, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {trade.symbol}
                      </td>
                      <td style={{ padding: cellPad }}>
                        <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {trade.direction}
                        </span>
                      </td>
                      {columns.setup && (
                        <td
                          style={{ padding: cellPad, color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({ tradeId: trade.id, field: 'setup' });
                          }}
                          title="Click to edit"
                        >
                          {editingCell && editingCell.tradeId === trade.id && editingCell.field === 'setup' ? (
                            <span data-editing-cell>
                              <input
                                autoFocus
                                className="input-control"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', minWidth: '130px' }}
                                defaultValue={trade.setup}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  const el = e.target as HTMLInputElement;
                                  if (e.key === 'Enter') el.blur();
                                  if (e.key === 'Escape') {
                                    el.dataset.cancel = '1';
                                    el.blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  const el = e.target as HTMLInputElement;
                                  const val = el.value.trim();
                                  if (!el.dataset.cancel && val && val !== trade.setup) {
                                    updateTrade(trade.id, { setup: val });
                                  }
                                  setEditingCell(null);
                                }}
                              />
                            </span>
                          ) : (
                            trade.setup
                          )}
                        </td>
                      )}
                      {columns.session && (<td style={{ padding: cellPad }}>
                        <span className="badge badge-session" style={{ fontSize: '0.7rem' }}>
                          {trade.session}
                        </span>
                      </td>)}
                      {columns.qty && (<td style={{ padding: cellPad, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>
                        {trade.quantity}
                      </td>)}
                      {columns.rr && (<td style={{ padding: cellPad, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>
                        {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(1)}` : '-'}
                      </td>)}
                      <td style={{
                        padding: cellPad,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : 'var(--text-secondary)'
                      }}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, account?.currency || 'USD')}
                      </td>
                      {columns.status && (
                        <td style={{ padding: cellPad, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {editingCell && editingCell.tradeId === trade.id && editingCell.field === 'status' ? (
                            <div data-editing-cell style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {(['WIN', 'LOSS', 'BREAKEVEN', 'OPEN'] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '0.62rem', backgroundColor: s === trade.status ? 'var(--theme-secondary-strong)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: s === trade.status ? '#ffffff' : 'var(--text-secondary)' }}
                                  onClick={() => {
                                    if (s !== trade.status) updateTrade(trade.id, { status: s });
                                    setEditingCell(null);
                                  }}
                                >
                                  {s === 'BREAKEVEN' ? 'BE' : s}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span
                              className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}
                              title="Click to change status"
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ tradeId: trade.id, field: 'status' });
                              }}
                            >
                              {trade.status}
                            </span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: cellPad, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            onClick={() => onEditTrade(trade)}
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit Trade"
                            aria-label="Edit Trade"
                          >
                            <Edit3 size={14} color="var(--text-secondary)" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: `Delete trade ${trade.symbol}?`,
                                message: 'This trade will be permanently removed from your journal.',
                                confirmText: 'Delete trade',
                                variant: 'danger'
                              });
                              if (confirmed) {
                                deleteTrade(trade.id);
                              }
                            }}
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Delete Trade"
                            aria-label="Delete Trade"
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showing {filteredTrades.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredTrades.length)} of {filteredTrades.length} trades
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={safePage <= 1}
              style={safePage <= 1 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={safePage >= totalPages}
              style={safePage >= totalPages ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Executive PDF Audit Report Modal */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
