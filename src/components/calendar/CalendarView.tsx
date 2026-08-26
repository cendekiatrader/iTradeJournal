import React, { useState, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Trade } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Sparkles,
  Layers,
  X
} from 'lucide-react';

interface CalendarViewProps {
  onViewTradeDetail: (trade: Trade) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onViewTradeDetail }) => {
  const { filteredTrades, activeAccount, accountsMap } = useJournal();
  const currentCurrency = activeAccount?.currency || 'USD';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: Trade[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Map trades by day (YYYY-MM-DD)
  const tradesByDay = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    filteredTrades.forEach(t => {
      const dayKey = t.entryDate.split('T')[0];
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(t);
    });
    return map;
  }, [filteredTrades]);

// RRR calculation helpers
const calculateTradeR = (trade: Trade): number => {
  if (trade.status === 'WIN') {
    if (typeof trade.rrAchieved === 'number' && trade.rrAchieved > 0) {
      return trade.rrAchieved;
    }
    if (typeof trade.rrPlanned === 'number' && trade.rrPlanned > 0) {
      return trade.rrPlanned;
    }
    return 2.0;
  }
  if (trade.status === 'LOSS') {
    return -1.0;
  }
  return 0.0;
};

const formatRMultiple = (r: number): string => {
  const rounded = Math.round(r * 10) / 10;
  const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return r >= 0 ? `+${formatted}R` : `${formatted}R`;
};

