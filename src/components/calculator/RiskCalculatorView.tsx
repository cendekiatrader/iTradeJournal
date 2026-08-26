import React, { useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency } from '../../utils/formatters';
import { 
  Calculator, 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Copy, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const RiskCalculatorView: React.FC<{ onLogTradeWithValues?: (values: any) => void }> = ({
  onLogTradeWithValues
}) => {
  const { accounts, activeAccount, showToast } = useJournal();

  const [selectedAccountId, setSelectedAccountId] = useState(activeAccount?.id || accounts[0]?.id || '');
  const [instrument, setInstrument] = useState<'Gold' | 'Forex' | 'Crypto' | 'Indices'>('Gold');
  const [balance, setBalance] = useState<number>(activeAccount?.currentBalance || 100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(2500.00);
  const [stopLossPrice, setStopLossPrice] = useState<number>(2490.00);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(2530.00);
  const [copied, setCopied] = useState(false);

  // Sync balance when account changes
  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setBalance(acc.currentBalance);
    }
  };

  // Calculations
  const riskAmount = (balance * riskPercent) / 100;
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const rewardDistance = Math.abs(takeProfitPrice - entryPrice);

  let lotSize = 0;
  let pips = 0;

  if (stopDistance > 0) {
    if (instrument === 'Gold') {
      // 1 Lot XAUUSD: $1 move = $100
      lotSize = riskAmount / (stopDistance * 100);
      pips = stopDistance * 10;
    } else if (instrument === 'Forex') {
      // Standard pair: 1 pip = 0.0001 ($10 per lot)
      const pipSize = 0.0001;
      pips = stopDistance / pipSize;
      lotSize = riskAmount / (pips * 10);
    } else if (instrument === 'Crypto') {
      // Direct unit contracts
      lotSize = riskAmount / stopDistance;
      pips = stopDistance;
    } else if (instrument === 'Indices') {
      // US30/NQ: 1 point = $1 or $20 per contract
      lotSize = riskAmount / (stopDistance * 5);
      pips = stopDistance;
    }
  }

  const rrRatio = stopDistance > 0 ? Number((rewardDistance / stopDistance).toFixed(2)) : 0;
  const potentialReward = riskAmount * rrRatio;

  const unitLabel = instrument === 'Crypto' ? 'Units' : instrument === 'Indices' ? 'Contracts' : 'Lots';
  const formattedSize = lotSize > 0 ? (instrument === 'Crypto' ? (lotSize >= 10 ? lotSize.toFixed(2) : lotSize.toFixed(4)) : lotSize.toFixed(2)) : '0.00';

  const copyLotSize = () => {
    navigator.clipboard.writeText(formattedSize);
    setCopied(true);
    showToast(`Copied ${formattedSize} ${unitLabel.toLowerCase()} to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calculator size={24} color="#3b82f6" />
          <span>Position Size & Risk Calculator</span>
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Crypto units, Forex/Gold lot sizing & precise risk-to-reward planner
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Input Parameters Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldAlert size={18} color="#3b82f6" />
              <span>Risk Inputs & Parameters</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Account Selector */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Select Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="input-control"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Instrument Class */}
            <div>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Market Instrument</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {(['Gold', 'Forex', 'Crypto', 'Indices'] as const).map(inst => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => {
                      setInstrument(inst);
                      if (inst === 'Gold') {
                        setEntryPrice(2500.0);
                        setStopLossPrice(2492.0);
                        setTakeProfitPrice(2524.0);
                      } else if (inst === 'Forex') {
                        setEntryPrice(1.0950);
                        setStopLossPrice(1.0920);
                        setTakeProfitPrice(1.1040);
                      } else if (inst === 'Crypto') {
                        setEntryPrice(62000);
                        setStopLossPrice(61000);
                        setTakeProfitPrice(65000);
                      } else if (inst === 'Indices') {
                        setEntryPrice(41000);
                        setStopLossPrice(40900);
                        setTakeProfitPrice(41300);
                      }
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: instrument === inst ? '#3b82f6' : '#1e293b',
                      backgroundColor: instrument === inst ? '#1e293b' : '#080c18',
                      color: instrument === inst ? '#60a5fa' : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Balance */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Account Balance ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            {/* Risk Percentage Tabs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="input-label">Risk Per Trade (%)</label>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss-red)' }}>
                  -${riskAmount.toFixed(2)} Risk
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                {[0.5, 1.0, 1.5, 2.0].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRiskPercent(pct)}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: riskPercent === pct ? '#ef4444' : '#1e293b',
                      backgroundColor: riskPercent === pct ? 'rgba(239, 68, 68, 0.15)' : '#080c18',
                      color: riskPercent === pct ? 'var(--loss-red)' : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {pct}% Risk
                  </button>
                ))}
              </div>
            </div>

            {/* Price Levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="input-control font-mono"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="input-control font-mono"
                  style={{ color: 'var(--loss-red)' }}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                  className="input-control font-mono"
                  style={{ color: 'var(--profit-green)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Result Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0d1424, #070a16)', borderColor: '#263750' }}>
          <div>
            <div className="card-header">
              <div className="card-title">
                <Target size={18} color="var(--profit-green)" />
                <span>Recommended Execution Sizing</span>
              </div>
            </div>

            {/* Big Position Size Display */}
            <div style={{ backgroundColor: '#060913', padding: '20px', borderRadius: '12px', border: '1px solid #1a2538', textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recommended Position Size ({unitLabel})
              </span>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: '#60a5fa',
                letterSpacing: '-0.02em',
                margin: '6px 0'
              }}>
                {formattedSize} <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{unitLabel}</span>
              </div>

              <button
                onClick={copyLotSize}
                className="btn btn-secondary btn-sm"
                style={{ margin: '0 auto', fontSize: '0.75rem' }}
              >
                {copied ? <Check size={14} color="var(--profit-green)" /> : <Copy size={14} />}
                {copied ? 'Copied to Clipboard!' : `Copy ${unitLabel}`}
              </button>
            </div>

            {/* Risk / Reward Metrics Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '8px', border: '1px solid #192436' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Planned Risk Amount</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss-red)' }}>
                  -${riskAmount.toFixed(2)} ({riskPercent}%)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '8px', border: '1px solid #192436' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Potential Reward Amount</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                  +${potentialReward.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#060913', borderRadius: '8px', border: '1px solid #192436' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Risk to Reward (R:R)</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: rrRatio >= 2 ? 'var(--profit-green)' : '#f59e0b' }}>
                  1 : {rrRatio}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Risk Management Guideline: Never risk &gt; 2.0% per trade on any single idea.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
