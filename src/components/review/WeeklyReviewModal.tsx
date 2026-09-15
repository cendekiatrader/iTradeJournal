import React, { useMemo, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useJournal } from '../../context/JournalContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { formatCurrency } from '../../utils/formatters';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WeekStats {
  trades: number;
  closed: number;
  netPnl: number;
  winRate: number;
  ruleBreaks: number;
  best: { symbol: string; pnl: number }[];
  worst: { symbol: string; pnl: number }[];
  bestSession?: [string, number];
  worstSession?: [string, number];
  overtradingDay?: [string, number];
}

interface SavedReview {
  id: string;
  createdAt: string;
  stats: WeekStats;
  well: string;
  improve: string;
  focus: string;
}

const REVIEWS_KEY = 'itrade_weekly_reviews_v1';
const DAY = 24 * 60 * 60 * 1000;

const loadReviews = (): SavedReview[] => {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const STEP_TITLES = ['Week at a glance', 'What worked', 'What needs fixing', 'Reflect', 'Save'];

/** Guided weekly review wizard: stats -> wins -> fixes -> reflection -> save. */
export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({ isOpen, onClose }) => {
  const { trades, accountsMap, activeAccount, showToast } = useJournal();
  const modalRef = useModalA11y(isOpen, onClose);
  const [step, setStep] = useState(0);
  const [well, setWell] = useState('');
  const [improve, setImprove] = useState('');
  const [focus, setFocus] = useState('');

  const currency = activeAccount?.currency || 'USD';
  const savedCount = useMemo(() => (isOpen ? loadReviews().length : 0), [isOpen]);

  const week = useMemo<WeekStats>(() => {
    const since = Date.now() - 7 * DAY;
    const list = trades.filter((t) => new Date(t.exitDate || t.entryDate).getTime() >= since);
    const closed = list.filter((t) => t.status !== 'OPEN');
    const wins = closed.filter((t) => t.pnl > 0);
    const netPnl = closed.reduce((s, t) => s + t.pnl, 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const ruleBreaks = list.filter((t) => t.rulesFollowed === false).length;
    const sorted = [...closed].sort((a, b) => b.pnl - a.pnl);

    const bySession = new Map<string, number>();
    closed.forEach((t) => bySession.set(t.session, (bySession.get(t.session) || 0) + t.pnl));
    const sessions = [...bySession.entries()].sort((a, b) => b[1] - a[1]);

    const byDay = new Map<string, number>();
    list.forEach((t) => {
      const d = (t.exitDate || t.entryDate).slice(0, 10);
      byDay.set(d, (byDay.get(d) || 0) + 1);
    });
    const byDaySorted = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
    const avgPerDay = byDay.size > 0 ? list.length / byDay.size : 0;
    const overtrading = byDaySorted[0] && byDaySorted[0][1] >= Math.max(5, avgPerDay * 2.5) ? byDaySorted[0] : undefined;

    return {
      trades: list.length,
      closed: closed.length,
      netPnl,
      winRate,
      ruleBreaks,
      best: sorted
        .filter((t) => t.pnl > 0)
        .slice(0, 3)
        .map((t) => ({ symbol: t.symbol, pnl: t.pnl })),
      worst: sorted
        .slice(-3)
        .reverse()
        .filter((t) => t.pnl < 0)
        .map((t) => ({ symbol: t.symbol, pnl: t.pnl })),
      bestSession: sessions[0],
      worstSession: sessions.length > 1 ? sessions[sessions.length - 1] : undefined,
      overtradingDay: overtrading
    };
  }, [trades]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleSave = () => {
    const entry: SavedReview = {
      id: `review-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stats: week,
      well: well.trim(),
      improve: improve.trim(),
      focus: focus.trim()
    };
    try {
      const existing = loadReviews();
      existing.unshift(entry);
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(existing.slice(0, 60)));
    } catch {
      /* ignore */
    }
    showToast('Weekly review saved. 🎯', 'success');
    setWell('');
    setImprove('');
    setFocus('');
    handleClose();
  };

  const statBox = (label: string, value: string, color?: string) => (
    <div
      key={label}
      style={{
        flex: '1 1 130px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );

  const tradeRow = (t: { symbol: string; pnl: number }, i: number) => (
    <div
      key={`${t.symbol}-${i}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '6px'
      }}
    >
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{t.symbol}</span>
      <span
        style={{
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: t.pnl > 0 ? 'var(--profit-green)' : 'var(--loss-red)'
        }}
      >
        {t.pnl > 0 ? '+' : ''}
        {formatCurrency(t.pnl, currency)}
      </span>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        ref={modalRef}
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Weekly Review"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <NotebookPen size={17} color="var(--theme-secondary)" />
            <span style={{ fontWeight: 800 }}>Weekly Review</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Step {step + 1}/{STEP_TITLES.length} · {STEP_TITLES[step]}
            </span>
          </div>
          <button type="button" onClick={handleClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close weekly review">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '18px 24px', minHeight: '300px', maxHeight: '56vh', overflowY: 'auto' }}>
          {/* Step 1: week at a glance */}
          {step === 0 && (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Last 7 days across all trades. Numbers update automatically from your journal.
              </p>
              {week.trades === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                  No trades in the last 7 days — log some first, then come back for the review.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {statBox('Trades', String(week.trades))}
                  {statBox('Net PnL', `${week.netPnl > 0 ? '+' : ''}${formatCurrency(week.netPnl, currency)}`, week.netPnl > 0 ? 'var(--profit-green)' : week.netPnl < 0 ? 'var(--loss-red)' : undefined)}
                  {statBox('Win rate', `${week.winRate.toFixed(0)}%`)}
                  {statBox('Rule breaks', String(week.ruleBreaks), week.ruleBreaks > 0 ? 'var(--loss-red)' : 'var(--profit-green)')}
                  {week.bestSession && statBox('Best session', `${week.bestSession[0]} · ${week.bestSession[1] > 0 ? '+' : ''}${formatCurrency(week.bestSession[1], currency)}`)}
                  {week.overtradingDay && statBox('Busiest day', `${week.overtradingDay[0]} · ${week.overtradingDay[1]} trades`, '#f59e0b')}
                </div>
              )}
            </>
          )}

          {/* Step 2: what worked */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrendingUp size={16} color="var(--profit-green)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Your best trades this week</span>
              </div>
              {week.best.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No winning trades this week — that happens. Focus on process, not outcome.</p>
              ) : (
                week.best.map(tradeRow)
              )}
              {week.bestSession && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
                  Best performing session: <strong style={{ color: 'var(--profit-green)' }}>{week.bestSession[0]}</strong> (
                  {week.bestSession[1] > 0 ? '+' : ''}
                  {formatCurrency(week.bestSession[1], currency)} net)
                </p>
              )}
            </>
          )}

          {/* Step 3: what needs fixing */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Where you lost ground</span>
              </div>
              {week.worst.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No losing trades this week. 👏</p>
              ) : (
                week.worst.map(tradeRow)
              )}
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {week.ruleBreaks > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--loss-red)' }}>
                    ⚠ {week.ruleBreaks} trade{week.ruleBreaks === 1 ? '' : 's'} with rules NOT followed this week.
                  </p>
                )}
                {week.overtradingDay && (
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                    ⚠ Overtrading signal: {week.overtradingDay[1]} trades on {week.overtradingDay[0]} (far above your daily average).
                  </p>
                )}
                {week.worstSession && week.worstSession[1] < 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Weakest session: <strong>{week.worstSession[0]}</strong> ({week.worstSession[1] > 0 ? '+' : ''}
                    {formatCurrency(week.worstSession[1], currency)} net).
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 4: reflect */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">What did you do well this week?</label>
                <textarea
                  className="input-control"
                  rows={3}
                  value={well}
                  onChange={(e) => setWell(e.target.value)}
                  placeholder="e.g. Waited for A+ setups, sized consistently, no revenge trades"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">What needs to improve?</label>
                <textarea
                  className="input-control"
                  rows={3}
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                  placeholder="e.g. Chased entries after missed moves, ignored the daily loss cap"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">One focus for next week</label>
                <input
                  type="text"
                  className="input-control"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Max 2 trades per session"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Step 5: save */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <CheckCircle2 size={34} color="var(--profit-green)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Ready to save your review</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                {week.trades} trades reviewed
                {focus ? ` · focus: “${focus}”` : ''}
              </p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                {savedCount > 0
                  ? `This will be your review #${savedCount + 1} — ${savedCount} saved so far.`
                  : 'This will be your first saved weekly review.'}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={step === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            <ChevronLeft size={14} /> Back
          </button>
          {step < STEP_TITLES.length - 1 ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1))}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
              <CheckCircle2 size={14} /> Save Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
