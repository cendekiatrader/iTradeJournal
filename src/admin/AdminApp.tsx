import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../context/JournalContext';
import { useConfirm } from '../components/common/ConfirmDialog';
import { AuthModal } from '../components/auth/AuthModal';
import { Toast } from '../components/common/Toast';
import { EmptyState } from '../components/common/EmptyState';
import { StatCardSkeleton, TableRowSkeleton } from '../components/common/Skeleton';
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
  ArrowDown,
  ArrowUp,
  BarChart3,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
  Wallet
} from 'lucide-react';

type AdminStatus = 'loading' | 'not_configured' | 'signed_out' | 'denied' | 'ok';
type AdminTab = 'overview' | 'users' | 'content';
type UserSortKey = 'created_at' | 'last_sign_in_at' | 'trades_count';

const fmtDateTime = (x?: string | null): string => (x ? new Date(x).toLocaleString() : '—');
const fmtDate = (x?: string | null): string => (x ? new Date(x).toLocaleDateString() : '—');

const relTime = (x?: string | null): string => {
  if (!x) return 'never';
  const mins = Math.floor((Date.now() - new Date(x).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const initialsOf = (email?: string | null): string => {
  const e = (email || '?').split('@')[0];
  const parts = e.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return e.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'hsl(212 70% 46%)',
  'hsl(160 60% 38%)',
  'hsl(268 55% 52%)',
  'hsl(24 75% 48%)',
  'hsl(340 62% 48%)',
  'hsl(190 65% 40%)'
];

const avatarColor = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const Avatar: React.FC<{ seed: string; label: string; size?: number }> = ({ seed, label, size = 30 }) => (
  <span
    className="admin-avatar"
    style={{ backgroundColor: avatarColor(seed), width: size, height: size, fontSize: size <= 26 ? '0.62rem' : '0.7rem' }}
    aria-hidden="true"
  >
    {label}
  </span>
);

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden'
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  flexWrap: 'wrap',
  padding: '15px 18px',
  borderBottom: '1px solid var(--border-subtle)'
};

export const AdminApp: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { showToast } = useJournal();
  const { confirm } = useConfirm();

  const [status, setStatus] = useState<AdminStatus>('loading');
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<UserSortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const prev = document.title;
    document.title = 'Admin Console — iTradeJournal';
    return () => {
      document.title = prev;
    };
  }, []);

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
    setLastUpdated(new Date());
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
    const base = q ? users.filter((u) => (u.email || '').toLowerCase().includes(q)) : [...users];
    base.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === 'last_sign_in_at') {
        cmp = new Date(a.last_sign_in_at || 0).getTime() - new Date(b.last_sign_in_at || 0).getTime();
      } else {
        cmp = (a.trades_count || 0) - (b.trades_count || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return base;
  }, [users, search, sortKey, sortDir]);

  const toggleSort = (key: UserSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIcon = (key: UserSortKey) =>
    sortKey === key ? (
      sortDir === 'desc' ? (
        <ArrowDown size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
      ) : (
        <ArrowUp size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
      )
    ) : null;

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

  /* ---------------- gate screens ---------------- */

  if (status !== 'ok') {
    return (
      <div className="admin-gate">
        <div
          style={{
            ...panelStyle,
            overflow: 'visible',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            padding: '30px 26px'
          }}
        >
          <div className="admin-brand-chip" style={{ margin: '0 auto 14px', width: '42px', height: '42px', borderRadius: '12px' }}>
            <ShieldCheck size={21} />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>iTradeJournal Admin</h1>

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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                Sign in with your administrator account to continue.
              </p>
              <button className="btn btn-primary" onClick={() => setAuthOpen(true)} style={{ padding: '9px 22px' }}>
                Sign in
              </button>
              <div style={{ marginTop: '16px' }}>
                <a href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  ← Back to journal
                </a>
              </div>
            </>
          )}

          {status === 'denied' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <ShieldOff size={18} color="var(--loss-red)" />
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--loss-red)', marginBottom: '6px', fontWeight: 700 }}>
                Access denied
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
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

  /* ---------------- main panel ---------------- */

  const loadingData = busy && users.length === 0 && !stats;

  const statCards: { label: string; value: number | undefined; icon: React.ReactNode }[] = [
    { label: 'Users', value: stats?.users, icon: <Users size={17} /> },
    { label: 'New (7d)', value: stats?.signups_7d, icon: <UserPlus size={17} /> },
    { label: 'Accounts', value: stats?.accounts, icon: <Wallet size={17} /> },
    { label: 'Trades', value: stats?.trades, icon: <BarChart3 size={17} /> },
    { label: 'In Trash', value: stats?.trashed, icon: <Trash2 size={17} /> },
    { label: 'Review sessions', value: stats?.review_sessions, icon: <ClipboardList size={17} /> },
    { label: 'Mentor comments', value: stats?.comments, icon: <MessageSquare size={17} /> },
    { label: 'Public profiles', value: stats?.public_profiles, icon: <Globe size={17} /> }
  ];

  return (
    <div className="admin-shell">
      {/* top bar */}
      <header className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="admin-brand-chip">
            <ShieldCheck size={16} />
          </span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>iTradeJournal</span>
          <span className="badge" style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {user?.email && (
            <span className="admin-hide-sm" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {user.email}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={busy} title="Refresh data">
            <RefreshCw size={13} className={busy ? 'animate-spin' : undefined} /> Refresh
          </button>
          <a href="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <ExternalLink size={13} /> <span className="admin-hide-sm">Back to journal</span>
          </a>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut()} title="Sign out">
            <LogOut size={13} />
          </button>
        </div>
      </header>

      <div className="admin-wrap">
        {/* page head + tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '20px'
          }}
        >
          <div>
            <h1 className="admin-title">Admin console</h1>
            <p className="admin-sub">Users, content, and platform health at a glance.</p>
          </div>
          <div className="admin-seg" role="tablist" aria-label="Admin sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'overview'}
              className={tab === 'overview' ? 'active' : ''}
              onClick={() => setTab('overview')}
            >
              <BarChart3 size={14} /> Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'users'}
              className={tab === 'users' ? 'active' : ''}
              onClick={() => setTab('users')}
            >
              <Users size={14} /> Users
              <span className="admin-seg-count">{users.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'content'}
              className={tab === 'content' ? 'active' : ''}
              onClick={() => setTab('content')}
            >
              <MessageSquare size={14} /> Content
              <span className="admin-seg-count">{profiles.length + comments.length}</span>
            </button>
          </div>
        </div>

        {/* overview */}
        {tab === 'overview' && (
          <>
            {loadingData ? (
              <div className="admin-grid" style={{ marginBottom: '18px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="admin-grid" style={{ marginBottom: '18px' }}>
                {statCards.map((s) => (
                  <div key={s.label} className="admin-stat">
                    <span className="admin-stat-icon">{s.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="admin-stat-value">{s.value === undefined ? '—' : s.value}</div>
                      <div className="admin-stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Recent signups</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>latest {Math.min(users.length, 8)}</span>
              </div>
              <div style={{ padding: users.length ? '6px 8px' : 0 }}>
                {users.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<UserPlus size={20} />}
                    title="No users found"
                    description="Make sure supabase_admin_panel.sql has been applied and you are signed in as an admin."
                  />
                ) : (
                  users.slice(0, 8).map((u) => (
                    <div
                      key={u.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '9px'
                      }}
                    >
                      <Avatar seed={u.email || u.user_id} label={initialsOf(u.email)} size={28} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {u.email || '(no email)'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          joined {relTime(u.created_at)} · {u.trades_count} trades
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {relTime(u.last_sign_in_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* users */}
        {tab === 'users' && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
                <Search
                  size={14}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  className="input-control"
                  placeholder="Search by email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '30px', width: '100%' }}
                  aria-label="Search users by email"
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {filteredUsers.length} / {users.length}
              </span>
            </div>

            {loadingData ? (
              <div style={{ padding: '10px 14px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                compact
                icon={<Users size={20} />}
                title={users.length === 0 ? 'No users yet' : 'No matches'}
                description={
                  users.length === 0
                    ? 'Make sure supabase_admin_panel.sql has been applied.'
                    : 'Try a different email search.'
                }
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '18px' }}>User</th>
                      <th className="sortable admin-hide-sm" onClick={() => toggleSort('created_at')}>
                        Joined {sortIcon('created_at')}
                      </th>
                      <th className="sortable" onClick={() => toggleSort('last_sign_in_at')}>
                        Last sign-in {sortIcon('last_sign_in_at')}
                      </th>
                      <th style={{ textAlign: 'right' }} className="admin-hide-sm">
                        Accounts
                      </th>
                      <th className="sortable" style={{ textAlign: 'right', paddingRight: '18px' }} onClick={() => toggleSort('trades_count')}>
                        Trades {sortIcon('trades_count')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isNew = Date.now() - new Date(u.created_at).getTime() < 7 * 86400000;
                      return (
                        <tr key={u.user_id}>
                          <td style={{ paddingLeft: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <Avatar seed={u.email || u.user_id} label={initialsOf(u.email)} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: 'var(--text-primary)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '240px'
                                    }}
                                  >
                                    {u.email || '(no email)'}
                                  </span>
                                  {isNew && (
                                    <span
                                      className="admin-pill"
                                      style={{
                                        color: 'var(--profit-green)',
                                        background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)'
                                      }}
                                    >
                                      New
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="admin-hide-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            {fmtDate(u.created_at)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            {u.last_sign_in_at ? (
                              <span title={fmtDateTime(u.last_sign_in_at)}>{relTime(u.last_sign_in_at)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>never</span>
                            )}
                          </td>
                          <td className="admin-hide-sm" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {u.accounts_count}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', paddingRight: '18px' }}>
                            {u.trades_count}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* content / moderation */}
        {tab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Public profiles</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Unpublish a profile to hide its public portfolio page.
                  </div>
                </div>
                <span className="admin-seg-count">{profiles.length}</span>
              </div>
              {loadingData ? (
                <div style={{ padding: '10px 14px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={3} />
                  ))}
                </div>
              ) : profiles.length === 0 ? (
                <EmptyState compact icon={<Globe size={20} />} title="No profiles yet" description="User profiles appear here once created." />
              ) : (
                <div style={{ padding: '6px 8px' }}>
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '9px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <Avatar seed={p.username} label={initialsOf(p.username)} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>@{p.username}</span>
                          <span
                            className="admin-pill"
                            style={
                              p.is_public
                                ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                                : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                            }
                          >
                            {p.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {p.display_name || '—'} · updated {relTime(p.updated_at)}
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggleProfile(p)}>
                        {p.is_public ? <EyeOff size={13} /> : <Eye size={13} />} {p.is_public ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Recent mentor comments</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Reviewers leave feedback on shared trade links. Delete anything inappropriate or spammy.
                  </div>
                </div>
                <span className="admin-seg-count">{comments.length}</span>
              </div>
              {loadingData ? (
                <div style={{ padding: '10px 14px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={2} />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <EmptyState
                  compact
                  icon={<MessageSquare size={20} />}
                  title="No comments yet"
                  description="Comments appear here when reviewers leave feedback — or the review schema is not applied."
                />
              ) : (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {comments.map((c) => (
                    <div key={c.id} className="admin-quote">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar seed={c.author} label={initialsOf(c.author)} size={26} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.author}</div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {fmtDateTime(c.created_at)} · token {c.session_token.slice(0, 8)}…
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteComment(c)}
                          title={`Delete comment from ${c.author}`}
                          aria-label={`Delete comment from ${c.author}`}
                          style={{ color: 'var(--loss-red)', flexShrink: 0, padding: '4px 7px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                        {c.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Toast />
    </div>
  );
};
