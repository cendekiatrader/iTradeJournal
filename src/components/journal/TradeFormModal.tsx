import React, { useState, useEffect, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { 
  Trade, 
  TradeDirection, 
  TradeStatus, 
  AssetClass, 
  TradingSession, 
  StrategyType, 
  EmotionState,
  TradeExit,
  TradePrefill
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
  Target,
  Percent,
  Trash2
} from 'lucide-react';
import { formatDateTimeDDMMYYYY, formatDuration } from '../../utils/formatters';
import { RichTextEditor } from '../common/RichTextEditor';
import { useModalA11y } from '../../hooks/useModalA11y';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrade?: Trade | null;
  prefill?: TradePrefill | null;
}

const DRAFT_KEY = 'itrade_trade_draft_v1';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Number field for the pricing block.
 *
 * A controlled `<input type="number">` bound to a number cannot represent the
 * intermediate states of typing a negative value: the browser reports "" for "-",
 * `parseFloat("") || 0` writes 0 back and the minus sign disappears, so "-10"
 * was impossible to type. This keeps the raw text in local state and only pushes
 * a number upward once it parses, so "-", "-." and "" survive while typing and
 * snap back to the last valid value on blur.
 */
const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, className, style, required, placeholder, ariaLabel }) => {
  const [text, setText] = useState<string>(() => String(value));
  const [focused, setFocused] = useState(false);

  // External updates (draft restore, queue prefill, edit mode) win while unfocused.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.,\-]/g, '');
    setText(cleaned);
    const normalized = cleaned.replace(',', '.');
    if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return;
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  const handleBlur = () => {
    setFocused(false);
    const normalized = text.trim().replace(',', '.');
    const parsed = Number(normalized);
    setText(Number.isNaN(parsed) ? String(value) : String(parsed));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      style={style}
      required={required}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

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
  initialTrade,
  prefill
}) => {
  const { accounts, activeAccountId, playbooks, trades, addTrade, updateTrade, showToast, customFieldDefs } = useJournal();

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
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [pnl, setPnl] = useState<number>(0);
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
  const [enablePartialExits, setEnablePartialExits] = useState<boolean>(false);
  const [partialExits, setPartialExits] = useState<TradeExit[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string | number>>({});
  const [hasDraft, setHasDraft] = useState(false);

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
      setCustomFields((initialTrade.customFields as Record<string, string | number>) || {});
      setScreenshotBefore(initialTrade.screenshots?.[0] || '');
      setScreenshotAfter(initialTrade.screenshots?.[1] || '');
      if (initialTrade.exits && initialTrade.exits.length > 0) {
        setEnablePartialExits(true);
        setPartialExits(initialTrade.exits);
      } else {
        setEnablePartialExits(false);
        setPartialExits([]);
      }
    } else {
      setAccountId(activeAccountId === 'all' ? (accounts[0]?.id || '') : activeAccountId);
      setScreenshotBefore('');
      setScreenshotAfter('');
      setEnablePartialExits(false);
      setPartialExits([]);
      setCustomFields({});
      setHasDraft(false);

      // Restore an unfinished draft (autosave) if present
      let restoredNotes = '';
      try {
        const rawDraft = localStorage.getItem(DRAFT_KEY);
        if (rawDraft) {
          const d = JSON.parse(rawDraft) as Record<string, unknown>;
          if (d.symbol) setSymbol(String(d.symbol));
          if (d.assetClass) setAssetClass(d.assetClass as AssetClass);
          if (d.direction) setDirection(d.direction as TradeDirection);
          if (d.timeframe) setTimeframe(String(d.timeframe));
          if (typeof d.entryPrice === 'number') setEntryPrice(d.entryPrice);
          if (typeof d.exitPrice === 'number') setExitPrice(d.exitPrice);
          if (typeof d.stopLoss === 'number') setStopLoss(d.stopLoss);
          if (typeof d.takeProfit === 'number') setTakeProfit(d.takeProfit);
          if (typeof d.quantity === 'number') setQuantity(d.quantity);
          if (typeof d.pnl === 'number') setPnl(d.pnl);
          if (typeof d.pips === 'number') setPips(d.pips);
          if (d.session) setSession(d.session as TradingSession);
          if (d.setup) setSetup(d.setup as StrategyType);
          if (d.emotion) setEmotion(d.emotion as EmotionState);
          if (typeof d.rulesFollowed === 'boolean') setRulesFollowed(d.rulesFollowed);
          if (Array.isArray(d.confluences)) setConfluences(d.confluences as string[]);
          if (typeof d.notes === 'string') restoredNotes = d.notes;
          if (typeof d.lessons === 'string') setLessons(d.lessons);
          if (d.customFields && typeof d.customFields === 'object') {
            setCustomFields(d.customFields as Record<string, string | number>);
          }
          setHasDraft(true);
        }
      } catch {
        /* ignore corrupt draft */
      }

      // Attach content shared to the app (Android share target)
      const sharedNote = localStorage.getItem('itrade_share_note');
      if (sharedNote) {
        restoredNotes = restoredNotes ? `${restoredNotes}\n${sharedNote}` : sharedNote;
        localStorage.removeItem('itrade_share_note');
      }

      // Queue prefill wins over draft for the fields it provides
      if (prefill) {
        if (prefill.symbol) setSymbol(prefill.symbol);
        if (prefill.direction) setDirection(prefill.direction);
        if (prefill.setup) setSetup(prefill.setup);
        if (typeof prefill.entryPrice === 'number') setEntryPrice(prefill.entryPrice);
        if (typeof prefill.stopLoss === 'number') setStopLoss(prefill.stopLoss);
        if (typeof prefill.takeProfit === 'number') setTakeProfit(prefill.takeProfit);
        if (prefill.notes) {
          restoredNotes = restoredNotes ? `${restoredNotes}\n${prefill.notes}` : prefill.notes;
        }
      }
      setNotes(restoredNotes);
    }
  }, [initialTrade, activeAccountId, accounts, isOpen, prefill]);

  // ---- Draft autosave: keep an unfinished new-entry safe (A5) ----
  const draftSnapshot = useMemo(() => ({
    symbol, assetClass, direction, timeframe, entryPrice, exitPrice, stopLoss, takeProfit,
    quantity, pnl, pips, session, setup, emotion, rulesFollowed, confluences, notes, lessons, customFields
  }), [symbol, assetClass, direction, timeframe, entryPrice, exitPrice, stopLoss, takeProfit, quantity, pnl, pips, session, setup, emotion, rulesFollowed, confluences, notes, lessons, customFields]);

  useEffect(() => {
    if (!isOpen || initialTrade) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftSnapshot));
      } catch {
        /* ignore quota errors */
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isOpen, initialTrade, draftSnapshot]);

  // ---- Contextual edge (B5): historical performance of this setup + session combo ----
  const contextEdge = useMemo(() => {
    const closed = trades.filter(
      (tr) =>
        (tr.status === 'WIN' || tr.status === 'LOSS' || tr.status === 'BREAKEVEN') &&
        tr.setup === setup &&
        tr.session === session
    );
    if (closed.length < 5) return null;
    const wins = closed.filter((tr) => tr.pnl > 0).length;
    const winRate = (wins / closed.length) * 100;
    const avgR = closed.reduce((sum, tr) => sum + (tr.rrAchieved || 0), 0) / closed.length;
    return { count: closed.length, winRate, avgR };
  }, [trades, setup, session]);

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
      const unitLabel = assetClass === 'Crypto' ? 'Unit' : assetClass === 'Indices' ? 'Contract' : 'Lot';
      setQuantity(formatted);
      showToast(`${unitLabel} size diset ke ${formatted} (${riskPercentPreset}% risk = $${calculatedRiskAmount.toFixed(2)})`, 'success');
    }
  };

  const plannedRR = React.useMemo(() => {
    if (!entryPrice || !stopLoss || !takeProfit) return 0;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk <= 0) return 0;
    return Number((reward / risk).toFixed(2));
  }, [entryPrice, stopLoss, takeProfit]);

  // Partial Exits Calculations
  const totalClosedQuantity = React.useMemo(() => {
    return partialExits.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }, [partialExits]);

  const remainingQuantity = Math.max(0, Number((quantity - totalClosedQuantity).toFixed(4)));

  const calculatedWeightedExitPrice = React.useMemo(() => {
    if (!enablePartialExits || partialExits.length === 0) return exitPrice;
    const validExits = partialExits.filter(p => (p.quantity || 0) > 0 && (p.exitPrice || 0) > 0);
    const totalQty = validExits.reduce((acc, p) => acc + p.quantity, 0);
    if (totalQty <= 0) return exitPrice;
    const weightedSum = validExits.reduce((acc, p) => acc + (p.exitPrice * p.quantity), 0);
    return Number((weightedSum / totalQty).toFixed(4));
  }, [enablePartialExits, partialExits, exitPrice]);

  const achievedRR = React.useMemo(() => {
    const activeExitPrice = enablePartialExits && partialExits.length > 0 ? calculatedWeightedExitPrice : exitPrice;
    if (!entryPrice || !stopLoss || !activeExitPrice) return 0;
    const risk = Math.abs(entryPrice - stopLoss);
    if (risk <= 0) return 0;
    const gain = direction === 'LONG' ? activeExitPrice - entryPrice : entryPrice - activeExitPrice;
    return Number((gain / risk).toFixed(2));
  }, [entryPrice, stopLoss, exitPrice, direction, enablePartialExits, partialExits, calculatedWeightedExitPrice]);

  const handleAddPartialExit = () => {
    const nextIdx = partialExits.length + 1;
    const defaultQty = remainingQuantity > 0 ? remainingQuantity : Number((quantity * 0.5).toFixed(2));
    const defaultPct = quantity > 0 ? Number(((defaultQty / quantity) * 100).toFixed(0)) : 50;
    const newExit: TradeExit = {
      id: 'exit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      label: `TP${nextIdx}`,
      exitPrice: exitPrice || entryPrice,
      quantity: defaultQty,
      percentage: defaultPct
    };
    setPartialExits([...partialExits, newExit]);
  };

  const handleUpdatePartialExit = (id: string, field: keyof TradeExit, value: any) => {
    setPartialExits(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      // Auto sync quantity & percentage
      if (field === 'percentage' && quantity > 0) {
        const pct = parseFloat(value) || 0;
        updated.quantity = Number(((pct / 100) * quantity).toFixed(4));
      } else if (field === 'quantity' && quantity > 0) {
        const qty = parseFloat(value) || 0;
        updated.percentage = Number(((qty / quantity) * 100).toFixed(1));
      }
      return updated;
    }));
  };

  const handleRemovePartialExit = (id: string) => {
    setPartialExits(prev => prev.filter(p => p.id !== id));
  };

  const applyPartialCalculationToMain = () => {
    if (partialExits.length === 0) return;
    const avgPrice = calculatedWeightedExitPrice;
    setExitPrice(avgPrice);

    // Calculate approx PnL based on asset class & price diff
    const priceDiff = direction === 'LONG' ? avgPrice - entryPrice : entryPrice - avgPrice;
    let approxPnl = 0;
    if (assetClass === 'Commodities') {
      approxPnl = priceDiff * 100 * totalClosedQuantity;
    } else if (assetClass === 'Forex') {
      const isJpy = symbol.includes('JPY');
      const pipValue = isJpy ? 0.01 : 0.0001;
      const pipsGain = priceDiff / pipValue;
      approxPnl = pipsGain * 10 * totalClosedQuantity;
    } else if (assetClass === 'Crypto') {
      approxPnl = priceDiff * totalClosedQuantity;
    } else if (assetClass === 'Indices') {
      approxPnl = priceDiff * 5 * totalClosedQuantity;
    } else {
      approxPnl = priceDiff * 100 * totalClosedQuantity;
    }

    if (!isNaN(approxPnl) && approxPnl !== 0) {
      setPnl(Number(approxPnl.toFixed(2)));
    }
    showToast(`Average exit price (${avgPrice}) & RR (1:${achievedRR}) diaplikasikan!`, 'success');
  };

  const holdingDuration = React.useMemo(() => {
    if (!entryDate || !exitDate || status === 'OPEN') return null;
    const start = new Date(entryDate).getTime();
    const end = new Date(exitDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return formatDuration((end - start) / (1000 * 60));
  }, [entryDate, exitDate, status]);

  const modalRef = useModalA11y(isOpen, onClose);
  const [formView, setFormView] = useState<'quick' | 'full'>('full');

  // New entries start in Quick mode (essential fields only); editing starts in Full mode
  useEffect(() => {
    if (isOpen) {
      setFormView(initialTrade ? 'full' : 'quick');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      exitDate: status === 'OPEN' ? undefined : (enablePartialExits && partialExits.length > 0 ? (partialExits[partialExits.length - 1].exitDate || exitDate) : exitDate),
      timeframe,
      entryPrice: Number(entryPrice),
      exitPrice: status === 'OPEN' ? undefined : (enablePartialExits && partialExits.length > 0 ? calculatedWeightedExitPrice : Number(exitPrice)),
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
      customFields,
      notes,
      lessons,
      screenshots: [screenshotBefore, screenshotAfter].filter(Boolean),
      status,
      exits: enablePartialExits && partialExits.length > 0 ? partialExits : undefined
    };

    if (initialTrade) {
      updateTrade(initialTrade.id, tradePayload);
    } else {
      addTrade(tradePayload);
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setHasDraft(false);

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} className="modal-container" role="dialog" aria-modal="true" aria-label="Trade Entry Form" tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {initialTrade ? 'Edit Trade Entry' : 'Log New Trade Execution'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Log your execution in a structured, disciplined way
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasDraft && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-color)', borderRadius: '7px', padding: '4px 8px' }}>
                Draft restored
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(DRAFT_KEY);
                    } catch {
                      /* ignore */
                    }
                    setHasDraft(false);
                    showToast('Draft discarded.', 'info');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--theme-secondary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, padding: 0 }}
                >
                  Discard
                </button>
              </span>
            )}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', border: '1px solid #1c273e', borderRadius: '9px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                aria-pressed={formView === 'quick'}
                onClick={() => setFormView('quick')}
                title="Essential fields only — fastest way to log a trade"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: formView === 'quick' ? 'var(--theme-secondary-strong)' : 'transparent',
                  color: formView === 'quick' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Quick
              </button>
              <button
                type="button"
                aria-pressed={formView === 'full'}
                onClick={() => setFormView('full')}
                title="All fields — screenshots, notes, partial exits and confluence checklist"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: formView === 'full' ? 'var(--theme-secondary-strong)' : 'transparent',
                  color: formView === 'full' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Full
              </button>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close dialog">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Account & Symbol Row */}
          <div className="tf-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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
                  backgroundColor: 'var(--bg-main)',
                  boxShadow: symbol === sym ? 'var(--neo-outset-sm)' : 'none',
                  color: symbol === sym ? 'var(--theme-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Direction & Status Tabs */}
          <div className="tf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                    borderColor: direction === 'LONG' ? 'var(--profit-green)' : 'var(--bg-chip)',
                    backgroundColor: direction === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-sidebar)',
                    color: direction === 'LONG' ? 'var(--profit-green)' : 'var(--text-secondary)',
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
                    borderColor: direction === 'SHORT' ? 'var(--loss-red)' : 'var(--bg-chip)',
                    backgroundColor: direction === 'SHORT' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-sidebar)',
                    color: direction === 'SHORT' ? 'var(--loss-red)' : 'var(--text-secondary)',
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
              <div className="tf-outcome" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
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
                      borderColor: status === st ? 'var(--theme-secondary-strong)' : 'var(--bg-chip)',
                      backgroundColor: status === st ? 'var(--bg-chip)' : 'var(--bg-sidebar)',
                      color: status === st ? 'var(--theme-secondary)' : 'var(--text-secondary)',
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

          {formView === 'full' && (<>
          {/* Opened At & Closed At Execution Timestamps */}
          <div style={{ backgroundColor: 'var(--bg-main)', boxShadow: 'var(--neo-inset)', padding: '14px', borderRadius: '10px', border: '1px solid #1c283f', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--theme-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} />
                <span>Execution Timeline</span>
              </div>
              {holdingDuration && (
                <span className="badge" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent)', color: 'var(--theme-secondary)', border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)', textTransform: 'none' }}>
                  ⏱️ Holding Duration: {holdingDuration}
                </span>
              )}
            </div>

            <div className="tf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Opened At *</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
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

          </>)}

          {/* Quick Lot & Risk Auto-Sizer Trigger Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-main)',
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
                backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 20%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--theme-secondary)'
              }}>
                <Calculator size={15} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Risk & Position Auto-Sizer
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>
                  Balance: ${currentAccBalance.toLocaleString()} • Risk: ${calculatedRiskAmount.toFixed(2)} ({riskPercentPreset}%)
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
                    backgroundColor: 'var(--bg-main)',
                    boxShadow: riskPercentPreset === pct ? 'var(--neo-outset-sm)' : 'none',
                    border: 'none',
                    color: riskPercentPreset === pct ? 'var(--theme-primary)' : 'var(--text-secondary)',
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
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: 'var(--profit-green)',
                    gap: '4px'
                  }}
                >
                  <Zap size={13} />
                  <span>Set {calculatedLotSize > 0 ? (assetClass === 'Crypto' ? (calculatedLotSize >= 10 ? calculatedLotSize.toFixed(2) : calculatedLotSize.toFixed(4)) : calculatedLotSize.toFixed(2)) : '0.00'} {assetClass === 'Crypto' ? 'Unit' : assetClass === 'Indices' ? 'Contract' : 'Lot'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Pricing & Execution Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px', backgroundColor: 'var(--bg-main)', padding: '14px', borderRadius: '10px', border: '1px solid #1c273a' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Entry Price *</label>
              <NumericInput
                value={entryPrice}
                onChange={setEntryPrice}
                className="input-control font-mono"
                required
                ariaLabel="Entry Price"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Exit Price</label>
              <NumericInput
                value={exitPrice}
                onChange={setExitPrice}
                className="input-control font-mono"
                ariaLabel="Exit Price"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Stop Loss</label>
              <NumericInput
                value={stopLoss}
                onChange={setStopLoss}
                className="input-control font-mono"
                ariaLabel="Stop Loss"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Take Profit</label>
              <NumericInput
                value={takeProfit}
                onChange={setTakeProfit}
                className="input-control font-mono"
                ariaLabel="Take Profit"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">
                {assetClass === 'Crypto' ? 'Units / Quantity *' : assetClass === 'Indices' ? 'Contracts / Quantity *' : 'Lots / Quantity *'}
              </label>
              <NumericInput
                value={quantity}
                onChange={setQuantity}
                className="input-control font-mono"
                required
                ariaLabel="Lots / Quantity"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Realized Net PnL ($) *</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
                <NumericInput
                  value={pnl}
                  onChange={setPnl}
                  className="input-control font-mono"
                  style={{ color: pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 700, flex: 1, minWidth: 0 }}
                  required
                  ariaLabel="Realized Net PnL"
                />
                {/* Sign flip: mobile decimal keypads (iOS) have no minus key. */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPnl((prev) => -prev)}
                  title="Flip the PnL sign (profit / loss)"
                  aria-label="Flip the PnL sign"
                  style={{ padding: '0 10px', flexShrink: 0 }}
                >
                  ±
                </button>
              </div>
            </div>
          </div>

          {formView === 'full' && (<>
          {/* Partial Close / Multi-Exit Section */}
          <div style={{
            backgroundColor: 'var(--bg-main)', boxShadow: 'var(--neo-inset)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #1c2a44',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enablePartialExits ? '12px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--theme-secondary)" />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Partial Close / Scaling Out (TP1, TP2, Runner)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>
                    Input penutupan lot bertahap & hitung otomatis weighted avg exit price & real RR
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !enablePartialExits;
                  setEnablePartialExits(nextState);
                  if (nextState && partialExits.length === 0) {
                    handleAddPartialExit();
                  }
                }}
                className={`btn btn-sm ${enablePartialExits ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '5px 12px' }}
              >
                {enablePartialExits ? 'Enabled' : '+ Enable Partial Close'}
              </button>
            </div>

            {enablePartialExits && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {partialExits.map((exit, idx) => (
                  <div 
                    key={exit.id} 
                    className="tf-exit-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1.2fr 1fr 1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-main)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--bg-chip)'
                    }}
                  >
                    {/* Label (TP1, TP2, etc) */}
                    <input
                      type="text"
                      value={exit.label || `TP${idx + 1}`}
                      onChange={(e) => handleUpdatePartialExit(exit.id, 'label', e.target.value)}
                      placeholder="Label"
                      className="input-control font-mono"
                      style={{ fontSize: '0.75rem', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}
                    />

                    {/* Exit Price */}
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Exit Price</span>
                      <input
                        type="number" inputMode="decimal"
                        step="any"
                        value={exit.exitPrice || ''}
                        onChange={(e) => handleUpdatePartialExit(exit.id, 'exitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Exit Price"
                        className="input-control font-mono"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>

                    {/* Quantity (Lot) */}
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>
                        {assetClass === 'Crypto' ? 'Units' : 'Lots'}
                      </span>
                      <input
                        type="number" inputMode="decimal"
                        step="any"
                        value={exit.quantity || ''}
                        onChange={(e) => handleUpdatePartialExit(exit.id, 'quantity', e.target.value)}
                        placeholder="Lot"
                        className="input-control font-mono"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>

                    {/* Percentage (%) */}
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Portion (%)</span>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number" inputMode="decimal"
                          step="any"
                          value={exit.percentage || ''}
                          onChange={(e) => handleUpdatePartialExit(exit.id, 'percentage', e.target.value)}
                          placeholder="%"
                          className="input-control font-mono"
                          style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        />
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePartialExit(exit.id)}
                      className="btn btn-ghost btn-icon text-loss"
                      style={{ padding: '6px' }}
                      title="Remove TP"
                      aria-label="Remove TP"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Sub-actions and Summary Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleAddPartialExit}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={13} /> Add Exit Step
                    </button>

                    <button
                      type="button"
                      onClick={applyPartialCalculationToMain}
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent)',
                        color: 'var(--theme-secondary)',
                        border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Calculator size={13} /> Auto-Sync PnL & Avg Exit
                    </button>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                    <span>Closed: <strong style={{ color: totalClosedQuantity === quantity ? 'var(--profit-green)' : 'var(--text-primary)' }}>{totalClosedQuantity} / {quantity}</strong></span>
                    <span>Remaining: <strong style={{ color: remainingQuantity > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{remainingQuantity}</strong></span>
                    <span>Weighted Avg Price: <strong style={{ color: 'var(--theme-secondary)', fontFamily: 'var(--font-mono)' }}>{calculatedWeightedExitPrice}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          </>)}

          {/* R:R Preview Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 8%, transparent)', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 20%, transparent)', marginBottom: '16px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--theme-secondary)' }}>
              Planned R:R: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>1 : {plannedRR}</strong>
            </span>
            <span style={{ color: 'var(--theme-secondary)' }}>
              Realized R:R: <strong style={{ color: achievedRR >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', fontFamily: 'var(--font-mono)' }}>1 : {achievedRR}</strong>
              {enablePartialExits && partialExits.length > 0 && (
                <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: 'var(--theme-secondary)' }}>(Weighted)</span>
              )}
            </span>
          </div>

          {contextEdge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '10px', backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 25%, transparent)', marginBottom: '14px', flexWrap: 'wrap' }}>
              <Target size={14} color="var(--theme-secondary)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Historical edge — <strong style={{ color: 'var(--text-primary)' }}>{setup}</strong> in <strong style={{ color: 'var(--text-primary)' }}>{session}</strong>:{' '}
                <strong style={{ color: contextEdge.winRate >= 50 ? 'var(--profit-green)' : 'var(--loss-red)', fontFamily: 'var(--font-mono)' }}>
                  {contextEdge.winRate.toFixed(0)}% win rate
                </strong>{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  · avg {contextEdge.avgR >= 0 ? '+' : ''}{contextEdge.avgR.toFixed(2)}R · {contextEdge.count} trades
                </span>
              </span>
            </div>
          )}

          {/* Strategy, Session & Emotion */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="input-label" style={{ margin: 0 }}>Strategy / Setup Model</label>
                {playbooks.length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                    ⭐ {playbooks.length} Playbooks
                  </span>
                )}
              </div>
              <select
                value={setup}
                onChange={(e) => {
                  const val = e.target.value;
                  setSetup(val as StrategyType);
                  // Auto-fill confluences & timeframe if matching custom Playbook
                  const matchedPb = playbooks.find(p => p.title === val || p.category === val);
                  if (matchedPb) {
                    if (matchedPb.confluences && matchedPb.confluences.length > 0) {
                      setConfluences(matchedPb.confluences);
                    }
                    if (matchedPb.timeframe && matchedPb.timeframe.includes('m') || matchedPb?.timeframe?.includes('h') || matchedPb?.timeframe?.includes('1D')) {
                      const cleanTf = matchedPb.timeframe.split('/')[0].trim();
                      if (['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'].includes(cleanTf)) {
                        setTimeframe(cleanTf);
                      }
                    }
                    showToast(`SOP Playbook "${matchedPb.title}" dimuat otomatis!`, 'info');
                  }
                }}
                className="input-control"
              >
                {/* Custom User Playbooks Group */}
                {playbooks.length > 0 && (
                  <optgroup label="⭐ My Custom Playbooks">
                    {playbooks.map(pb => (
                      <option key={pb.id} value={pb.title}>
                        {pb.title} ({pb.timeframe || pb.category})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Default Standard Strategies */}
                <optgroup label="Standard Models">
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
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

          {formView === 'full' && (<>
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
                      backgroundColor: 'var(--bg-main)',
                      boxShadow: isSelected ? 'var(--neo-outset-sm)' : 'none',
                      color: isSelected ? 'var(--profit-green)' : 'var(--text-secondary)',
                      border: 'none',
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

          </>)}

          {/* Rules Followed Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--bg-sidebar)', borderRadius: '8px', border: '1px solid #1a2538' }}>
            <input
              type="checkbox"
              id="rulesFollowed"
              checked={rulesFollowed}
              onChange={(e) => setRulesFollowed(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
            />
            <label htmlFor="rulesFollowed" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Followed Trading Plan & Risk Rules</strong> (No impulse revenge or oversized lot)
            </label>
          </div>

          {formView === 'full' && customFieldDefs.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 700 }}>Custom Fields</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {customFieldDefs.map((def) => (
                  <div className="input-group" style={{ margin: 0 }} key={def.id}>
                    <label className="input-label">{def.label}</label>
                    {def.type === 'select' ? (
                      <select
                        className="input-control"
                        value={String(customFields[def.id] ?? '')}
                        onChange={(e) => setCustomFields((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      >
                        <option value="">—</option>
                        {(def.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={def.type === 'number' ? 'number' : 'text'}
                        inputMode={def.type === 'number' ? 'decimal' : undefined}
                        step="any"
                        className={`input-control${def.type === 'number' ? ' font-mono' : ''}`}
                        value={customFields[def.id] ?? ''}
                        onChange={(e) => setCustomFields((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {formView === 'full' && (<>
          {/* Dual Chart Screenshots (Before vs After) */}
          <div style={{
            padding: '14px',
            backgroundColor: 'var(--bg-sidebar)',
            borderRadius: '12px',
            border: '1px solid var(--bg-chip)',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="input-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Dual Chart Comparison (Before & After Screenshots)</span>
              </label>
            </div>

            <div className="tf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Before Screenshot */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--theme-secondary)', display: 'block', marginBottom: '4px' }}>
                  1. Before (Setup / Plan Chart)
                </span>
                <input
                  type="text"
                  value={screenshotBefore}
                  onChange={(e) => setScreenshotBefore(e.target.value)}
                  placeholder="https://www.tradingview.com/x/... or paste an image (Before)"
                  className="input-control font-mono"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
                {screenshotBefore && (
                  <div style={{ marginTop: '6px', maxHeight: '90px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--bg-chip)' }}>
                    <img src={screenshotBefore} alt="Before preview" style={{ width: '100%', height: '90px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              {/* After Screenshot */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--profit-green-light)', display: 'block', marginBottom: '4px' }}>
                  2. After (Execution / Outcome Chart)
                </span>
                <input
                  type="text"
                  value={screenshotAfter}
                  onChange={(e) => setScreenshotAfter(e.target.value)}
                  placeholder="https://www.tradingview.com/x/... or paste an image (After)"
                  className="input-control font-mono"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
                {screenshotAfter && (
                  <div style={{ marginTop: '6px', maxHeight: '90px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--bg-chip)' }}>
                    <img src={screenshotAfter} alt="After preview" style={{ width: '100%', height: '90px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          </>)}

          {formView === 'full' && (<>
          {/* Rich Text Editor for Notes & Embedded Screenshots */}
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Trade Notes & Rich Visual Journal (Full Formatting & Image Paste)
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--theme-secondary)', fontWeight: 600 }}>
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

          </>)}

          {formView === 'full' && (<>
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

          </>)}

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
