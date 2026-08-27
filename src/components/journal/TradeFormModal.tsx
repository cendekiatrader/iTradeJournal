import React, { useState, useEffect } from 'react';
import { useJournal } from '../../context/JournalContext';
import { 
  Trade, 
  TradeDirection, 
  TradeStatus, 
  AssetClass, 
  TradingSession, 
  StrategyType, 
  EmotionState 
} from '../../types';
import { 
  X, 
  Plus, 
  Sparkles, 
  Check, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Calendar,
  Calculator,
  Zap,
  Target
} from 'lucide-react';
import { formatDateTimeDDMMYYYY, formatDuration } from '../../utils/formatters';
import { RichTextEditor } from '../common/RichTextEditor';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrade?: Trade | null;
}

const COMMON_SYMBOLS = ['XAUUSD', 'EURUSD', 'BTCUSDT', 'ETHUSDT', 'US30', 'NAS100', 'GBPJPY', 'SOLUSDT', 'NVDA'];

const STRATEGIES: StrategyType[] = [
  'SMC / Liquidity Sweep',
  'HTF FVG & iFVG 50% CE',
  'Turtle Soup Reversal',
  'BOS Trend Continuation',
  'BPR & Order Block',
  'Supply & Demand Bounce',
  'Breakout & Retest',
  'Mean Reversion',
  'Scalping',
  'Other'
];

const CONFLUENCE_SUGGESTIONS = [
  'Asian High/Low Swept',
  '15m FVG Mitigation',
  'Inversion FVG (iFVG) 50% CE',
  'Market Structure Shift (MSS)',
  'Higher Timeframe Order Block',
  'London/NY Open Expansion',
  'Volume Surge / Absorption',
  'Discount / Premium Zone',
  'News Avoidance Followed',
  'MACD / RSI Divergence'
];

const EMOTIONS: EmotionState[] = [
  'Disciplined',
  'Confident',
  'Neutral',
  'FOMO',
  'Revenge Trading',
  'Hesitant / Fearful',
  'Greedy',
  'Overtrading'
];

