import React, { useMemo } from 'react';
import { Trade, Currency } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { 
  Clock, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Hourglass, 
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface HoldingDurationMatrixProps {
  trades: Trade[];
  currency?: Currency;
}

interface DurationBracket {
  id: string;
  name: string;
  timeframeLabel: string;
  icon: any;
  color: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgRR: number;
}

export const HoldingDurationMatrix: React.FC<HoldingDurationMatrixProps> = ({
  trades,
  currency = 'USD'
}) => {
  const bracketsData = useMemo(() => {
    const closedTrades = trades.filter(t => t.entryDate && t.exitDate && t.status !== 'OPEN');

    const brackets: Record<string, { trades: Trade[] }> = {
      scalp: { trades: [] },
      intraday: { trades: [] },
      daytrade: { trades: [] },
      swing: { trades: [] }
    };

    closedTrades.forEach(t => {
      const start = new Date(t.entryDate).getTime();
      const end = new Date(t.exitDate!).getTime();
      const durationMins = (end - start) / (1000 * 60);

      if (isNaN(durationMins) || durationMins < 0) {
        // Fallback to timeframe estimation
        if (['1m', '3m', '5m'].includes(t.timeframe)) {
          brackets.scalp.trades.push(t);
        } else if (['15m', '30m', '1h'].includes(t.timeframe)) {
          brackets.intraday.trades.push(t);
        } else if (['4h'].includes(t.timeframe)) {
          brackets.daytrade.trades.push(t);
        } else {
          brackets.swing.trades.push(t);
        }
      } else if (durationMins < 15) {
        brackets.scalp.trades.push(t);
      } else if (durationMins <= 240) { // <= 4 hours
        brackets.intraday.trades.push(t);
      } else if (durationMins <= 1440) { // <= 24 hours
        brackets.daytrade.trades.push(t);
      } else {
        brackets.swing.trades.push(t);
      }
    });

    const definitions: { id: string; name: string; label: string; icon: any; color: string }[] = [
      { id: 'scalp', name: 'Scalping', label: '< 15 Menit', icon: Zap, color: '#38bdf8' },
      { id: 'intraday', name: 'Intraday Focus', label: '15m – 4 Jam', icon: Target, color: '#10b981' },
      { id: 'daytrade', name: 'Extended Day Trade', label: '4 Jam – 24 Jam', icon: Clock, color: '#f59e0b' },
      { id: 'swing', name: 'Multi-Day Swing', label: '> 1 Hari', icon: Hourglass, color: '#a855f7' }
    ];

    return definitions.map(def => {
      const bTrades = brackets[def.id]?.trades || [];
      const totalCount = bTrades.length;
      const wins = bTrades.filter(t => t.status === 'WIN' || t.pnl > 0).length;
      const losses = bTrades.filter(t => t.status === 'LOSS' || t.pnl < 0).length;
      const winRate = totalCount > 0 ? (wins / totalCount) * 100 : 0;
      const pnl = bTrades.reduce((sum, t) => sum + t.pnl, 0);
      const grossProfit = bTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(bTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
      const rrs = bTrades.filter(t => t.rrAchieved).map(t => t.rrAchieved!);
      const avgRR = rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;

      return {
        id: def.id,
        name: def.name,
        timeframeLabel: def.label,
        icon: def.icon,
        color: def.color,
        trades: totalCount,
        wins,
        losses,
        winRate,
        pnl,
        grossProfit,
        grossLoss,
        profitFactor,
        avgRR
      };
    });
  }, [trades]);

  // Find best edge duration bracket
  const bestBracket = useMemo(() => {
    const valid = bracketsData.filter(b => b.trades > 0);
    if (valid.length === 0) return null;
    return valid.reduce((best, cur) => cur.pnl > best.pnl ? cur : best, valid[0]);
  }, [bracketsData]);

  return (
    <div className="card" style={{ padding: '22px', marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#38bdf8" />
            <span>Trade Holding Duration & Time Edge Matrix</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
            Temukan durasi tahan posisi yang menghasilkan win rate & profitabilitas tertinggi bagi Anda
          </p>
        </div>

        {bestBracket && bestBracket.pnl > 0 && (
          <div style={{
            padding: '6px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={15} color="#10b981" />
            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
              Sharpest Edge: <strong>{bestBracket.name} ({bestBracket.timeframeLabel})</strong>
            </span>
          </div>
        )}
      </div>

      {/* 4 Brackets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {bracketsData.map((bracket) => {
          const Icon = bracket.icon;
          const isProfitable = bracket.pnl >= 0;

          return (
            <div
              key={bracket.id}
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: '#070b16',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: '0.2s'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: `${bracket.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={16} color={bracket.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                        {bracket.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {bracket.timeframeLabel}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: bracket.trades > 0 ? '#1e293b' : 'rgba(255,255,255,0.04)',
                    color: bracket.trades > 0 ? '#cbd5e1' : '#64748b'
                  }}>
                    {bracket.trades} Trades
                  </span>
                </div>

                {/* Net PnL */}
                <div style={{ marginTop: '12px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Return</div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: bracket.trades === 0 ? '#64748b' : isProfitable ? '#10b981' : '#ef4444',
                    marginTop: '2px'
                  }}>
                    {bracket.trades === 0 ? '-' : `${bracket.pnl >= 0 ? '+' : ''}${formatCurrency(bracket.pnl, currency)}`}
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Win Rate</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: bracket.winRate >= 50 ? '#34d399' : '#f87171' }}>
                      {bracket.trades > 0 ? `${bracket.winRate.toFixed(0)}%` : '-'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Profit Factor</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                      {bracket.trades > 0 ? bracket.profitFactor.toFixed(2) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edge Status Badge */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {bracket.trades === 0 ? (
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Belum ada data eksekusi</span>
                ) : bracket.pnl > 0 && bracket.winRate >= 55 ? (
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} color="#10b981" /> High-Performing Edge
                  </span>
                ) : bracket.pnl < 0 ? (
                  <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>
                    ⚠️ Potential Drag / Negative Edge
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    ⚖️ Moderate Performance
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
