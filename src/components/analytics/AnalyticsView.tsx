import React, { useState, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency, formatPercent, formatDuration } from '../../utils/formatters';
import { 
  BarChart3, 
  BrainCircuit, 
  Clock, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ShieldCheck,
  Flame,
  Award,
  FileText,
  Printer
} from 'lucide-react';
import { MonteCarloView } from './MonteCarloView';
import { HoldingDurationMatrix } from './HoldingDurationMatrix';
import { WinrateRRRMatrix } from './WinrateRRRMatrix';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';
import { Trade } from '../../types';

export const AnalyticsView: React.FC = () => {
  const { filteredTrades, activeAccount, metrics } = useJournal();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const currentCurrency = activeAccount?.currency || 'USD';

  // Strategy performance breakdown
  const strategyStats = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; losses: number; pnl: number; grossProfit: number; grossLoss: number; rrs: number[]; holdingMinutes: number[] }> = {};

    filteredTrades.forEach(t => {
      if (!map[t.setup]) {
        map[t.setup] = { trades: 0, wins: 0, losses: 0, pnl: 0, grossProfit: 0, grossLoss: 0, rrs: [], holdingMinutes: [] };
      }
      map[t.setup].trades += 1;
      map[t.setup].pnl += t.pnl;
      if (t.status === 'WIN') {
        map[t.setup].wins += 1;
        map[t.setup].grossProfit += Math.max(0, t.pnl);
      } else if (t.status === 'LOSS') {
        map[t.setup].losses += 1;
        map[t.setup].grossLoss += Math.abs(Math.min(0, t.pnl));
      }
      if (t.rrAchieved) map[t.setup].rrs.push(t.rrAchieved);

      if (t.entryDate && t.exitDate) {
        const start = new Date(t.entryDate).getTime();
        const end = new Date(t.exitDate).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          map[t.setup].holdingMinutes.push((end - start) / (1000 * 60));
        }
      }
    });

    return Object.entries(map).map(([setup, s]) => {
      const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
      const profitFactor = s.grossLoss > 0 ? s.grossProfit / s.grossLoss : s.grossProfit > 0 ? s.grossProfit : 0;
      const avgRR = s.rrs.length > 0 ? s.rrs.reduce((a, b) => a + b, 0) / s.rrs.length : 0;
      const avgHoldingMins = s.holdingMinutes.length > 0
        ? s.holdingMinutes.reduce((a, b) => a + b, 0) / s.holdingMinutes.length
        : 0;
      const avgHoldingFormatted = formatDuration(avgHoldingMins);
      return { setup, ...s, winRate, profitFactor, avgRR, avgHoldingFormatted };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Session performance breakdown
  const sessionStats = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; losses: number; pnl: number }> = {};
    filteredTrades.forEach(t => {
      if (!map[t.session]) {
        map[t.session] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      }
      map[t.session].trades += 1;
      map[t.session].pnl += t.pnl;
      if (t.status === 'WIN') map[t.session].wins += 1;
      if (t.status === 'LOSS') map[t.session].losses += 1;
    });

    return Object.entries(map).map(([session, s]) => ({
      session,
      ...s,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Psychology & Emotion performance breakdown
  const emotionStats = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; losses: number; pnl: number }> = {};
    filteredTrades.forEach(t => {
      if (!map[t.emotion]) {
        map[t.emotion] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      }
      map[t.emotion].trades += 1;
      map[t.emotion].pnl += t.pnl;
      if (t.status === 'WIN') map[t.emotion].wins += 1;
      if (t.status === 'LOSS') map[t.emotion].losses += 1;
    });

    return Object.entries(map).map(([emotion, s]) => ({
      emotion,
      ...s,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Symbol breakdown
  const symbolStats = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; losses: number; pnl: number }> = {};
    filteredTrades.forEach(t => {
      if (!map[t.symbol]) {
        map[t.symbol] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      }
      map[t.symbol].trades += 1;
      map[t.symbol].pnl += t.pnl;
      if (t.status === 'WIN') map[t.symbol].wins += 1;
      if (t.status === 'LOSS') map[t.symbol].losses += 1;
    });

    return Object.entries(map).map(([symbol, s]) => ({
      symbol,
      ...s,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Long vs Short breakdown
  const directionStats = useMemo(() => {
    const longs = filteredTrades.filter(t => t.direction === 'LONG');
    const shorts = filteredTrades.filter(t => t.direction === 'SHORT');

    const longWins = longs.filter(t => t.status === 'WIN').length;
    const shortWins = shorts.filter(t => t.status === 'WIN').length;

    const longPnL = longs.reduce((sum, t) => sum + t.pnl, 0);
    const shortPnL = shorts.reduce((sum, t) => sum + t.pnl, 0);

    return {
      longs: {
        total: longs.length,
        wins: longWins,
        winRate: longs.length > 0 ? (longWins / longs.length) * 100 : 0,
        pnl: longPnL
      },
      shorts: {
        total: shorts.length,
        wins: shortWins,
        winRate: shorts.length > 0 ? (shortWins / shorts.length) * 100 : 0,
        pnl: shortPnL
      }
    };
  }, [filteredTrades]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={24} color="#3b82f6" />
            <span>Strategy & Edge Analytics</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Data-driven edge analysis across trading models, market sessions, and psychological states
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="btn btn-primary min-h-touch px-4.5 font-semibold flex items-center gap-2"
        >
          <FileText size={16} />
          <span>Executive PDF Audit Report</span>
        </button>
      </div>

      {/* Long vs Short Direction Comparison Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), #090e1c)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--profit-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={18} /> LONG (Buy) Performance
            </span>
            <span className="badge badge-long">{directionStats.longs.total} Trades</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Win Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {directionStats.longs.winRate.toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {directionStats.longs.wins} Wins / {directionStats.longs.total - directionStats.longs.wins} Losses
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Net PnL</div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: directionStats.longs.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
              }}>
                {directionStats.longs.pnl >= 0 ? '+' : ''}{formatCurrency(directionStats.longs.pnl, currentCurrency)}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), #090e1c)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--loss-red)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown size={18} /> SHORT (Sell) Performance
            </span>
            <span className="badge badge-short">{directionStats.shorts.total} Trades</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Win Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {directionStats.shorts.winRate.toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {directionStats.shorts.wins} Wins / {directionStats.shorts.total - directionStats.shorts.wins} Losses
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Net PnL</div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: directionStats.shorts.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
              }}>
                {directionStats.shorts.pnl >= 0 ? '+' : ''}{formatCurrency(directionStats.shorts.pnl, currentCurrency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Performance Matrix */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <Zap size={18} color="#3b82f6" />
            <span>Setup & Strategy Performance Matrix</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ranked by Net PnL</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#070b17', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Setup Model</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trades</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Win Rate</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Profit Factor</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Avg R:R</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Avg Holding</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Realized PnL</th>
              </tr>
            </thead>
            <tbody>
              {strategyStats.map((strat, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #141d2d' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                    {strat.setup}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    {strat.trades}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: strat.winRate >= 50 ? 'var(--profit-green)' : 'var(--loss-red)'
                    }}>
                      {strat.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {strat.profitFactor > 99 ? '99.0+' : strat.profitFactor.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {strat.avgRR > 0 ? `1:${strat.avgRR.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {strat.avgHoldingFormatted}
                  </td>
                  <td style={{
                    padding: '12px 14px',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: strat.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                  }}>
                    {strat.pnl > 0 ? '+' : ''}{formatCurrency(strat.pnl, currentCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Psychology Impact & Session Performance 2-Column Grid */}
      <div className="grid-2col">
        {/* Psychology Impact */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BrainCircuit size={18} color="#8b5cf6" />
              <span>Psychology & Emotion Impact</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {emotionStats.map((item, idx) => {
              const isGood = item.pnl >= 0;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#060913',
                    border: '1px solid #1a2538',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                      {item.emotion}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {item.trades} trades • {item.winRate.toFixed(0)}% Win Rate
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: isGood ? 'var(--profit-green)' : 'var(--loss-red)'
                  }}>
                    {item.pnl > 0 ? '+' : ''}{formatCurrency(item.pnl, currentCurrency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} color="#f59e0b" />
              <span>Trading Session Distribution</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessionStats.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#060913',
                  border: '1px solid #1a2538',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    {item.session}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.trades} executions • {item.winRate.toFixed(0)}% Win Rate
                  </span>
                </div>

                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: item.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                }}>
                  {item.pnl > 0 ? '+' : ''}{formatCurrency(item.pnl, currentCurrency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trade Holding Duration & Time Edge Matrix */}
      <HoldingDurationMatrix trades={filteredTrades} currency={currentCurrency} />

      {/* Winrate vs RRR Sensitivity Threshold */}
      <WinrateRRRMatrix />

      {/* Monte Carlo Risk & Equity Forecaster Engine */}
      <MonteCarloView />

      {/* Executive PDF Audit Report Modal */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
