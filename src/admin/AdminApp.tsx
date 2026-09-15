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
  AdminAnnouncement,
  AdminAnalytics,
  AdminComment,
  AdminFeedback,
  AdminProfile,
  AdminStats,
  AdminSuspension,
  AdminUser,
  AdminUserDetail,
  checkIsAdmin,
  createAnnouncement,
  deleteAdminComment,
  deleteAdminUser,
  deleteAnnouncement,
  deleteFeedback,
  fetchAdminAnalytics,
  fetchAdminAnnouncements,
  fetchAdminComments,
  fetchAdminFeedback,
  fetchAdminProfiles,
  fetchAdminSuspensions,
  fetchAdminStats,
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchAdminUserCoaching,
  fetchMentors,
  fetchFullBackup,
  adminSetMentor,
  adminLinkMentor,
  AdminUserCoaching,
  setAnnouncementActive,
  setFeedbackStatus,
  setProfilePublic,
  setUserSuspended
} from './adminApi';
import { useModalA11y } from '../hooks/useModalA11y';
import { formatCurrency } from '../utils/formatters';
import { Currency } from '../types';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bug,
  CheckCheck,
  ClipboardList,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Inbox,
  Lightbulb,
  LogOut,
  Megaphone,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X
} from 'lucide-react';

type AdminStatus = 'loading' | 'not_configured' | 'signed_out' | 'denied' | 'ok';
type AdminTab = 'overview' | 'users' | 'content' | 'inbox';
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