// Calendar Grid generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon
    // Adjust to Monday start: (day + 6) % 7
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      trades: Trade[];
      netPnL: number;
      wins: number;
      losses: number;
      totalR: number;
      formattedR: string;
    }> = [];

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, dayNum);
      const dateStr = prevMonthDate.toISOString().split('T')[0];
      const dayTrades = tradesByDay[dateStr] || [];
      const netPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = dayTrades.filter(t => t.status === 'WIN').length;
      const losses = dayTrades.filter(t => t.status === 'LOSS').length;
      const totalR = dayTrades.reduce((sum, t) => sum + calculateTradeR(t), 0);
      const formattedR = formatRMultiple(totalR);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        trades: dayTrades,
        netPnL,
        wins,
        losses,
        totalR,
        formattedR
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const yearStr = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      const dayTrades = tradesByDay[dateStr] || [];
      const netPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = dayTrades.filter(t => t.status === 'WIN').length;
      const losses = dayTrades.filter(t => t.status === 'LOSS').length;
      const totalR = dayTrades.reduce((sum, t) => sum + calculateTradeR(t), 0);
      const formattedR = formatRMultiple(totalR);

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        trades: dayTrades,
        netPnL,
        wins,
        losses,
        totalR,
        formattedR
      });
    }

    // Next month filler to complete 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      const dateStr = nextMonthDate.toISOString().split('T')[0];
      const dayTrades = tradesByDay[dateStr] || [];
      const netPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = dayTrades.filter(t => t.status === 'WIN').length;
      const losses = dayTrades.filter(t => t.status === 'LOSS').length;
      const totalR = dayTrades.reduce((sum, t) => sum + calculateTradeR(t), 0);
      const formattedR = formatRMultiple(totalR);

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        trades: dayTrades,
        netPnL,
        wins,
        losses,
        totalR,
        formattedR
      });
    }

    return days;
  }, [year, month, tradesByDay]);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const currentMonthDays = calendarDays.filter(d => d.isCurrentMonth && d.trades.length > 0);
    const totalMonthPnL = currentMonthDays.reduce((sum, d) => sum + d.netPnL, 0);
    const greenDays = currentMonthDays.filter(d => d.netPnL > 0).length;
    const redDays = currentMonthDays.filter(d => d.netPnL < 0).length;
    const totalTradingDays = currentMonthDays.length;
    const dayWinRate = totalTradingDays > 0 ? (greenDays / totalTradingDays) * 100 : 0;
    const totalMonthTrades = currentMonthDays.reduce((sum, d) => sum + d.trades.length, 0);
    const totalMonthR = currentMonthDays.reduce((sum, d) => sum + d.totalR, 0);
    const formattedMonthR = formatRMultiple(totalMonthR);
    const avgDailyR = totalTradingDays > 0 ? totalMonthR / totalTradingDays : 0;

    return { 
      totalMonthPnL, 
      greenDays, 
      redDays, 
      totalTradingDays, 
      dayWinRate, 
      totalMonthTrades,
      totalMonthR,
      formattedMonthR,
      avgDailyR
    };
  }, [calendarDays]);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      {/* Calendar Header & Month Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={24} color="#3b82f6" />
            <span>Trading Calendar & Heatmap</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Daily performance log & trade consistency tracking
          </p>
        </div>

        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0b1020', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '4px 8px' }}>
          <button onClick={prevMonth} className="btn btn-ghost btn-icon btn-sm">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, minWidth: '150px', textAlign: 'center', color: '#f8fafc' }}>
            {monthName}
          </span>
          <button onClick={nextMonth} className="btn btn-ghost btn-icon btn-sm">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month Performance Overview Bar */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Month Net PnL</span>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            marginTop: '2px',
            color: monthlyStats.totalMonthPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
          }}>
            {monthlyStats.totalMonthPnL >= 0 ? '+' : ''}{formatCurrency(monthlyStats.totalMonthPnL, currentCurrency)}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Realized RRR</span>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            marginTop: '2px',
            color: monthlyStats.totalMonthR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
          }}>
            {monthlyStats.formattedMonthR}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Avg {formatRMultiple(monthlyStats.avgDailyR)} / trading day
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Day Win Rate</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px', color: '#60a5fa' }}>
            {monthlyStats.dayWinRate.toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {monthlyStats.greenDays} Green / {monthlyStats.redDays} Red Days
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Month Trades</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px', color: '#f8fafc' }}>
            {monthlyStats.totalMonthTrades} Executions
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Across {monthlyStats.totalTradingDays} active days
          </span>
        </div>
      </div>

      {/* Calendar Grid Table */}
      <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
        {/* Days of Week Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '8px', marginBottom: '8px' }}>
          {daysOfWeek.map((day, idx) => (
            <div
              key={idx}
              style={{
                textAlign: 'center',
                padding: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: idx >= 5 ? '#64748b' : '#94a3b8',
                backgroundColor: '#070a16',
                borderRadius: '6px'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Cells Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '8px' }}>
          {calendarDays.map((cell, idx) => {
            const hasTrades = cell.trades.length > 0;
            const isProfitable = cell.netPnL > 0;
            const isLoss = cell.netPnL < 0;

            let bgColor = cell.isCurrentMonth ? '#090d1c' : '#050711';
            let borderColor = '#1a2436';

            if (hasTrades) {
              if (isProfitable) {
                bgColor = 'rgba(16, 185, 129, 0.08)';
                borderColor = 'rgba(16, 185, 129, 0.35)';
              } else if (isLoss) {
                bgColor = 'rgba(239, 68, 68, 0.08)';
                borderColor = 'rgba(239, 68, 68, 0.35)';
              }
            }

            return (
              <div
                key={idx}
                onClick={() => hasTrades && setSelectedDayTrades({ date: cell.dateStr, trades: cell.trades })}
                style={{
                  minHeight: '100px',
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: hasTrades ? 'pointer' : 'default',
                  opacity: cell.isCurrentMonth ? 1 : 0.4,
                  transition: 'transform 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (hasTrades) e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (hasTrades) e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Cell Header: Day Number + Trade Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: cell.isCurrentMonth ? '#cbd5e1' : '#475569'
                  }}>
                    {cell.dayNumber}
                  </span>

                  {hasTrades && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: '#1e293b',
                      color: '#cbd5e1',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      {cell.trades.length} {cell.trades.length === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {/* Day Net PnL & Win/Loss Count & RRR */}
                {hasTrades ? (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: isProfitable ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : '#94a3b8'
                    }}>
                      {cell.netPnL > 0 ? '+' : ''}{formatCurrency(cell.netPnL, currentCurrency, true)}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>{cell.wins}W {cell.losses}L</span>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        color: cell.totalR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)',
                        backgroundColor: cell.totalR >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${cell.totalR >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {cell.formattedR}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: '#334155' }}>-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Trades Modal */}
      {selectedDayTrades && (() => {
        const dayNetPnL = selectedDayTrades.trades.reduce((sum, t) => sum + t.pnl, 0);
        const dayWins = selectedDayTrades.trades.filter(t => t.status === 'WIN').length;
        const dayLosses = selectedDayTrades.trades.filter(t => t.status === 'LOSS').length;
        const dayTotalR = selectedDayTrades.trades.reduce((sum, t) => sum + calculateTradeR(t), 0);
        const dayFormattedR = formatRMultiple(dayTotalR);

        return (
          <div className="modal-backdrop" onClick={() => setSelectedDayTrades(null)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '660px' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                    Trades on {formatDate(selectedDayTrades.date)}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {selectedDayTrades.trades.length} Executions Logged
                  </span>
                </div>
                <button onClick={() => setSelectedDayTrades(null)} className="btn btn-ghost btn-icon">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {/* Day Summary Highlights Banner */}
                <div style={{
                  backgroundColor: '#070b18',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #1a253a',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Day Realized PnL</span>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: dayNetPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                    }}>
                      {dayNetPnL >= 0 ? '+' : ''}{formatCurrency(dayNetPnL, currentCurrency)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Win / Loss</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {dayWins}W • {dayLosses}L
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Day RRR</span>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: dayTotalR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                    }}>
                      {dayFormattedR}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedDayTrades.trades.map((trade) => {
                    const isWin = trade.status === 'WIN';
                    const isLoss = trade.status === 'LOSS';
                    const tradeR = calculateTradeR(trade);
                    const formattedTradeR = formatRMultiple(tradeR);
                    const account = accountsMap[trade.accountId];

                    return (
                      <div
                        key={trade.id}
                        onClick={() => {
                          setSelectedDayTrades(null);
                          onViewTradeDetail(trade);
                        }}
                        style={{
                          padding: '14px',
                          backgroundColor: '#070a16',
                          border: '1px solid #1c283d',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f1628')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#070a16')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#f8fafc' }}>
                              {trade.symbol}
                            </span>
                            <span className={`badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                              {trade.direction}
                            </span>
                            <span className="badge badge-session" style={{ fontSize: '0.68rem' }}>
                              {trade.session}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {trade.setup} • {account?.name}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: isWin ? 'var(--profit-green)' : isLoss ? 'var(--loss-red)' : '#94a3b8'
                          }}>
                            {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl, account?.currency || 'USD')}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: tradeR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)',
                              backgroundColor: tradeR >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: `1px solid ${tradeR >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                            }}>
                              {formattedTradeR}
                            </span>
                            <span className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}>
                              {trade.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => setSelectedDayTrades(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
