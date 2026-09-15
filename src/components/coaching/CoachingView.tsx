import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useJournal } from '../../context/JournalContext';
import { useConfirm } from '../common/ConfirmDialog';
import { useModalA11y } from '../../hooks/useModalA11y';
import { EmptyState } from '../common/EmptyState';
import { TableRowSkeleton } from '../common/Skeleton';
import { formatCurrency } from '../../utils/formatters';
import {
  CoachingOverview,
  CoachLink,
  ReviewItem,
  StudentData,
  StudentTrade,
  addTradeNote,
  fetchCoachingOverview,
  fetchMentorStudentData,
  requestMentor,
  requestReview,
  resolveReviewRequest,
  respondMentorRequest
} from '../../utils/coaching';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Mail,
  MessageSquarePlus,
  NotebookPen,
  Send,
  UserCheck,
  UserPlus,
  X,
  XCircle
} from 'lucide-react';

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden'
};

const cardHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  flexWrap: 'wrap',
  padding: '14px 18px',
  borderBottom: '1px solid var(--border-subtle)'
};

const statusPill = (status: string): React.CSSProperties => {
  if (status === 'active') return { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' };
  if (status === 'pending') return { color: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 14%, transparent)' };
  return { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' };
};

const relTime = (x?: string | null): string => {
  if (!x) return '—';
  const mins = Math.floor((Date.now() - new Date(x).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
};

export const CoachingView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useJournal();
  const { confirm } = useConfirm();
  const [overview, setOverview] = useState<CoachingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [student, setStudent] = useState<CoachLink | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [noteTrade, setNoteTrade] = useState<StudentTrade | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  const studentRef = useModalA11y(Boolean(student), () => {
    setStudent(null);
    setStudentData(null);
    setNoteTrade(null);
  });
  const noteRef = useModalA11y(Boolean(noteTrade), () => setNoteTrade(null));

  const load = useCallback(async () => {
    setLoading(true);
    const o = await fetchCoachingOverview();
    setOverview(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingRequests = useMemo(() => (overview?.as_mentor || []).filter((l) => l.status === 'pending'), [overview]);
  const activeStudents = useMemo(() => (overview?.as_mentor || []).filter((l) => l.status === 'active'), [overview]);
  const myMentors = overview?.as_student || [];

  const handleRequestMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setBusy(true);
    const res = await requestMentor(emailInput.trim());
    setBusy(false);
    if (res.ok) {
      showToast('Request sent — your mentor needs to approve it.', 'success');
      setEmailInput('');
      load();
    } else {
      showToast(res.error || 'Request failed.', 'error');
    }
  };

  const handleRespond = async (link: CoachLink, accept: boolean) => {
    setBusy(true);
    const ok = await respondMentorRequest(link.link_id, accept);
    setBusy(false);
    if (!ok) {
      showToast('Action failed — is supabase_coaching.sql applied?', 'error');
      return;
    }
    showToast(accept ? `${link.email} is now your student.` : 'Request declined.', accept ? 'success' : 'info');
    load();
  };

  const handleOpenStudent = async (link: CoachLink) => {
    setStudent(link);
    setStudentData(null);
    setStudentLoading(true);
    const d = await fetchMentorStudentData(link.user_id);
    setStudentData(d);
    setStudentLoading(false);
  };

  const handleSaveNote = async () => {
    if (!noteTrade || !noteBody.trim()) return;
    setNoteBusy(true);
    const ok = await addTradeNote(noteTrade.id, noteBody.trim());
    setNoteBusy(false);
    if (!ok) {
      showToast('Could not save the note.', 'error');
      return;
    }
    showToast('Coach note saved — the student will see it.', 'success');
    setNoteBody('');
    setNoteTrade(null);
    if (student) {
      const d = await fetchMentorStudentData(student.user_id);
      setStudentData(d);
    }
  };

  const handleRequestReview = async (mentorId: string) => {
    setBusy(true);
    const ok = await requestReview(mentorId, reviewNote.trim());
    setBusy(false);
    if (!ok) {
      showToast('Could not send the review request.', 'error');
      return;
    }
    showToast('Review requested.', 'success');
    setReviewTarget(null);
    setReviewNote('');
    load();
  };

  const handleResolve = async (r: ReviewItem) => {
    const ok = await resolveReviewRequest(r.id);
    if (!ok) {
      showToast('Could not update the request.', 'error');
      return;
    }
    showToast('Marked as done.', 'success');
    load();
  };

  const studentStats = useMemo(() => {
    if (!studentData) return null;
    const closed = studentData.trades.filter((t) => !t.deleted_at && t.status !== 'OPEN');
    const wins = closed.filter((t) => t.pnl > 0);
    return {
      trades: studentData.trades.filter((t) => !t.deleted_at).length,
      netPnl: closed.reduce((s, t) => s + t.pnl, 0),
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0
    };
  }, [studentData]);

  const noteCount = (tradeId: string) => (studentData?.notes || []).filter((n) => n.trade_id === tradeId).length;
  const notesForTrade = noteTrade ? (studentData?.notes || []).filter((n) => n.trade_id === noteTrade.id) : [];

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GraduationCap size={26} color="var(--theme-secondary)" /> Coaching
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {overview?.is_mentor
            ? 'Review your students’ journals and leave coach notes on their trades.'
            : 'Connect with a mentor and request reviews of your trading.'}
        </p>
      </div>

      {loading ? (
        <div style={cardStyle}>
          <div style={{ padding: '12px 14px' }}>
            {[0, 1, 2].map((i) => (
              <TableRowSkeleton key={i} cols={3} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* mentor: pending requests */}
          {pendingRequests.length > 0 && (
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Incoming requests</div>
                <span className="badge" style={{ fontSize: '0.68rem' }}>{pendingRequests.length}</span>
              </div>
              <div style={{ padding: '8px' }}>
                {pendingRequests.map((l) => (
                  <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', flexWrap: 'wrap' }}>
                    <Mail size={15} color="var(--text-muted)" />
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.email}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{relTime(l.created_at)}</span>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => handleRespond(l, true)}>
                      <UserCheck size={13} /> Approve
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handleRespond(l, false)}>
                      <XCircle size={13} /> Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* mentor: students */}
          {overview?.is_mentor && (
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>My students</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{activeStudents.length} active</span>
              </div>
              {activeStudents.length === 0 ? (
                <EmptyState
                  compact
                  icon={<UserPlus size={20} />}
                  title="No students yet"
                  description="A student can request you by your account email — you will see it here to approve."
                />
              ) : (
                <div style={{ padding: '8px' }}>
                  {activeStudents.map((l) => (
                    <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', flexWrap: 'wrap' }}>
                      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.email}
                      </span>
                      <span className="admin-pill" style={statusPill(l.status)}>Active</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenStudent(l)}>
                        <BookOpen size={13} /> Open journal
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* mentor: open review requests */}
          {overview?.is_mentor && (overview?.review_requests || []).length > 0 && (
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Review requests</div>
                <span className="badge" style={{ fontSize: '0.68rem' }}>{overview?.review_requests.length}</span>
              </div>
              <div style={{ padding: '8px' }}>
                {(overview?.review_requests || []).map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', flexWrap: 'wrap' }}>
                    <NotebookPen size={15} color="var(--theme-secondary)" style={{ marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.email}</div>
                      {r.note && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{r.note}</div>}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{relTime(r.created_at)}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleResolve(r)}>
                      <CheckCircle2 size={13} /> Mark done
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* student side: only for non-mentors */}
          {!overview?.is_mentor && (
            <>
          <div style={cardStyle}>
            <div style={cardHeader}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>My mentors</div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{myMentors.length}</span>
            </div>
            {myMentors.length === 0 ? (
              <EmptyState
                compact
                icon={<GraduationCap size={20} />}
                title="No mentor connected"
                description="Ask a mentor to be added (they need the mentor role first), or request them by email below."
              />
            ) : (
              <div style={{ padding: '8px' }}>
                {myMentors.map((l) => (
                  <div key={l.link_id} style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.email}
                      </span>
                      <span className="admin-pill" style={statusPill(l.status)}>{l.status}</span>
                      {l.status === 'active' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setReviewTarget(reviewTarget === l.user_id ? null : l.user_id);
                            setReviewNote('');
                          }}
                        >
                          <NotebookPen size={13} /> Request review
                        </button>
                      )}
                    </div>
                    {reviewTarget === l.user_id && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <input
                          className="input-control"
                          placeholder="Optional note: what should the mentor focus on?"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          style={{ flex: '1 1 240px' }}
                        />
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => handleRequestReview(l.user_id)}>
                          <Send size={13} /> Send request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={cardHeader}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Request a mentor</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Enter your mentor’s account email — they will get a request to approve.
                </div>
              </div>
            </div>
            <form onSubmit={handleRequestMentor} style={{ padding: '14px 18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                className="input-control"
                type="email"
                placeholder="mentor@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ flex: '1 1 240px' }}
                aria-label="Mentor email"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !emailInput.trim()}>
                <UserPlus size={13} /> Send request
              </button>
            </form>
          </div>

          {(overview?.my_open_reviews || []).length > 0 && (
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Waiting for review</div>
                <span className="badge" style={{ fontSize: '0.68rem' }}>{overview?.my_open_reviews.length}</span>
              </div>
              <div style={{ padding: '8px' }}>
                {(overview?.my_open_reviews || []).map((r) => (
                  <div key={r.id} style={{ padding: '10px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      requested {relTime(r.created_at)}{r.note ? ` · “${r.note}”` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* ---------- student journal viewer (mentor) ---------- */}
      {student && (
        <div className="modal-backdrop" onClick={() => { setStudent(null); setStudentData(null); }}>
          <div
            ref={studentRef}
            className="modal-container"
            role="dialog"
            aria-modal="true"
            aria-label={`Student journal: ${student.email}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px' }}
          >
            <div className="modal-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{student.email}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>read-only journal · coach notes are visible to the student</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Close student journal" onClick={() => { setStudent(null); setStudentData(null); }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 22px', maxHeight: '64vh', overflowY: 'auto' }}>
              {studentLoading ? (
                <div>
                  {[0, 1, 2].map((i) => (
                    <TableRowSkeleton key={i} cols={4} />
                  ))}
                </div>
              ) : !studentData ? (
                <EmptyState compact icon={<BookOpen size={20} />} title="Could not load the journal" description="Is supabase_coaching.sql applied?" />
              ) : (
                <>
                  <div className="admin-grid" style={{ marginBottom: '14px' }}>
                    {[
                      { label: 'Accounts', value: String(studentData.accounts.length) },
                      { label: 'Trades', value: String(studentStats?.trades ?? 0) },
                      { label: 'Net PnL', value: `${(studentStats?.netPnl ?? 0) > 0 ? '+' : ''}${formatCurrency(studentStats?.netPnl ?? 0, 'USD')}` },
                      { label: 'Win rate', value: `${(studentStats?.winRate ?? 0).toFixed(0)}%` }
                    ].map((s) => (
                      <div key={s.label} className="admin-stat" style={{ padding: '10px 12px' }}>
                        <div>
                          <div className="admin-stat-value" style={{ fontSize: '1.05rem' }}>{s.value}</div>
                          <div className="admin-stat-label">{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {studentData.accounts.length > 0 && (
                    <>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '10px 0 8px' }}>Accounts</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        {studentData.accounts.map((a) => (
                          <div
                            key={a.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '10px',
                              alignItems: 'center',
                              padding: '9px 12px',
                              borderRadius: '9px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{a.name}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{a.broker}{a.status ? ` · ${a.status}` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700 }}>
                              {formatCurrency(a.current_balance ?? 0, (a.currency || 'USD') as 'USD')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '14px 0 8px' }}>
                    Trades ({studentData.trades.filter((t) => !t.deleted_at).length})
                  </div>
                  {studentData.trades.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No trades yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {studentData.trades.slice(0, 120).map((t) => {
                        const n = noteCount(t.id);
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '9px',
                              border: '1px solid var(--border-subtle)',
                              background: t.deleted_at ? 'transparent' : 'var(--bg-surface)',
                              opacity: t.deleted_at ? 0.5 : 1,
                              flexWrap: 'wrap'
                            }}
                          >
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', minWidth: '70px' }}>{t.symbol}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '52px' }}>{t.direction}</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '80px' }}>
                              {t.entry_date ? new Date(t.entry_date).toLocaleDateString() : '—'}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: t.pnl > 0 ? 'var(--profit-green)' : t.pnl < 0 ? 'var(--loss-red)' : 'var(--text-secondary)',
                                minWidth: '84px'
                              }}
                            >
                              {t.pnl > 0 ? '+' : ''}{formatCurrency(t.pnl, 'USD')}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flex: 1 }}>{t.status}{t.rules_followed === false ? ' · rules ✗' : ''}</span>
                            {n > 0 && <span className="admin-pill" style={{ color: 'var(--theme-secondary)', background: 'color-mix(in srgb, var(--theme-secondary-strong) 16%, transparent)' }}>{n} note{n > 1 ? 's' : ''}</span>}
                            <button className="btn btn-secondary btn-sm" onClick={() => { setNoteTrade(t); setNoteBody(''); }}>
                              <MessageSquarePlus size={12} /> Note
                            </button>
                          </div>
                        );
                      })}
                      {studentData.trades.length > 120 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '6px' }}>
                          Showing latest 120 of {studentData.trades.length} trades.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setStudent(null); setStudentData(null); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- coach note editor ---------- */}
      {noteTrade && (
        <div className="modal-backdrop" onClick={() => setNoteTrade(null)} style={{ zIndex: 400 }}>
          <div
            ref={noteRef}
            className="modal-container"
            role="dialog"
            aria-modal="true"
            aria-label={`Coach note for ${noteTrade.symbol}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal-header">
              <span style={{ fontWeight: 800 }}>
                Coach note — {noteTrade.symbol}{' '}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {noteTrade.entry_date ? new Date(noteTrade.entry_date).toLocaleDateString() : ''}
                </span>
              </span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Close note editor" onClick={() => setNoteTrade(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
              {notesForTrade.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Existing notes
                  </div>
                  {notesForTrade.map((n) => (
                    <div key={n.id} className="admin-quote" style={{ fontSize: '0.8rem' }}>
                      {n.body}
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        {n.author_role} · {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">New note</label>
                <textarea
                  className="input-control"
                  rows={4}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="e.g. Entry was fine, but the SL sits right under the Asian low — give it more room."
                  style={{ width: '100%', resize: 'vertical' }}
                  maxLength={1500}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                The student sees this note on the trade and in their notifications.
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setNoteTrade(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={noteBusy || !noteBody.trim()} onClick={handleSaveNote}>
                <Send size={13} /> {noteBusy ? 'Saving…' : 'Send note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
