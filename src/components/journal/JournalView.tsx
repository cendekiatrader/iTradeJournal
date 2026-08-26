import React, { useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency, formatDate, formatDateTimeDDMMYYYY, formatDuration } from '../../utils/formatters';
import { Trade, AssetClass, StrategyType, TradingSession } from '../../types';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  Eye, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  CheckSquare,
  Square,
  RefreshCw
} from 'lucide-react';
import { exportTradesToCSV } from '../../utils/storage';

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
    bulkDeleteTrades
  } = useJournal();

  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTradeIds.length} selected trades?`)) {
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="#3b82f6" />
            <span>Trading Journal Log</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Comprehensive trade records, institutional setups, and psychological audit
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => exportTradesToCSV(filteredTrades, accountsMap)} 
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
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                  color: filters.status === st ? '#60a5fa' : '#94a3b8',
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

          {(filters.searchQuery || filters.status !== 'all' || filters.direction !== 'all' || filters.assetClass !== 'all' || filters.setup !== 'all' || filters.session !== 'all' || filters.startDate || filters.endDate) && (
            <button onClick={resetFilters} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
              <RefreshCw size={13} /> Reset
            </button>
          )}
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
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
            {selectedTradeIds.length} trade(s) selected
          </span>
          <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Delete Selected
          </button>
        </div>
      )}

      {/* Main Trade Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#070b17', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', width: '40px' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {selectedTradeIds.length === filteredTrades.length && filteredTrades.length > 0 ? (
                      <CheckSquare size={16} color="#3b82f6" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('entryDate')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Opened At (DD/MM/YYYY, hh:mm) <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>Account</th>
                <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Symbol <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>Side</th>
                <th style={{ padding: '12px 14px' }}>Setup / Strategy</th>
                <th style={{ padding: '12px 14px' }}>Session</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Lots/Qty</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('rrAchieved')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    R:R <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('pnl')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Net PnL <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No trades match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => {
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
                      onClick={() => onViewTradeDetail(trade)}
                      style={{
                        borderBottom: '1px solid #121a29',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#0f1728';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '12px 14px' }} onClick={(e) => toggleSelectTrade(trade.id, e)}>
                        {isSelected ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} color="#475569" />}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                          {formatDateTimeDDMMYYYY(trade.entryDate)}
                        </div>
                        {trade.exitDate && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            Closed: {formatDateTimeDDMMYYYY(trade.exitDate)} {tradeHolding ? `(${tradeHolding})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: account?.colorTag || '#3b82f6' }} />
                          {account?.name || 'Account'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        {trade.symbol}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {trade.direction}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {trade.setup}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-session" style={{ fontSize: '0.7rem' }}>
                          {trade.session}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                        {trade.quantity}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                        {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(1)}` : '-'}
                      </td>
                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : '#94a3b8'
                      }}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, account?.currency || 'USD')}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            onClick={() => onEditTrade(trade)}
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit Trade"
                          >
                            <Edit3 size={14} color="#94a3b8" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete trade ${trade.symbol}?`)) {
                                deleteTrade(trade.id);
                              }
                            }}
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Delete Trade"
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
      </div>
    </div>
  );
};
