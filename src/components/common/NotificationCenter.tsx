import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { fetchReviewComments, ReviewComment } from '../../utils/review';
import { isSupabaseConfigured } from '../../utils/supabase';
import { formatCurrency } from '../../utils/formatters';
import { Bell, ShieldAlert, MessageSquare, AlertTriangle } from 'lucide-react';

interface RiskAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
}

interface MentorItem extends ReviewComment {
  token: string;
}

const SEEN_KEY = 'itrade_notif_seen_at';

const sectionLabel: React.CSSProperties = {
  padding: '8px 8px 4px',
  fontSize: '0.66rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)'
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  padding: '9px 10px',
  borderRadius: '9px'
};

export const NotificationCenter: React.FC = () => {
  const { accounts, trades } = useJournal();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<MentorItem[]>([]);
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(SEEN_KEY) || '');
  const [fetchTick, setFetchTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSeenAt(new Date().toISOString());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch mentor feedback (cloud mode only)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    (async () => {
      try {
        const tokens: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('itrade_review_')) {
            tokens.push(key.replace('itrade_review_', ''));
          }
        }
        const all: MentorItem[] = [];
        for (const token of tokens.slice(-6)) {
          const list = await fetchReviewComments(token);
          list.forEach((c) => all.push({ ...c, token }));
        }
        if (alive) {
          all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setComments(all.slice(0, 6));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchTick]);

  // Risk alerts derived from live data
  const riskAlerts = useMemo<RiskAlert[]>(() => {
    const alerts: RiskAlert[] = [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    accounts.forEach((acc) => {
      const closed = trades.filter(
        (t) => t.accountId === acc.id && (t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN')
      );

      // Daily loss usage
      if (acc.dailyDrawdownPercent && acc.dailyDrawdownPercent > 0) {
        const limit = (acc.initialBalance * acc.dailyDrawdownPercent) / 100;
        const todayPnl = closed
          .filter((t) => new Date(t.exitDate || t.entryDate).getTime() >= startOfDay)
          .reduce((sum, t) => sum + t.pnl, 0);
        if (limit > 0 && todayPnl < 0) {
          const used = Math.min(100, (-todayPnl / limit) * 100);
          if (used >= 50) {
            alerts.push({
              id: `daily-${acc.id}`,
              severity: used >= 80 ? 'critical' : 'warning',
              title: `${acc.name}: ${used.toFixed(0)}% of the daily loss limit used`,
              detail: `Today ${formatCurrency(todayPnl, acc.currency)} of ${formatCurrency(-limit, acc.currency)} allowed`
            });
          }
        }
      }

      // Max drawdown buffer (peak-to-trough on realized balance)
      if (acc.maxDrawdownPercent && acc.maxDrawdownPercent > 0) {
        const sorted = [...closed].sort(
          (a, b) =>
            new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
        );
        let bal = acc.initialBalance;
        let peak = bal;
        let maxDD = 0;
        sorted.forEach((t) => {
          bal += t.pnl;
          if (bal > peak) peak = bal;
          if (peak - bal > maxDD) maxDD = peak - bal;
        });
        const allowed = (acc.initialBalance * acc.maxDrawdownPercent) / 100;
        if (allowed > 0 && maxDD > 0) {
          const bufferPct = Math.max(0, ((allowed - maxDD) / allowed) * 100);
          if (bufferPct < 35) {
            alerts.push({
              id: `dd-${acc.id}`,
              severity: bufferPct < 20 ? 'critical' : 'warning',
              title: `${acc.name}: only ${bufferPct.toFixed(0)}% drawdown buffer left`,
              detail: `Max drawdown used ${formatCurrency(maxDD, acc.currency)} of ${formatCurrency(allowed, acc.currency)}`
            });
          }
        }
      }
    });

    return alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1)).slice(0, 4);
  }, [accounts, trades]);

  const newCommentCount = comments.filter((c) => !seenAt || c.createdAt > seenAt).length;
  const count = riskAlerts.length + newCommentCount;

  const togglePanel = () => {
    if (!open) {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
      setFetchTick((t) => t + 1);
    } else {
      setSeenAt(new Date().toISOString());
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={togglePanel}
        className="btn btn-secondary btn-icon btn-sm"
        aria-label={count > 0 ? `Notifications — ${count} new` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        style={{ position: 'relative', padding: '7px 10px' }}
      >
        <Bell size={15} />
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 300,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {count} item{count === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
            {riskAlerts.length === 0 && comments.length === 0 ? (
              <div style={{ padding: '26px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No notifications. Risk alerts and mentor feedback will appear here.
              </div>
            ) : (
              <>
                {riskAlerts.length > 0 && (
                  <>
                    <div style={sectionLabel}>Risk Alerts</div>
                    {riskAlerts.map((a) => (
                      <div key={a.id} style={rowStyle}>
                        {a.severity === 'critical' ? (
                          <ShieldAlert size={16} color="var(--loss-red)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        ) : (
                          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                        )}
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{a.detail}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {comments.length > 0 && (
                  <>
                    <div style={sectionLabel}>Mentor Feedback</div>
                    {comments.map((c) => {
                      const isNew = !seenAt || c.createdAt > seenAt;
                      return (
                        <div key={c.id} style={rowStyle}>
                          <MessageSquare size={16} color="var(--theme-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {c.author}
                              {isNew && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#ffffff', backgroundColor: 'var(--loss-red)', padding: '1px 5px', borderRadius: '5px' }}>
                                  NEW
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: 'var(--text-secondary)',
                                marginTop: '2px',
                                lineHeight: 1.45,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {c.body}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
