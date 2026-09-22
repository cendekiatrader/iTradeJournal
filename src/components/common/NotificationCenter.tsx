import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { fetchReviewComments, ReviewComment } from '../../utils/review';
import { isSupabaseConfigured } from '../../utils/supabase';
import { formatCurrency } from '../../utils/formatters';
import { Bell, ShieldAlert, MessageSquare, AlertTriangle, Check, CheckCheck, GraduationCap, Megaphone, Trash2 } from 'lucide-react';
import { fetchAnnouncements, Announcement } from '../../utils/feedback';
import { fetchMyCoachNotes, markNoteRead, markNotesRead, MyCoachNote } from '../../utils/coaching';

interface RiskAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
}

interface MentorItem extends ReviewComment {
  token: string;
}

const READ_KEY = 'itrade_notif_read_v1';
const DISMISSED_KEY = 'itrade_notif_dismissed_v1';
const MAX_TRACKED = 200;

const loadIds = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const saveIds = (key: string, ids: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids.slice(-MAX_TRACKED)));
  } catch {
    /* ignore */
  }
};

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

const iconBtnStyle: React.CSSProperties = {
  padding: '3px',
  borderRadius: '6px',
  flexShrink: 0,
  lineHeight: 0
};

export const NotificationCenter: React.FC = () => {
  const { accounts, trades } = useJournal();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<MentorItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coachNotes, setCoachNotes] = useState<MyCoachNote[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => loadIds(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => loadIds(DISMISSED_KEY));
  const [fetchTick, setFetchTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveIds(READ_KEY, readIds);
  }, [readIds]);

  useEffect(() => {
    saveIds(DISMISSED_KEY, dismissedIds);
  }, [dismissedIds]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
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

  // Fetch announcements from the admin (cloud mode only)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    (async () => {
      const list = await fetchAnnouncements();
      if (alive) setAnnouncements(list);
    })();
    return () => {
      alive = false;
    };
  }, [fetchTick]);

  // Coach notes written on my trades (cloud mode only)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    (async () => {
      const list = await fetchMyCoachNotes();
      if (alive) setCoachNotes(list);
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
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
            const level = used >= 80 ? 'critical' : 'warning';
            alerts.push({
              id: `daily-${acc.id}-${dateKey}-${level}`,
              severity: level,
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
            const level = bufferPct < 20 ? 'critical' : 'warning';
            alerts.push({
              id: `dd-${acc.id}-${Math.floor(bufferPct / 10)}-${level}`,
              severity: level,
              title: `${acc.name}: only ${bufferPct.toFixed(0)}% drawdown buffer left`,
              detail: `Max drawdown used ${formatCurrency(maxDD, acc.currency)} of ${formatCurrency(allowed, acc.currency)}`
            });
          }
        }
      }
    });

    // Backup reminder (data safety)
    try {
      const lastBackup = localStorage.getItem('itrade_last_backup_at');
      if (trades.length > 0) {
        const days = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
        if (!lastBackup || (days !== null && days >= 14)) {
          alerts.push({
            id: `backup-${lastBackup ? lastBackup.slice(0, 10) : 'never'}`,
            severity: 'warning',
            title: lastBackup && days !== null ? `Backup overdue — last export was ${days} days ago` : 'No backup exported yet',
            detail: 'Export a JSON backup from the user menu to safeguard your data.'
          });
        }
      }
    } catch {
      /* ignore */
    }

    return alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1)).slice(0, 4);
  }, [accounts, trades]);

  const visibleAlerts = riskAlerts.filter((a) => !dismissedIds.includes(a.id));
  const visibleComments = comments.filter((c) => !dismissedIds.includes(`comment-${c.id}`));
  const allVisibleIds = [
    ...visibleAlerts.map((a) => a.id),
    ...visibleComments.map((c) => `comment-${c.id}`),
    ...announcements.map((a) => `ann-${a.id}`)
  ];
  const visibleNoteItems = coachNotes.filter((n) => !dismissedIds.includes(`note-${n.id}`));
  const unreadNoteItems = visibleNoteItems.filter((n) => !n.read_at);
  const unreadIds = allVisibleIds.filter((id) => !readIds.includes(id));
  const count = unreadIds.length + unreadNoteItems.length;
  const totalVisible = allVisibleIds.length;

  const isUnread = (id: string) => !readIds.includes(id) && !dismissedIds.includes(id);

  const toggleRead = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const markAllRead = () => {
    setReadIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
    if (unreadNoteItems.length > 0) {
      void markNotesRead();
      setCoachNotes((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    }
  };

  const handleReadNote = async (note: MyCoachNote) => {
    await markNoteRead(note.id);
    setCoachNotes((prev) => prev.map((x) => (x.id === note.id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  const dismiss = (id: string) => {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setReadIds((prev) => prev.filter((x) => x !== id));
  };

  const actionButtons = (id: string, label: string) => {
    const read = readIds.includes(id);
    return (
      <div style={{ display: 'flex', gap: '2px', flexShrink: 0, marginLeft: 'auto' }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          style={{ ...iconBtnStyle, opacity: read ? 0.4 : 1 }}
          onClick={() => toggleRead(id)}
          title={read ? `Mark "${label}" as unread` : `Mark "${label}" as read`}
          aria-label={read ? `Mark ${label} as unread` : `Mark ${label} as read`}
          aria-pressed={read}
        >
          <Check size={13} color={read ? 'var(--text-muted)' : 'var(--theme-secondary)'} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          style={{ ...iconBtnStyle, opacity: 0.75 }}
          onClick={() => dismiss(id)}
          title={`Delete notification: ${label}`}
          aria-label={`Delete notification: ${label}`}
        >
          <Trash2 size={13} color="var(--text-muted)" />
        </button>
      </div>
    );
  };

  const togglePanel = () => {
    if (!open) {
      setFetchTick((t) => t + 1);
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={togglePanel}
        className="btn btn-secondary btn-icon btn-sm"
        aria-label={count > 0 ? `Notifications — ${count} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        style={{ position: 'relative', padding: '7px 10px' }}
      >
        <Bell size={15} />
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div
          className="nav-notif-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '380px',
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
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {totalVisible} item{totalVisible === 1 ? '' : 's'}
              </span>
              {count > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={markAllRead}
                  style={{ fontSize: '0.68rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
            {visibleAlerts.length === 0 &&
            visibleComments.length === 0 &&
            announcements.length === 0 &&
            visibleNoteItems.length === 0 ? (
              <div style={{ padding: '26px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No notifications. Risk alerts and mentor feedback will appear here.
              </div>
            ) : (
              <>
                {visibleNoteItems.length > 0 && (
                  <>
                    <div style={sectionLabel}>Coach notes</div>
                    {visibleNoteItems.map((n) => {
                      const unread = !n.read_at;
                      return (
                        <div
                          key={n.id}
                          style={{
                            ...rowStyle,
                            boxShadow: unread ? 'inset 2px 0 0 var(--theme-secondary)' : 'none',
                            backgroundColor: unread ? 'var(--bg-card)' : 'transparent'
                          }}
                        >
                          <GraduationCap size={16} color="var(--theme-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: unread ? 700 : 600,
                                color: unread ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}
                            >
                              {n.author_role === 'admin' ? 'Coach (admin)' : 'Coach'}
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
                              {n.body}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0, marginLeft: 'auto' }}>
                            {unread && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                style={iconBtnStyle}
                                onClick={() => handleReadNote(n)}
                                title="Mark as read"
                                aria-label="Mark coach note as read"
                              >
                                <Check size={13} color="var(--theme-secondary)" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ ...iconBtnStyle, opacity: 0.75 }}
                              onClick={() => dismiss(`note-${n.id}`)}
                              title="Delete notification"
                              aria-label="Delete coach note notification"
                            >
                              <Trash2 size={13} color="var(--text-muted)" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {announcements.length > 0 && (
                  <>
                    <div style={sectionLabel}>Announcements</div>
                    {announcements.map((a) => {
                      const id = `ann-${a.id}`;
                      const unread = isUnread(id);
                      return (
                        <div
                          key={a.id}
                          style={{
                            ...rowStyle,
                            boxShadow: unread ? 'inset 2px 0 0 var(--theme-secondary)' : 'none',
                            backgroundColor: unread ? 'var(--bg-card)' : 'transparent'
                          }}
                        >
                          <Megaphone size={16} color="var(--theme-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: unread ? 700 : 600,
                                color: unread ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}
                            >
                              {a.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.45 }}>
                              {a.body}
                            </div>
                          </div>
                          {actionButtons(id, a.title)}
                        </div>
                      );
                    })}
                  </>
                )}

                {visibleAlerts.length > 0 && (
                  <>
                    <div style={sectionLabel}>Risk Alerts</div>
                    {visibleAlerts.map((a) => {
                      const unread = isUnread(a.id);
                      return (
                        <div
                          key={a.id}
                          style={{
                            ...rowStyle,
                            boxShadow: unread ? 'inset 2px 0 0 var(--theme-secondary)' : 'none',
                            backgroundColor: unread ? 'var(--bg-card)' : 'transparent'
                          }}
                        >
                          {a.severity === 'critical' ? (
                            <ShieldAlert size={16} color="var(--loss-red)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          ) : (
                            <AlertTriangle size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: unread ? 700 : 600,
                                color: unread ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}
                            >
                              {a.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{a.detail}</div>
                          </div>
                          {actionButtons(a.id, a.title)}
                        </div>
                      );
                    })}
                  </>
                )}

                {visibleComments.length > 0 && (
                  <>
                    <div style={sectionLabel}>Mentor Feedback</div>
                    {visibleComments.map((c) => {
                      const id = `comment-${c.id}`;
                      const unread = isUnread(id);
                      return (
                        <div
                          key={c.id}
                          style={{
                            ...rowStyle,
                            boxShadow: unread ? 'inset 2px 0 0 var(--theme-secondary)' : 'none',
                            backgroundColor: unread ? 'var(--bg-card)' : 'transparent'
                          }}
                        >
                          <MessageSquare size={16} color="var(--theme-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                                display: 'flex',
                                gap: '6px',
                                alignItems: 'center'
                              }}
                            >
                              {c.author}
                              {unread && (
                                <span
                                  style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    backgroundColor: 'var(--loss-red)',
                                    padding: '1px 5px',
                                    borderRadius: '5px'
                                  }}
                                >
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
                          {actionButtons(id, `feedback from ${c.author}`)}
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