const BarChart: React.FC<{ label: string; total: number; data: { day: string; count: number }[]; color: string }> = ({
  label,
  total,
  data,
  color
}) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{total} in 30 days</span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
          {data.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.count}`}
              style={{
                flex: 1,
                height: `${Math.max(4, (d.count / max) * 100)}%`,
                backgroundColor: color,
                borderRadius: '2px',
                opacity: d.count ? 1 : 0.22
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>{data[0]?.day || ''}</span>
          <span>{data[data.length - 1]?.day || ''}</span>
        </div>
      </div>
    </div>
  );
};

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
  const [suspensions, setSuspensions] = useState<AdminSuspension[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<AdminFeedback[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [mentorIds, setMentorIds] = useState<Set<string>>(new Set());
  const [detailCoaching, setDetailCoaching] = useState<AdminUserCoaching | null>(null);
  const [linkMentorEmail, setLinkMentorEmail] = useState('');
  const [linkStudentEmail, setLinkStudentEmail] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ at: string; bytes: number; counts: Record<string, number> } | null>(() => {
    try {
      const raw = localStorage.getItem('itrade_admin_backup_summary');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const detailRef = useModalA11y(Boolean(detailUser), () => {
    setDetailUser(null);
    setDetail(null);
  });

  useEffect(() => {
    const prev = document.title;
    document.title = 'Admin Console — iTradeJournal';
    return () => {
      document.title = prev;
    };
  }, []);

  const loadAll = useCallback(async () => {
    setBusy(true);
    const [s, u, p, c, susp, fb, ann, an, mentors] = await Promise.all([
      fetchAdminStats(),
      fetchAdminUsers(),
      fetchAdminProfiles(),
      fetchAdminComments(),
      fetchAdminSuspensions(),
      fetchAdminFeedback(),
      fetchAdminAnnouncements(),
      fetchAdminAnalytics(),
      fetchMentors()
    ]);
    setMentorIds(new Set(mentors.map((m) => m.user_id)));
    setStats(s);
    setUsers(u);
    setProfiles(p);
    setComments(c);
    setSuspensions(susp);
    setFeedbackItems(fb);
    setAnnouncements(ann);
    setAnalytics(an);
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

  const handleToggleProfile = async (p: AdminProfile): Promise<boolean> => {
    const next = !p.is_public;
    if (!next) {
      const ok = await confirm({
        title: `Unpublish @${p.username}?`,
        message: 'Their public portfolio page will no longer be reachable until they publish it again.',
        confirmText: 'Unpublish',
        variant: 'danger'
      });
      if (!ok) return false;
    }
    const done = await setProfilePublic(p.id, next);
    if (done) {
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_public: next } : x)));
      showToast(next ? `@${p.username} published again.` : `@${p.username} unpublished.`, 'success');
      return true;
    }
    showToast('Update failed — is the admin SQL applied?', 'error');
    return false;
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

  const suspendedIds = useMemo(
    () => new Set(suspensions.filter((x) => x.suspended).map((x) => x.user_id)),
    [suspensions]
  );

  const openDetail = useCallback(async (u: AdminUser) => {
    setDetailUser(u);
    setDetail(null);
    setDetailCoaching(null);
    setDetailLoading(true);
    const [d, coach] = await Promise.all([fetchAdminUserDetail(u.user_id), fetchAdminUserCoaching(u.user_id)]);
    setDetail(d);
    setDetailCoaching(coach);
    setDetailLoading(false);
  }, []);

  const closeDetail = () => {
    setDetailUser(null);
    setDetail(null);
  };

  const handleToggleSuspended = async (u: AdminUser, next: boolean) => {
    const ok = await confirm({
      title: next ? `Suspend ${u.email}?` : `Unsuspend ${u.email}?`,
      message: next
        ? 'The user will be blocked from the journal the next time the app loads, until you unsuspend them.'
        : 'The user will regain access to the journal.',
      confirmText: next ? 'Suspend' : 'Unsuspend',
      variant: next ? 'danger' : 'info'
    });
    if (!ok) return;
    setDetailBusy(true);
    const done = await setUserSuspended(u.user_id, next);
    setDetailBusy(false);
    if (!done) {
      showToast('Update failed — is supabase_admin_users.sql applied?', 'error');
      return;
    }
    setSuspensions((prev) => [
      ...prev.filter((x) => x.user_id !== u.user_id),
      { user_id: u.user_id, suspended: next, suspended_at: next ? new Date().toISOString() : null }
    ]);
    setDetail((d) => (d ? { ...d, suspended: next } : d));
    showToast(next ? 'User suspended.' : 'User unsuspended.', next ? 'info' : 'success');
  };

  const handleDeleteUser = async (u: AdminUser) => {
    const ok = await confirm({
      title: `Delete ${u.email} permanently?`,
      message: 'This deletes the account and ALL of its data (accounts, trades, playbooks, settings). This cannot be undone.',
      confirmText: 'Delete permanently',
      variant: 'danger',
      typeToConfirm: u.email || undefined
    });
    if (!ok) return;
    setDetailBusy(true);
    const done = await deleteAdminUser(u.user_id);
    setDetailBusy(false);
    if (!done) {
      showToast('Delete failed — is supabase_admin_users.sql applied?', 'error');
      return;
    }
    showToast('User deleted.', 'info');
    closeDetail();
    loadAll();
  };

  const refreshCoaching = async (uid: string) => {
    const [coach, mentors] = await Promise.all([fetchAdminUserCoaching(uid), fetchMentors()]);
    setDetailCoaching(coach);
    setMentorIds(new Set(mentors.map((m) => m.user_id)));
  };

  const handleToggleMentor = async (u: AdminUser) => {
    const isM = mentorIds.has(u.user_id);
    const ok = await confirm({
      title: isM ? `Revoke mentor role from ${u.email}?` : `Make ${u.email} a mentor?`,
      message: isM
        ? 'Their student links become inactive. Saved coach notes are kept.'
        : 'They can be requested as a mentor by students and get the Coaching tab in the app.',
      confirmText: isM ? 'Revoke' : 'Make mentor',
      variant: isM ? 'danger' : 'info'
    });
    if (!ok) return;
    setCoachBusy(true);
    const done = await adminSetMentor(u.user_id, !isM);
    setCoachBusy(false);
    if (!done) {
      showToast('Update failed — is supabase_coaching.sql applied?', 'error');
      return;
    }
    showToast(!isM ? 'Mentor role granted.' : 'Mentor role revoked.', 'success');
    refreshCoaching(u.user_id);
  };

  const handleLinkMentor = async (u: AdminUser, direction: 'as_student' | 'as_mentor') => {
    const sEmail = direction === 'as_student' ? u.email || '' : linkStudentEmail.trim();
    const mEmail = direction === 'as_student' ? linkMentorEmail.trim() : u.email || '';
    if (!sEmail || !mEmail) return;
    setCoachBusy(true);
    const res = await adminLinkMentor(sEmail, mEmail, true);
    setCoachBusy(false);
    if (!res.ok) {
      showToast(res.error || 'Link failed.', 'error');
      return;
    }
    showToast('Mentor link created.', 'success');
    setLinkMentorEmail('');
    setLinkStudentEmail('');
    refreshCoaching(u.user_id);
  };

  const handleUnlinkMentor = async (u: AdminUser, asMentor: boolean, otherEmail: string | null) => {
    if (!otherEmail) return;
    const sEmail = asMentor ? otherEmail : u.email || '';
    const mEmail = asMentor ? u.email || '' : otherEmail;
    setCoachBusy(true);
    const res = await adminLinkMentor(sEmail, mEmail, false);
    setCoachBusy(false);
    if (!res.ok) {
      showToast(res.error || 'Unlink failed.', 'error');
      return;
    }
    showToast('Mentor link revoked.', 'info');
    refreshCoaching(u.user_id);
  };

  const toggleDetailProfile = async () => {
    if (!detailUser || !detail?.profile) return;
    const p = detail.profile;
    const next = !p.is_public;
    const done = await handleToggleProfile({
      id: detailUser.user_id,
      username: p.username,
      display_name: p.display_name,
      is_public: p.is_public,
      updated_at: null
    });
    if (done) {
      setDetail((d) => (d && d.profile ? { ...d, profile: { ...d.profile, is_public: next } } : d));
    }
  };

  const newFeedbackCount = feedbackItems.filter((f) => f.status === 'new').length;

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    setPostingAnn(true);
    const ok = await createAnnouncement(annTitle.trim(), annBody.trim());
    setPostingAnn(false);
    if (!ok) {
      showToast('Publish failed — is supabase_feedback_announcements.sql applied?', 'error');
      return;
    }
    showToast('Announcement published.', 'success');
    setAnnTitle('');
    setAnnBody('');
    loadAll();
  };

  const handleToggleAnnouncement = async (a: AdminAnnouncement) => {
    const ok = await setAnnouncementActive(a.id, !a.active);
    if (!ok) {
      showToast('Update failed — is the SQL applied?', 'error');
      return;
    }
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
    showToast(!a.active ? 'Announcement is live again.' : 'Announcement hidden.', 'info');
  };

  const handleDeleteAnnouncement = async (a: AdminAnnouncement) => {
    const ok = await confirm({
      title: 'Delete this announcement?',
      message: a.title,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    const done = await deleteAnnouncement(a.id);
    if (!done) {
      showToast('Delete failed.', 'error');
      return;
    }
    setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
    showToast('Announcement deleted.', 'info');
  };

  const handleFeedbackStatus = async (f: AdminFeedback, status: string) => {
    const ok = await setFeedbackStatus(f.id, status);
    if (!ok) {
      showToast('Update failed.', 'error');
      return;
    }
    setFeedbackItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, status } : x)));
  };

  const handleDeleteFeedback = async (f: AdminFeedback) => {
    const ok = await confirm({
      title: 'Delete this feedback?',
      message: f.message.slice(0, 140),
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    const done = await deleteFeedback(f.id);
    if (!done) {
      showToast('Delete failed.', 'error');
      return;
    }
    setFeedbackItems((prev) => prev.filter((x) => x.id !== f.id));
    showToast('Feedback deleted.', 'info');
  };

  const handleDownloadBackup = async () => {
    setBackupBusy(true);
    const res = await fetchFullBackup();
    setBackupBusy(false);
    if (!res) {
      showToast('Backup failed — check your connection and admin SQL.', 'error');
      return;
    }
    const blob = new Blob([res.payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `itradejournal-full-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    const summary = { at: new Date().toLocaleString(), bytes: res.bytes, counts: res.counts };
    setLastBackup(summary);
    try {
      localStorage.setItem('itrade_admin_backup_summary', JSON.stringify(summary));
    } catch {
      /* ignore */
    }
    showToast(`Backup downloaded (${(res.bytes / 1024 / 1024).toFixed(2)} MB).`, 'success');
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

  const isSuspended = detailUser ? suspendedIds.has(detailUser.user_id) : false;

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
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'inbox'}
              className={tab === 'inbox' ? 'active' : ''}
              onClick={() => setTab('inbox')}
            >
              <Inbox size={14} /> Inbox
              {newFeedbackCount > 0 && <span className="admin-seg-count">{newFeedbackCount}</span>}
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

            {analytics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <BarChart
                  label="New signups"
                  total={(analytics.signups_30d || []).reduce((s, d) => s + d.count, 0)}
                  data={analytics.signups_30d || []}
                  color="var(--theme-secondary)"
                />
                <BarChart
                  label="Trades logged"
                  total={(analytics.trades_30d || []).reduce((s, d) => s + d.count, 0)}
                  data={analytics.trades_30d || []}
                  color="var(--profit-green)"
                />
              </div>
            )}
            {analytics && (
              <div className="admin-grid" style={{ marginBottom: '16px' }}>
                {[
                  { label: 'Active 7d', value: analytics.active_7d },
                  { label: 'Active 30d', value: analytics.active_30d },
                  { label: 'Dormant >30d', value: analytics.dormant },
                  { label: 'Total users', value: analytics.total_users }
                ].map((s) => (
                  <div key={s.label} className="admin-stat" style={{ padding: '10px 12px' }}>
                    <div>
                      <div className="admin-stat-value" style={{ fontSize: '1.05rem' }}>
                        {s.value === undefined ? '—' : s.value}
                      </div>
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
            {analytics?.top_users && analytics.top_users.length > 0 && (
              <div style={{ ...panelStyle, marginTop: '16px' }}>
                <div style={panelHeaderStyle}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Top traders by volume</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>all time</span>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  {analytics.top_users.map((tu) => (
                    <div key={tu.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
                      <Avatar seed={tu.email || tu.user_id} label={initialsOf(tu.email)} size={26} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tu.email || tu.user_id}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700 }}>{tu.trades}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ ...panelStyle, marginTop: '16px' }}>
              <div style={panelHeaderStyle}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Data backup</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Download a full JSON snapshot of every table (all users). Keep it somewhere safe.
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadBackup} disabled={backupBusy}>
                  <Download size={13} /> {backupBusy ? 'Preparing…' : 'Download full backup'}
                </button>
              </div>
              {lastBackup ? (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Last snapshot: <strong>{lastBackup.at}</strong> · {(lastBackup.bytes / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(lastBackup.counts).map(([name, count]) => (
                      <span
                        key={name}
                        className="admin-pill"
                        style={{ color: 'var(--text-secondary)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }}
                      >
                        {name}: {count < 0 ? 'n/a' : count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  No admin backup taken yet. Runs in your browser — a few seconds for big databases.
                </div>
              )}
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
                      <th className="sortable" style={{ textAlign: 'right' }} onClick={() => toggleSort('trades_count')}>
                        Trades {sortIcon('trades_count')}
                      </th>
                      <th style={{ width: '26px', paddingRight: '12px' }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isNew = Date.now() - new Date(u.created_at).getTime() < 7 * 86400000;
                      return (
                        <tr key={u.user_id} onClick={() => openDetail(u)} style={{ cursor: 'pointer' }} title="View details">
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
                                  {mentorIds.has(u.user_id) && (
                                    <span
                                      className="admin-pill"
                                      style={{
                                        color: 'var(--theme-secondary)',
                                        background: 'color-mix(in srgb, var(--theme-secondary-strong) 16%, transparent)'
                                      }}
                                    >
                                      Mentor
                                    </span>
                                  )}
                                  {suspendedIds.has(u.user_id) && (
                                    <span
                                      className="admin-pill"
                                      style={{
                                        color: 'var(--loss-red)',
                                        background: 'color-mix(in srgb, var(--loss-red) 14%, transparent)'
                                      }}
                                    >
                                      Suspended
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
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {u.trades_count}
                          </td>
                          <td style={{ paddingRight: '12px', color: 'var(--text-muted)' }}>
                            <ChevronRight size={14} />
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

        {/* inbox: announcements + feedback */}
        {tab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Announcements</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Published announcements show as a banner (and in the bell) for every signed-in user.
                  </div>
                </div>
                <span className="admin-seg-count">{announcements.length}</span>
              </div>
              <form
                onSubmit={handlePublishAnnouncement}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <input
                  className="input-control"
                  placeholder="Announcement title…"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  maxLength={120}
                  aria-label="Announcement title"
                />
                <textarea
                  className="input-control"
                  rows={3}
                  placeholder="What should users know? (new feature, maintenance, tips…)"
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  maxLength={600}
                  style={{ resize: 'vertical' }}
                  aria-label="Announcement body"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={postingAnn || !annTitle.trim() || !annBody.trim()}
                  >
                    <Send size={13} /> {postingAnn ? 'Publishing…' : 'Publish announcement'}
                  </button>
                </div>
              </form>
              {announcements.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Megaphone size={20} />}
                  title="No announcements yet"
                  description="Publish your first one above — users see it right away."
                />
              ) : (
                <div style={{ padding: '6px 8px' }}>
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '9px', flexWrap: 'wrap' }}
                    >
                      <Megaphone
                        size={15}
                        color={a.active ? 'var(--theme-secondary)' : 'var(--text-muted)'}
                        style={{ marginTop: '3px', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              color: a.active ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                          >
                            {a.title}
                          </span>
                          <span
                            className="admin-pill"
                            style={
                              a.active
                                ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                                : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                            }
                          >
                            {a.active ? 'Live' : 'Hidden'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>
                          {a.body}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                          {relTime(a.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleToggleAnnouncement(a)}>
                          {a.active ? <EyeOff size={12} /> : <Eye size={12} />} {a.active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteAnnouncement(a)}
                          style={{ color: 'var(--loss-red)', padding: '4px 7px' }}
                          aria-label={`Delete announcement ${a.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>User feedback</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Bug reports and feature ideas sent from inside the app.
                  </div>
                </div>
                {newFeedbackCount > 0 && <span className="admin-seg-count">{newFeedbackCount} new</span>}
              </div>
              {feedbackItems.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Inbox size={20} />}
                  title="No feedback yet"
                  description="Users can send feedback from the user menu inside the app."
                />
              ) : (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {feedbackItems.map((f) => (
                    <div key={f.id} className="admin-quote">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="admin-pill"
                          style={
                            f.category === 'bug'
                              ? { color: 'var(--loss-red)', background: 'color-mix(in srgb, var(--loss-red) 14%, transparent)' }
                              : f.category === 'idea'
                              ? { color: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 14%, transparent)' }
                              : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                          }
                        >
                          {f.category === 'bug' ? <Bug size={10} /> : f.category === 'idea' ? <Lightbulb size={10} /> : <MessageSquare size={10} />}{' '}
                          {f.category}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{f.email || 'anonymous'}</span>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {relTime(f.created_at)}
                        </span>
                        <span
                          className="admin-pill"
                          style={{
                            marginLeft: 'auto',
                            ...(f.status === 'new'
                              ? { color: 'var(--theme-secondary)', background: 'color-mix(in srgb, var(--theme-secondary-strong) 16%, transparent)' }
                              : f.status === 'resolved'
                              ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                              : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' })
                          }}
                        >
                          {f.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {f.message}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {f.status !== 'new' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleFeedbackStatus(f, 'new')}>
                            Mark unread
                          </button>
                        )}
                        {f.status === 'new' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleFeedbackStatus(f, 'read')}>
                            <CheckCheck size={12} /> Mark read
                          </button>
                        )}
                        {f.status !== 'resolved' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleFeedbackStatus(f, 'resolved')}>
                            <CheckCheck size={12} /> Resolve
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteFeedback(f)}
                          style={{ color: 'var(--loss-red)', marginLeft: 'auto' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* User detail — drill-down + control */}
      {detailUser && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div
            ref={detailRef}
            className="modal-container"
            role="dialog"
            aria-modal="true"
            aria-label={`User details: ${detailUser.email}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '760px' }}
          >
            <div className="modal-header" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Avatar seed={detailUser.email || detailUser.user_id} label={initialsOf(detailUser.email)} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {detailUser.email || '(no email)'}
                    </span>
                    {isSuspended && (
                      <span
                        className="admin-pill"
                        style={{ color: 'var(--loss-red)', background: 'color-mix(in srgb, var(--loss-red) 14%, transparent)' }}
                      >
                        <ShieldAlert size={10} /> Suspended
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    id {detailUser.user_id}
                  </div>
                </div>
              </div>
              <button type="button" onClick={closeDetail} className="btn btn-ghost btn-icon btn-sm" aria-label="Close user details">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 22px', maxHeight: '62vh', overflowY: 'auto' }}>
              {detailLoading ? (
                <div>
                  {[0, 1, 2].map((i) => (
                    <TableRowSkeleton key={i} cols={3} />
                  ))}
                </div>
              ) : !detail ? (
                <EmptyState
                  compact
                  icon={<UserPlus size={20} />}
                  title="Could not load user data"
                  description="Make sure supabase_admin_users.sql has been applied."
                />
              ) : (
                <>
                  <div className="admin-grid" style={{ marginBottom: '14px' }}>
                    {[
                      { label: 'Accounts', value: String(detail.accounts_count ?? 0) },
                      { label: 'Trades', value: String(detail.trades_count ?? 0) },
                      { label: 'In trash', value: String(detail.trades_trashed ?? 0) },
                      { label: 'Joined', value: detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—' },
                      { label: 'Last sign-in', value: detail.last_sign_in_at ? relTime(detail.last_sign_in_at) : 'never' }
                    ].map((s) => (
                      <div key={s.label} className="admin-stat" style={{ padding: '10px 12px' }}>
                        <div>
                          <div className="admin-stat-value" style={{ fontSize: '1.05rem' }}>
                            {s.value}
                          </div>
                          <div className="admin-stat-label">{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '14px 0 8px' }}>Accounts</div>
                  {(detail.accounts || []).length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No accounts.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(detail.accounts || []).map((a) => (
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
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {a.broker || '—'} · {a.type || '—'}
                              {a.status ? ` · ${a.status}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                              {formatCurrency(a.current_balance ?? 0, (a.currency || 'USD') as Currency)}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                              from {formatCurrency(a.initial_balance ?? 0, (a.currency || 'USD') as Currency)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '16px 0 8px' }}>
                    Recent trades ({detail.trades?.length ?? 0})
                  </div>
                  {(detail.trades || []).length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No trades.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: '12px' }}>Symbol</th>
                            <th>Dir</th>
                            <th>Entry</th>
                            <th style={{ textAlign: 'right' }}>PnL</th>
                            <th style={{ textAlign: 'right', paddingRight: '12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.trades || []).map((tr) => (
                            <tr key={tr.id} style={tr.deleted_at ? { opacity: 0.55 } : undefined}>
                              <td style={{ paddingLeft: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                {tr.symbol}
                              </td>
                              <td>{tr.direction}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                                {tr.entry_date ? new Date(tr.entry_date).toLocaleDateString() : '—'}
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  color: tr.pnl > 0 ? 'var(--profit-green)' : tr.pnl < 0 ? 'var(--loss-red)' : 'var(--text-secondary)'
                                }}
                              >
                                {tr.pnl > 0 ? '+' : ''}
                                {formatCurrency(tr.pnl, 'USD')}
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                {tr.deleted_at ? (
                                  <span
                                    className="admin-pill"
                                    style={{ color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }}
                                  >
                                    Trashed
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem' }}>{tr.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Mentor / coach
                    {mentorIds.has(detailUser.user_id) && (
                      <span
                        className="admin-pill"
                        style={{ color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }}
                      >
                        Mentor
                      </span>
                    )}
                  </div>
                  <button className="btn btn-secondary btn-sm" disabled={coachBusy} onClick={() => handleToggleMentor(detailUser)}>
                    <GraduationCap size={13} /> {mentorIds.has(detailUser.user_id) ? 'Revoke mentor role' : 'Make mentor'}
                  </button>
                  {detailCoaching && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Mentoring (students):</div>
                      {(detailCoaching.as_mentor || []).length === 0 ? (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>No students.</p>
                      ) : (
                        (detailCoaching.as_mentor || []).map((l) => (
                          <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</span>
                            <span
                              className="admin-pill"
                              style={
                                l.status === 'active'
                                  ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                                  : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                              }
                            >
                              {l.status}
                            </span>
                            <button className="btn btn-ghost btn-sm" disabled={coachBusy} onClick={() => handleUnlinkMentor(detailUser, true, l.email)}>
                              Unlink
                            </button>
                          </div>
                        ))
                      )}
                      {mentorIds.has(detailUser.user_id) && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <input
                            className="input-control"
                            placeholder="Connect as mentor of (student email)"
                            value={linkStudentEmail}
                            onChange={(e) => setLinkStudentEmail(e.target.value)}
                            style={{ flex: '1 1 220px' }}
                            aria-label="Student email"
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={coachBusy || !linkStudentEmail.trim()}
                            onClick={() => handleLinkMentor(detailUser, 'as_mentor')}
                          >
                            Connect
                          </button>
                        </div>
                      )}

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '12px 0 4px' }}>Mentored by:</div>
                      {(detailCoaching.as_student || []).length === 0 ? (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>No mentor.</p>
                      ) : (
                        (detailCoaching.as_student || []).map((l) => (
                          <div key={l.link_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</span>
                            <span
                              className="admin-pill"
                              style={
                                l.status === 'active'
                                  ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                                  : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                              }
                            >
                              {l.status}
                            </span>
                            <button className="btn btn-ghost btn-sm" disabled={coachBusy} onClick={() => handleUnlinkMentor(detailUser, false, l.email)}>
                              Unlink
                            </button>
                          </div>
                        ))
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <input
                          className="input-control"
                          placeholder="Connect as student of (mentor email)"
                          value={linkMentorEmail}
                          onChange={(e) => setLinkMentorEmail(e.target.value)}
                          style={{ flex: '1 1 220px' }}
                          aria-label="Mentor email"
                        />
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={coachBusy || !linkMentorEmail.trim()}
                          onClick={() => handleLinkMentor(detailUser, 'as_student')}
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '16px 0 8px' }}>Public profile</div>
                  {detail.profile ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>@{detail.profile.username}</span>
                        <span
                          className="admin-pill"
                          style={
                            detail.profile.is_public
                              ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                              : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                          }
                        >
                          {detail.profile.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={toggleDetailProfile} disabled={detailBusy}>
                        {detail.profile.is_public ? <EyeOff size={13} /> : <Eye size={13} />}{' '}
                        {detail.profile.is_public ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No public profile set up.</p>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={detailBusy || detailUser.user_id === user?.id}
                  onClick={() => handleToggleSuspended(detailUser, !(detail?.suspended ?? isSuspended))}
                  title={detailUser.user_id === user?.id ? 'You cannot suspend your own account' : undefined}
                >
                  {(detail?.suspended ?? isSuspended) ? (
                    <>
                      <PlayCircle size={13} /> Unsuspend
                    </>
                  ) : (
                    <>
                      <PauseCircle size={13} /> Suspend
                    </>
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--loss-red)' }}
                  disabled={detailBusy || detailUser.user_id === user?.id}
                  onClick={() => handleDeleteUser(detailUser)}
                  title={detailUser.user_id === user?.id ? 'You cannot delete your own account' : 'Delete user and all their data'}
                >
                  <Trash2 size={13} /> Delete user
                </button>
              </div>
              <button className="btn btn-primary btn-sm" onClick={closeDetail}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
};
