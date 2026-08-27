import React from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Currency } from '../../types';
import { 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Target, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Info
} from 'lucide-react';

interface VisualRiskRewardOverlayProps {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskAmount: number;
  potentialReward: number;
  rrRatio: number;
  riskPercent: number;
  currency?: Currency;
  instrument?: string;
}

export const VisualRiskRewardOverlay: React.FC<VisualRiskRewardOverlayProps> = ({
  entryPrice,
  stopLossPrice,
  takeProfitPrice,
  riskAmount,
  potentialReward,
  rrRatio,
  riskPercent,
  currency = 'USD',
  instrument = 'Gold'
}) => {
  const isLong = takeProfitPrice >= entryPrice;
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const rewardDistance = Math.abs(takeProfitPrice - entryPrice);

  // Mathematical Break-Even Winrate required
  const breakEvenWinRate = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 50;

  // Reward % of account
  const rewardPercent = riskPercent * rrRatio;

  // Ratio height scale (bounded between 20% and 80%)
  const totalDistance = stopDistance + rewardDistance;
  const rewardHeightPercent = totalDistance > 0 ? Math.min(80, Math.max(25, (rewardDistance / totalDistance) * 100)) : 60;
  const riskHeightPercent = 100 - rewardHeightPercent;

  return (
    <div className="card" style={{ padding: '20px', marginTop: '20px', background: 'linear-gradient(135deg, #070b16, #0c1222)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Scale size={18} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Interactive Visual Risk-to-Reward Scale</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: isLong ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isLong ? '#34d399' : '#f87171',
                border: isLong ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
              }}>
                {isLong ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    BUY / LONG
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    SELL / SHORT
                  </span>
                )}
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Visualisasi proporsi area resiko vs target profit & batas impas matematis
            </span>
          </div>
        </div>

        {/* Big R:R Multiplier Badge */}
        <div style={{
          padding: '6px 14px',
          borderRadius: '10px',
          backgroundColor: rrRatio >= 3.0 ? 'rgba(16, 185, 129, 0.15)' : rrRatio >= 2.0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: rrRatio >= 3.0 ? '1px solid rgba(16, 185, 129, 0.4)' : rrRatio >= 2.0 ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>R-Multiple Ratio</div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            color: rrRatio >= 3.0 ? '#34d399' : rrRatio >= 2.0 ? '#60a5fa' : '#fbbf24'
          }}>
            1 : {rrRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Visual Diagram Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', alignItems: 'center' }}>
        {/* Vertical Candlestick-style Risk/Reward Scale */}
        <div style={{
          height: '240px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #1e293b',
          backgroundColor: '#040711',
          position: 'relative'
        }}>
          {/* Take Profit Zone (Green) */}
          <div style={{
            height: `${rewardHeightPercent}%`,
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.35), rgba(16, 185, 129, 0.12))',
            borderBottom: '2px dashed #10b981',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px',
            position: 'relative'
          }}>
            <Target size={14} color="#10b981" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              TP ({rrRatio}R)
            </span>
            <span style={{ fontSize: '0.64rem', color: '#a7f3d0', fontFamily: 'var(--font-mono)' }}>
              +{rewardPercent.toFixed(1)}%
            </span>
          </div>

          {/* Entry Level Line Indicator */}
          <div style={{
            position: 'absolute',
            top: `${rewardHeightPercent}%`,
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            height: '3px',
            backgroundColor: '#f8fafc',
            boxShadow: '0 0 8px #ffffff',
            zIndex: 10
          }} />

          {/* Stop Loss Zone (Red) */}
          <div style={{
            height: `${riskHeightPercent}%`,
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.35))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px'
          }}>
            <ShieldAlert size={14} color="#ef4444" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              SL (1R)
            </span>
            <span style={{ fontSize: '0.64rem', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
              -{riskPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Detailed Mathematical & Price Levels Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Target Price Card */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>
                Take Profit Target Level
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {takeProfitPrice.toFixed(2)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Potensi Laba</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                +{formatCurrency(potentialReward, currency)}
              </div>
            </div>
          </div>

          {/* Entry Price Card */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#070b16',
            border: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Entry Pivot Price
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {entryPrice.toFixed(2)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Jarak SL / TP</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                {stopDistance.toFixed(2)} / {rewardDistance.toFixed(2)} pts
              </div>
            </div>
          </div>

          {/* Stop Loss Price Card */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>
                Stop Loss Risk Level
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {stopLossPrice.toFixed(2)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Maksimal Resiko</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                -{formatCurrency(riskAmount, currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Break-Even Winrate Insight Banner */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        borderRadius: '10px',
        backgroundColor: '#040711',
        border: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
            Batas Winrate Minimal untuk Impas (Break-Even):
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.86rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: breakEvenWinRate <= 35 ? '#34d399' : '#fbbf24'
          }}>
            Cukup {breakEvenWinRate.toFixed(1)}% Win Rate
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            (Dengan rasio 1:{rrRatio}, Anda tetap profit meski 60%+ trade Anda rugi!)
          </span>
        </div>
      </div>
    </div>
  );
};
