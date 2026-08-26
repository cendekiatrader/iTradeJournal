import React from 'react';
import { TradingAccount, AccountMetrics } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Target, ShieldAlert, AlertTriangle, CheckCircle2, Award } from 'lucide-react';

interface PropFirmGaugeProps {
  account: TradingAccount;
  metrics: AccountMetrics;
}

export const PropFirmGauge: React.FC<PropFirmGaugeProps> = ({ account, metrics }) => {
  const isPropOrChallenge = account.type === 'Prop Firm' || account.type === 'Evaluation/Challenge' || account.type === 'Funded Account';
  
  if (!isPropOrChallenge || !account.targetProfit) {
    return null;
  }

  const currentProfit = Math.max(0, account.currentBalance - account.initialBalance);
  const targetProfit = account.targetProfit;
  const targetProgress = Math.min(100, Math.max(0, (currentProfit / targetProfit) * 100));

  const maxDDPct = account.maxDrawdownPercent || 10;
  const maxDDAllowedAmount = (account.initialBalance * maxDDPct) / 100;
  const currentDDAmount = metrics.maxDrawdown;
  const remainingDDBuffer = Math.max(0, maxDDAllowedAmount - currentDDAmount);
  const ddBufferPercent = (remainingDDBuffer / maxDDAllowedAmount) * 100;

  const isTargetAchieved = currentProfit >= targetProfit;
  const isDrawdownRisk = ddBufferPercent < 40;

  return (
    <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0d1424, #080c18)', borderColor: '#23334d' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#f59e0b" />
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
            Prop Firm Objective Tracker ({account.name})
          </span>
        </div>
        {isTargetAchieved ? (
          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--profit-green)', border: '1px solid var(--profit-green)' }}>
            <CheckCircle2 size={12} /> Target Passed! 🎉
          </span>
        ) : (
          <span className="badge" style={{ backgroundColor: '#1e293b', color: '#93c5fd' }}>
            Phase Evaluation
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Profit Target Progress */}
        <div style={{ backgroundColor: '#060913', padding: '16px', borderRadius: '10px', border: '1px solid #1a2538' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <Target size={14} color="#3b82f6" />
              <span>Profit Target Progress</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
              {targetProgress.toFixed(1)}%
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              width: `${targetProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Made: <strong style={{ color: '#f8fafc' }}>{formatCurrency(currentProfit, account.currency)}</strong></span>
            <span>Goal: <strong style={{ color: '#f8fafc' }}>{formatCurrency(targetProfit, account.currency)}</strong></span>
          </div>
        </div>

        {/* Max Drawdown Limit Gauge */}
        <div style={{ backgroundColor: '#060913', padding: '16px', borderRadius: '10px', border: '1px solid #1a2538' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <ShieldAlert size={14} color={isDrawdownRisk ? '#ef4444' : '#10b981'} />
              <span>Max Drawdown Buffer</span>
            </div>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: isDrawdownRisk ? 'var(--loss-red)' : 'var(--profit-green)'
            }}>
              {ddBufferPercent.toFixed(1)}% Safe
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              width: `${Math.max(0, ddBufferPercent)}%`,
              height: '100%',
              background: isDrawdownRisk ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : 'linear-gradient(90deg, #10b981, #3b82f6)',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Max DD Hit: <strong style={{ color: 'var(--loss-red)' }}>{formatCurrency(currentDDAmount, account.currency)}</strong></span>
            <span>Safety Room: <strong style={{ color: 'var(--profit-green)' }}>{formatCurrency(remainingDDBuffer, account.currency)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