export const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  onClose,
  initialTrade
}) => {
  const { accounts, activeAccountId, addTrade, updateTrade, showToast } = useJournal();

  const [accountId, setAccountId] = useState(activeAccountId === 'all' ? (accounts[0]?.id || '') : activeAccountId);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [assetClass, setAssetClass] = useState<AssetClass>('Commodities');
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [status, setStatus] = useState<TradeStatus>('WIN');
  const [entryDate, setEntryDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [exitDate, setExitDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [timeframe, setTimeframe] = useState('15m');
  const [entryPrice, setEntryPrice] = useState<number>(2500);
  const [exitPrice, setExitPrice] = useState<number>(2515);
  const [stopLoss, setStopLoss] = useState<number>(2495);
  const [takeProfit, setTakeProfit] = useState<number>(2520);
  const [quantity, setQuantity] = useState<number>(1.0);
  const [pnl, setPnl] = useState<number>(1500);
  const [pips, setPips] = useState<number>(150);
  const [session, setSession] = useState<TradingSession>('London');
  const [setup, setSetup] = useState<StrategyType>('SMC / Liquidity Sweep');
  const [emotion, setEmotion] = useState<EmotionState>('Disciplined');
  const [rulesFollowed, setRulesFollowed] = useState<boolean>(true);
  const [confluences, setConfluences] = useState<string[]>(['Asian High/Low Swept', '15m FVG Mitigation']);
  const [customConfluence, setCustomConfluence] = useState('');
  const [notes, setNotes] = useState('');
  const [lessons, setLessons] = useState('');
  const [screenshotBefore, setScreenshotBefore] = useState('');
  const [screenshotAfter, setScreenshotAfter] = useState('');
  const [riskPercentPreset, setRiskPercentPreset] = useState<number>(1.0);
  const [showQuickSizer, setShowQuickSizer] = useState<boolean>(false);

  useEffect(() => {
    if (initialTrade) {
      setAccountId(initialTrade.accountId);
      setSymbol(initialTrade.symbol);
      setAssetClass(initialTrade.assetClass);
      setDirection(initialTrade.direction);
      setStatus(initialTrade.status);
      setEntryDate(initialTrade.entryDate);
      setExitDate(initialTrade.exitDate || initialTrade.entryDate);
      setTimeframe(initialTrade.timeframe);
      setEntryPrice(initialTrade.entryPrice);
      setExitPrice(initialTrade.exitPrice || initialTrade.entryPrice);
      setStopLoss(initialTrade.stopLoss || 0);
      setTakeProfit(initialTrade.takeProfit || 0);
      setQuantity(initialTrade.quantity);
      setPnl(initialTrade.pnl);
      setPips(initialTrade.pips || 0);
      setSession(initialTrade.session);
      setSetup(initialTrade.setup);
      setEmotion(initialTrade.emotion);
      setRulesFollowed(initialTrade.rulesFollowed);
      setConfluences(initialTrade.confluences || []);
      setNotes(initialTrade.notes || '');
      setLessons(initialTrade.lessons || '');
      setScreenshotBefore(initialTrade.screenshots?.[0] || '');
      setScreenshotAfter(initialTrade.screenshots?.[1] || '');
    } else {
      setAccountId(activeAccountId === 'all' ? (accounts[0]?.id || '') : activeAccountId);
      setScreenshotBefore('');
      setScreenshotAfter('');
    }
  }, [initialTrade, activeAccountId, accounts, isOpen]);

  // Auto calculate Quick Lot & Risk Size
  const currentAccount = accounts.find(a => a.id === accountId) || accounts[0];
  const currentAccBalance = currentAccount?.currentBalance || currentAccount?.initialBalance || 10000;
  
  const calculatedRiskAmount = (currentAccBalance * riskPercentPreset) / 100;
  const priceDistance = Math.abs(entryPrice - stopLoss);

  const calculatedLotSize = React.useMemo(() => {
    if (!priceDistance || priceDistance <= 0) return 0;
    if (assetClass === 'Commodities') {
      // Gold / Oil ($1 move = $100 per 1 standard lot)
      return calculatedRiskAmount / (priceDistance * 100);
    } else if (assetClass === 'Forex') {
      // 1 pip = 0.0001 ($10 per standard lot) or JPY 0.01
      const isJpy = symbol.includes('JPY');
      const pipValue = isJpy ? 0.01 : 0.0001;
      const pipsCount = priceDistance / pipValue;
      return calculatedRiskAmount / (pipsCount * 10);
    } else if (assetClass === 'Crypto') {
      // Direct spot/contract units
      return calculatedRiskAmount / priceDistance;
    } else if (assetClass === 'Indices') {
      // US30/NAS100: $5 per contract pt approx
      return calculatedRiskAmount / (priceDistance * 5);
    }
    return calculatedRiskAmount / (priceDistance * 100);
  }, [calculatedRiskAmount, priceDistance, assetClass, symbol]);

  const applyAutoLot = () => {
    if (calculatedLotSize > 0) {
      const formatted = assetClass === 'Crypto' 
        ? (calculatedLotSize >= 10 ? Number(calculatedLotSize.toFixed(2)) : Number(calculatedLotSize.toFixed(4))) 
        : Number(calculatedLotSize.toFixed(2));
      setQuantity(formatted);
      showToast(`Lot size diset ke ${formatted} (${riskPercentPreset}% risk = $${calculatedRiskAmount.toFixed(2)})`, 'success');
    }
  };

  const plannedRR = React.useMemo(() => {
    if (!entryPrice || !stopLoss || !takeProfit) return 0;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk <= 0) return 0;
    return Number((reward / risk).toFixed(2));
  }, [entryPrice, stopLoss, takeProfit]);

  const achievedRR = React.useMemo(() => {
    if (!entryPrice || !stopLoss || !exitPrice) return 0;
    const risk = Math.abs(entryPrice - stopLoss);
    if (risk <= 0) return 0;
    const gain = direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice;
    return Number((gain / risk).toFixed(2));
  }, [entryPrice, stopLoss, exitPrice, direction]);

  const holdingDuration = React.useMemo(() => {
    if (!entryDate || !exitDate || status === 'OPEN') return null;
    const start = new Date(entryDate).getTime();
    const end = new Date(exitDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return formatDuration((end - start) / (1000 * 60));
  }, [entryDate, exitDate, status]);

  if (!isOpen) return null;

  const toggleConfluence = (item: string) => {
    setConfluences(prev =>
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );
  };

  const handleAddCustomConfluence = () => {
    if (customConfluence.trim() && !confluences.includes(customConfluence.trim())) {
      setConfluences(prev => [...prev, customConfluence.trim()]);
      setCustomConfluence('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      showToast('Please select a trading account', 'error');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === accountId);
    const accBal = selectedAcc?.initialBalance || 10000;
    const pnlPercent = Number(((pnl / accBal) * 100).toFixed(2));

    const tradePayload = {
      accountId,
      symbol: symbol.toUpperCase().trim(),
      assetClass,
      direction,
      entryDate,
      exitDate: status === 'OPEN' ? undefined : exitDate,
      timeframe,
      entryPrice: Number(entryPrice),
      exitPrice: status === 'OPEN' ? undefined : Number(exitPrice),
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      quantity: Number(quantity),
      pnl: status === 'OPEN' ? 0 : Number(pnl),
      pnlPercent: status === 'OPEN' ? 0 : pnlPercent,
      pips: Number(pips),
      rrPlanned: plannedRR,
      rrAchieved: achievedRR,
      session,
      setup,
      emotion,
      rulesFollowed,
      confluences,
      notes,
      lessons,
      screenshots: [screenshotBefore, screenshotAfter].filter(Boolean),
      status
    };

    if (initialTrade) {
      updateTrade(initialTrade.id, tradePayload);
    } else {
      addTrade(tradePayload);
    }

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              {initialTrade ? 'Edit Trade Entry' : 'Log New Trade Execution'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Trade checklist & psychology record
            </span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Account & Symbol Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Trading Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input-control"
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.broker} - {acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Symbol / Instrument *</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. XAUUSD, BTCUSDT"
                className="input-control font-mono"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="input-control"
              >
                <option value="Commodities">Commodities / Gold</option>
                <option value="Forex">Forex</option>
                <option value="Indices">Indices (US30, NAS100)</option>
                <option value="Crypto">Crypto</option>
                <option value="Stocks">Stocks</option>
              </select>
            </div>
          </div>

          {/* Quick Symbol Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {COMMON_SYMBOLS.map(sym => (
              <button
                type="button"
                key={sym}
                onClick={() => setSymbol(sym)}
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: symbol === sym ? '#2563eb' : '#101626',
                  color: symbol === sym ? '#ffffff' : '#94a3b8',
                  border: '1px solid #23324d',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Direction & Status Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Direction Selector */}
            <div>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Direction</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: direction === 'LONG' ? 'var(--profit-green)' : '#1e293b',
                    backgroundColor: direction === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : '#080c18',
                    color: direction === 'LONG' ? 'var(--profit-green)' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <TrendingUp size={16} /> LONG (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: direction === 'SHORT' ? 'var(--loss-red)' : '#1e293b',
                    backgroundColor: direction === 'SHORT' ? 'rgba(239, 68, 68, 0.15)' : '#080c18',
                    color: direction === 'SHORT' ? 'var(--loss-red)' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <TrendingDown size={16} /> SHORT (Sell)
                </button>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Trade Outcome</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {(['WIN', 'LOSS', 'BREAKEVEN', 'OPEN'] as TradeStatus[]).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => {
                      setStatus(st);
                      if (st === 'LOSS' && pnl > 0) setPnl(-Math.abs(pnl));
                      if (st === 'WIN' && pnl < 0) setPnl(Math.abs(pnl));
                      if (st === 'BREAKEVEN') setPnl(0);
                    }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: status === st ? '#3b82f6' : '#1e293b',
                      backgroundColor: status === st ? '#1e293b' : '#080c18',
                      color: status === st ? '#60a5fa' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Opened At & Closed At Execution Timestamps */}
          <div style={{ backgroundColor: '#070b18', padding: '14px', borderRadius: '10px', border: '1px solid #1c283f', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} />
                <span>Execution Timeline</span>
              </div>
              {holdingDuration && (
                <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', textTransform: 'none' }}>
                  ⏱️ Holding Duration: {holdingDuration}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Opened At *</label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    {formatDateTimeDDMMYYYY(entryDate)}
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="input-control font-mono"
                  required
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Closed At {status === 'OPEN' ? '(Optional - Trade Open)' : '*'}</label>
                  {status !== 'OPEN' && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {formatDateTimeDDMMYYYY(exitDate)}
                    </span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  disabled={status === 'OPEN'}
                  className="input-control font-mono"
                  style={{ opacity: status === 'OPEN' ? 0.5 : 1 }}
                  required={status !== 'OPEN'}
                />
              </div>
            </div>
          </div>

          {/* Quick Lot & Risk Auto-Sizer Trigger Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#0a1224',
            border: '1px solid #1e2c48',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}>
                <Calculator size={15} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                  Risk & Position Auto-Sizer
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                  Saldo: ${currentAccBalance.toLocaleString()} • Risiko: ${calculatedRiskAmount.toFixed(2)} ({riskPercentPreset}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              {/* Presets 0.5%, 1%, 2%, 3% s.d. 10% */}
              {[0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setRiskPercentPreset(pct)}
                  style={{
                    padding: '4px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: riskPercentPreset === pct ? '#2563eb' : '#0c152a',
                    border: riskPercentPreset === pct ? '1px solid #3b82f6' : '1px solid #1c273e',
                    color: riskPercentPreset === pct ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {pct}%
                </button>
              ))}

              {calculatedLotSize > 0 && (
                <button
                  type="button"
                  onClick={applyAutoLot}
                  className="btn btn-sm"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: 'var(--profit-green)',
                    gap: '4px'
                  }}
                >
                  <Zap size={13} />
                  <span>Set {calculatedLotSize > 0 ? (assetClass === 'Crypto' ? (calculatedLotSize >= 10 ? calculatedLotSize.toFixed(2) : calculatedLotSize.toFixed(4)) : calculatedLotSize.toFixed(2)) : '0.00'} Lot</span>
                </button>
              )}
            </div>
          </div>

          {/* Pricing & Execution Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px', backgroundColor: '#060913', padding: '14px', borderRadius: '10px', border: '1px solid #1c273a' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Entry Price *</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Exit Price</label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Take Profit</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">
                {assetClass === 'Crypto' ? 'Units / Quantity *' : assetClass === 'Indices' ? 'Contracts / Quantity *' : 'Lots / Quantity *'}
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Realized Net PnL ($) *</label>
              <input
                type="number"
                step="any"
                value={pnl}
                onChange={(e) => setPnl(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
                style={{ color: pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 700 }}
                required
              />
            </div>
          </div>

          {/* R:R Preview Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '16px', fontSize: '0.78rem' }}>
            <span style={{ color: '#93c5fd' }}>
              Planned R:R: <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>1 : {plannedRR}</strong>
            </span>
            <span style={{ color: '#93c5fd' }}>
              Realized R:R: <strong style={{ color: achievedRR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', fontFamily: 'var(--font-mono)' }}>1 : {achievedRR}</strong>
            </span>
          </div>

          {/* Strategy, Session & Emotion */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Strategy / Setup Model</label>
              <select
                value={setup}
                onChange={(e) => setSetup(e.target.value as StrategyType)}
                className="input-control"
              >
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Trading Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as TradingSession)}
                className="input-control"
              >
                <option value="London">London Session</option>
                <option value="New York AM">New York AM</option>
                <option value="New York PM">New York PM</option>
                <option value="Asian">Asian Session</option>
                <option value="Off Session">Off Session</option>
              </select>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Psychology & Emotion</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as EmotionState)}
                className="input-control"
              >
                {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
          </div>

          {/* Strategy Confluences Checklist */}
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
              Strategy Confluences Checklist
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {CONFLUENCE_SUGGESTIONS.map(conf => {
                const isSelected = confluences.includes(conf);
                return (
                  <button
                    type="button"
                    key={conf}
                    onClick={() => toggleConfluence(conf)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#070a16',
                      color: isSelected ? 'var(--profit-green)' : '#94a3b8',
                      border: `1px solid ${isSelected ? 'var(--profit-green)' : '#1e293b'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {conf}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add custom confluence..."
                value={customConfluence}
                onChange={(e) => setCustomConfluence(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomConfluence(); } }}
                className="input-control"
                style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
              />
              <button
                type="button"
                onClick={handleAddCustomConfluence}
                className="btn btn-secondary btn-sm"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Rules Followed Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#070b17', borderRadius: '8px', border: '1px solid #1a2538' }}>
            <input
              type="checkbox"
              id="rulesFollowed"
              checked={rulesFollowed}
              onChange={(e) => setRulesFollowed(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
            />
            <label htmlFor="rulesFollowed" style={{ fontSize: '0.85rem', color: '#f8fafc', cursor: 'pointer' }}>
              <strong>Followed Trading Plan & Risk Rules</strong> (No impulse revenge or oversized lot)
            </label>
          </div>

          {/* Dual Chart Screenshots (Before vs After) */}
          <div style={{
            padding: '14px',
            backgroundColor: '#070b17',
            borderRadius: '12px',
            border: '1px solid #1e293b',
            marginBottom: '16px'
          }}>
            <label className="input-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Dual Chart Comparison (Before & After Screenshots)</span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Before Screenshot */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#93c5fd', display: 'block', marginBottom: '4px' }}>
                  1. Before (Setup / Plan Chart)
                </span>
                <input
                  type="text"
                  value={screenshotBefore}
                  onChange={(e) => setScreenshotBefore(e.target.value)}
                  placeholder="https://www.tradingview.com/x/... (Before)"
                  className="input-control font-mono"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
              </div>

              {/* After Screenshot */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#34d399', display: 'block', marginBottom: '4px' }}>
                  2. After (Execution / Outcome Chart)
                </span>
                <input
                  type="text"
                  value={screenshotAfter}
                  onChange={(e) => setScreenshotAfter(e.target.value)}
                  placeholder="https://www.tradingview.com/x/... (After)"
                  className="input-control font-mono"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
              </div>
            </div>
          </div>

          {/* Rich Text Editor for Notes & Embedded Screenshots */}
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Trade Notes & Rich Visual Journal (Full Formatting & Image Paste)
              </label>
              <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>
                Supports Direct Image Paste (Ctrl + V) & File Upload
              </span>
            </div>
            <RichTextEditor
              value={notes}
              onChange={setNotes}
              placeholder="Write why you entered this setup, liquidity points, or paste your chart screenshot directly here (Ctrl + V)..."
              minHeight="190px"
            />
          </div>

          {/* Lessons Learned */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Lessons Learned & Psychological Review</label>
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="What went well? What could be executed better next time?"
              className="input-control"
              style={{ minHeight: '70px' }}
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '9px 24px' }}>
              {initialTrade ? 'Save Changes' : 'Save to Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
