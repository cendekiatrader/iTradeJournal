import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../context/JournalContext';
import { useConfirm } from '../components/common/ConfirmDialog';
import { AuthModal } from '../components/auth/AuthModal';
import { Toast } from '../components/common/Toast';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  AdminComment,
  AdminProfile,
  AdminStats,
  AdminUser,
  checkIsAdmin,
  deleteAdminComment,
  fetchAdminComments,
  fetchAdminProfiles,
  fetchAdminStats,
  fetchAdminUsers,
  setProfilePublic
} from './adminApi';
import {
  BarChart3,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';

type AdminStatus = 'loading' | 'not_configured' | 'signed_out' | 'denied' | 'ok';
type AdminTab = 'overview' | 'users' | 'content';

const fmtDateTime = (x?: string | null): string => (x ? new Date(x).toLocaleString() : '—');
const fmtDate = (x?: string | null): string => (x ? new Date(x).toLocaleDateString() : '—');

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '16px'
};

export const AdminApp: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { showToast } = useJournal();
  const { confirm } = useConfirm();

  const [status, setStatus] = useState<AdminStatus>('loading');
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    setBusy(true);
    const [s, u, p, c] = await Promise.all([
      fetchAdminStats(),
      fetchAdminUsers(),
      fetchAdminProfiles(),
      fetchAdminComments()
    ]);
    setStats(s);
    setUsers(u);
    setProfiles(p);
    setComments(c);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('not_configured');
      return;
    }
    if (authLoading) {
      setStatus('loading');
      return;
    }
    if (!user) {
      setStatus('signed_out');
      return;
    }
    let alive = true;
    (async () => {
      setStatus('loading');
      const ok = await checkIsAdmin();
      if (!alive) return;
      if (!ok) {
        setStatus('denied');
        return;
      }
      setStatus('ok');
      loadAll();
    })();
    return () => {
      alive = false;
    };
  }, [user, authLoading, loadAll]);

  useEffect(() => {
    if (user) setAuthOpen(false);
  }, [user]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email || '').toLowerCase().includes(q));
  }, [users, search]);

  const handleToggleProfile = async (p: AdminProfile) => {
    const next = !p.is_public;
    if (!next) {
      const ok = await confirm({
        title: `Unpublish @${p.username}?`,
        message: 'Their public portfolio page will no longer be reachable until they publish it again.',
        confirmText: 'Unpublish',
        variant: 'danger'
      });
      if (!ok) return;
    }
    const done = await setProfilePublic(p.id, next);
    if (done) {
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_public: next } : x)));
      showToast(next ? `@${p.username} published again.` : `@${p.username} unpublished.`, 'success');
    } else {
      showToast('Update failed — is the admin SQL applied?', 'error');
    }
  };

  const handleDeleteComment = async (c: AdminComment) => {
    const ok = await confirm({
      title: `Delete comment from ${c.author}?`,
      message: 'The comment will be removed for everyone. This cannot be undone.',
      confirmText: 'Delete comment',
      variant: 'danger'
    });
    if (!ok) return;
    const done = await deleteAdminComment(c.id);
    if (done) {
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      showToast('Comment deleted.', 'info');
    } else {
      showToast('Delete failed — is the admin SQL applied?', 'error');
    }
  };

  // ---------- gate screens ----------
  if (status !== 'ok') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div style={{ ...cardStyle, maxWidth: '460px', width: '100%', textAlign: 'center', padding: '28px 24px' }}>
          <ShieldCheck size={34} color="var(--theme-secondary)" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>iTradeJournal Admin</h1>

          {status === 'loading' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Checking access…</p>
          )}

          {status === 'not_configured' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This build has no Supabase connection configured. Open the deployed app instead.
            </p>
          )}

          {status === 'signed_out' && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Sign in with your administrator account to continue.
              </p>
              <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
              <div style={{ marginTop: '14px' }}>
                <a href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ← Back to journal
                </a>
              </div>
            </>
          )}

          {status === 'denied' && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--loss-red)', marginBottom: '6px', fontWeight: 700 }}>
                Access denied
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {user?.email} is not in the administrator list.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <a href="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  ← Back to journal
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        <Toast />
      </div>
    );
  }

  // ---------- main panel ----------
  const statCards: { label: string; value: number | undefined; accent?: string }[] = [
    { label: 'Users', value: stats?.users, accent: 'var(--theme-secondary)' },
    { label: 'New (7d)', value: stats?.signups_7d },
    { label: 'Accounts', value: stats?.accounts },
    { label: 'Trades', value: stats?.trades },
    { label: 'In Trash', value: stats?.trashed },
    { label: 'Review sessions', value: stats?.review_sessions },
    { label: 'Mentor comments', value: stats?.comments },
    { label: 'Public profiles', value: stats?.public_profiles }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} color="var(--theme-secondary)" />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>iTradeJournal</span>
            <span
              className="badge"
              style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Admin
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {user?.email && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>}
            <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={busy} title="Refresh data">
              <RefreshCw size={13} className={busy ? 'animate-spin' : undefined} /> Refresh
            </button>
            <a href="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <ExternalLink size={13} /> Back to journal
            </a>
            <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(
            [
              ['overview', 'Overview', <BarChart3 key="i" size={14} />],
              ['users', `Users (${users.length})`, <Users key="i" size={14} />],
              ['content', 'Content', <Trash2 key="i" size={14} />]
            ] as [AdminTab, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* overview */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '18px' }}>
              {statCards.map((s) => (
                <div key={s.label} style={cardStyle}>
                  <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '6px', color: s.accent || 'var(--text-primary)' }}>
                    {s.value === undefined ? '—' : s.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '10px' }}>Recent signups</div>
              {users.slice(0, 8).map((u) => (
                <div
                  key={u.user_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '7px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem'
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{fmtDate(u.created_at)}</span>
                </div>
              ))}
              {users.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No data — make sure supabase_admin_panel.sql has been run.
                </p>
              )}
            </div>
          </>
        )}

        {/* users */}
        {tab === 'users' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  className="input-control"
                  placeholder="Search by email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '30px', width: '100%' }}
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {filteredUsers.length} of {users.length}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '8px 6px' }}>Email</th>
                    <th style={{ padding: '8px 6px' }}>Joined</th>
                    <th style={{ padding: '8px 6px' }}>Last sign-in</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Accounts</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '9px 6px', color: 'var(--text-primary)' }}>{u.email || '(no email)'}</td>
                      <td style={{ padding: '9px 6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{fmtDate(u.created_at)}</td>
                      <td style={{ padding: '9px 6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{fmtDateTime(u.last_sign_in_at)}</td>
                      <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{u.accounts_count}</td>
                      <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{u.trades_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                  No users found{search ? '' : ' — make sure supabase_admin_panel.sql has been run.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* content / moderation */}
        {tab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '4px' }}>Public profiles ({profiles.length})</div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Unpublish a profile to hide its public portfolio page.
              </p>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      @{p.username}{' '}
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.6rem',
                          color: p.is_public ? 'var(--profit-green)' : 'var(--text-muted)'
                        }}
                      >
                        {p.is_public ? 'PUBLIC' : 'private'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {p.display_name || '—'} · updated {fmtDate(p.updated_at)}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggleProfile(p)}>
                    {p.is_public ? <EyeOff size={13} /> : <Eye size={13} />} {p.is_public ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              ))}
              {profiles.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No profiles yet.</p>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '4px' }}>Recent mentor comments ({comments.length})</div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Reviewers leave feedback on shared trade links. Delete anything inappropriate or spammy.
              </p>
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    padding: '9px 0',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {c.author}{' '}
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
                        {fmtDateTime(c.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>{c.body}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteComment(c)}
                    title={`Delete comment from ${c.author}`}
                    aria-label={`Delete comment from ${c.author}`}
                    style={{ color: 'var(--loss-red)', flexShrink: 0, padding: '4px 6px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {comments.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No comments yet — or the review schema is not applied.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      <Toast />
    </div>
  );
};
