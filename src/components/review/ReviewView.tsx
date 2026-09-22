import React, { useEffect, useState } from 'react';
import { fetchReviewSession, fetchReviewComments, addReviewComment, ReviewComment } from '../../utils/review';
import { Trade } from '../../types';
import { formatCurrency, formatDateTimeDDMMYYYY } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface ReviewViewProps {
  token: string;
  onBack: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ token, onBack }) => {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [cloud, setCloud] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [author, setAuthor] = useState(() => localStorage.getItem('itrade_review_author') || '');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchReviewSession(token);
      if (!active) return;
      setTrades(result?.trades || []);
      setNote(result?.note);
      setCloud(Boolean(result?.cloud));
      setLoading(false);
      if (result) {
        const existing = await fetchReviewComments(token);
        if (active) setComments(existing);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handlePost = async () => {
    if (!author.trim() || !body.trim()) return;
    setPosting(true);
    localStorage.setItem('itrade_review_author', author.trim());
    const ok = await addReviewComment(token, null, author.trim(), body.trim());
    setPosting(false);
    if (ok) {
      setBody('');
      const refreshed = await fetchReviewComments(token);
      setComments(refreshed);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 18px' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '18px' }}>
          <ArrowLeft size={14} /> Back to app
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <MessageSquare size={22} color="var(--theme-secondary)" />
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Mentor Review Session
          </h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          A trader shared {trades?.length ?? 0} trade(s) with you for review. Leave feedback at the bottom of the page.
          Only the specific trades selected are shown — balances and other accounts stay private.
        </p>

        {note && (
          <div className="card" style={{ marginBottom: '18px', boxShadow: 'var(--neo-outset), inset 3px 0 0 var(--theme-secondary)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Note from the trader
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{note}</p>
          </div>
        )}

        {!loading && !cloud && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)', backgroundColor: 'var(--bg-main)', marginBottom: '18px' }}>
            <AlertTriangle size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Cloud review tables not found.</strong>{' '}
              The trades below load from a local snapshot, and comments are disabled. Run <code style={{ fontFamily: 'var(--font-mono)' }}>supabase_review_schema.sql</code> in your Supabase SQL editor to enable sharing and comments.
            </div>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading review session…</div>
        ) : trades && trades.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {trades.map((trade) => {
              const isWin = trade.pnl > 0;
              return (
                <div key={trade.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      {trade.direction === 'LONG' ? (
                        <ArrowUpRight size={16} color="var(--profit-green)" />
                      ) : (
                        <ArrowDownRight size={16} color="var(--loss-red)" />
                      )}
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>{trade.symbol}</strong>
                      <span className={`badge ${isWin ? 'badge-win' : 'badge-loss'}`} style={{ fontSize: '0.68rem' }}>
                        {trade.status}
                      </span>
                      <span className="badge badge-session" style={{ fontSize: '0.66rem' }}>{trade.session}</span>
                    </div>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: isWin ? 'var(--profit-green)' : 'var(--loss-red)' }}>
                      {isWin ? '+' : ''}{trade.pnl.toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{formatDateTimeDDMMYYYY(trade.entryDate)}</span>
                    <span>Setup: {trade.setup}</span>
                    <span>R:R achieved: {trade.rrAchieved ? `1:${trade.rrAchieved.toFixed(1)}` : '—'}</span>
                    <span>Rules followed: {trade.rulesFollowed ? 'Yes' : 'No'}</span>
                  </div>
                  {trade.notes && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5, boxShadow: 'inset 2px 0 0 var(--neo-sep)', paddingLeft: '8px' }}>
                      {trade.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: '20px' }}>
            <EmptyState
              icon={<ShieldCheck size={22} />}
              title="Review session not found"
              description="This link may have expired, or the review tables have not been created yet. Ask the trader to re-share."
            />
          </div>
        )}

        {/* Comments */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '14px' }}>
            <MessageSquare size={17} color="var(--theme-secondary)" /> Mentor Feedback ({comments.length})
          </div>

          {comments.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              No feedback yet — be the first to review these trades.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--theme-secondary)' }}>{c.author}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) 1fr', gap: '10px', alignItems: 'end' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Your name</label>
              <input className="input-control" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Mentor name" />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Feedback</label>
              <textarea
                className="input-control"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What went well, what to improve, what to drill next…"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={posting || !cloud || !author.trim() || !body.trim()}
              style={posting || !cloud || !author.trim() || !body.trim() ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              onClick={handlePost}
            >
              <Send size={14} /> {posting ? 'Posting…' : 'Post feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
