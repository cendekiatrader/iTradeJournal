import { supabase } from '../utils/supabase';
import { Currency } from '../types';

export interface AdminStats {
  users?: number;
  signups_7d?: number;
  accounts?: number;
  trades?: number;
  trashed?: number;
  profiles?: number;
  public_profiles?: number;
  review_sessions?: number;
  comments?: number;
  settings_rows?: number;
}

export interface AdminUser {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  accounts_count: number;
  trades_count: number;
}

export interface AdminProfile {
  id: string;
  username: string;
  display_name: string | null;
  is_public: boolean;
  updated_at: string | null;
}

export interface AdminComment {
  id: string;
  session_token: string;
  author: string;
  body: string;
  created_at: string;
}

export interface AdminSuspension {
  user_id: string;
  suspended: boolean;
  suspended_at: string | null;
}

export interface AdminUserDetail {
  email?: string;
  created_at?: string;
  last_sign_in_at?: string | null;
  accounts_count?: number;
  trades_count?: number;
  trades_trashed?: number;
  suspended?: boolean;
  profile?: { username: string; display_name: string | null; is_public: boolean } | null;
  accounts?: {
    id: string;
    name: string;
    broker: string;
    currency: Currency;
    type?: string;
    status?: string;
    initial_balance?: number;
    current_balance?: number;
    created_at?: string;
  }[];
  trades?: {
    id: string;
    symbol: string;
    direction: string;
    entry_date: string;
    exit_date?: string | null;
    pnl: number;
    status: string;
    setup?: string;
    session?: string;
    deleted_at?: string | null;
  }[];
}

export const checkIsAdmin = async (): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
};

export const fetchAdminStats = async (): Promise<AdminStats | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_stats');
    if (error) throw error;
    return (data as AdminStats) || null;
  } catch (err) {
    console.error('admin_stats failed:', err);
    return null;
  }
};

export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return (data as AdminUser[]) || [];
  } catch (err) {
    console.error('admin_list_users failed:', err);
    return [];
  }
};

export const fetchAdminSuspensions = async (): Promise<AdminSuspension[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('user_flags').select('user_id, suspended, suspended_at');
    if (error) throw error;
    return (data as AdminSuspension[]) || [];
  } catch (err) {
    console.error('admin suspensions failed:', err);
    return [];
  }
};

export const setUserSuspended = async (userId: string, suspended: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('user_flags').upsert({
      user_id: userId,
      suspended,
      suspended_at: suspended ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('setUserSuspended failed:', err);
    return false;
  }
};

export const fetchAdminUserDetail = async (userId: string): Promise<AdminUserDetail | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_user_detail', { target: userId });
    if (error) throw error;
    return (data as AdminUserDetail) || null;
  } catch (err) {
    console.error('admin_user_detail failed:', err);
    return null;
  }
};

export const deleteAdminUser = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', { target: userId });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('admin_delete_user failed:', err);
    return false;
  }
};

export const fetchAdminProfiles = async (): Promise<AdminProfile[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, is_public, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data as AdminProfile[]) || [];
  } catch (err) {
    console.error('admin profiles failed:', err);
    return [];
  }
};

export const setProfilePublic = async (id: string, isPublic: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('setProfilePublic failed:', err);
    return false;
  }
};

export const fetchAdminComments = async (): Promise<AdminComment[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('review_comments')
      .select('id, session_token, author, body, created_at')
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw error;
    return (data as AdminComment[]) || [];
  } catch (err) {
    console.error('admin comments failed:', err);
    return [];
  }
};

export const deleteAdminComment = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('review_comments').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteAdminComment failed:', err);
    return false;
  }
};

// ==========================================
// Feedback / Announcements / Analytics
// ==========================================

export interface AdminFeedback {
  id: string;
  user_id: string | null;
  email: string | null;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  active: boolean;
  created_at: string;
}

export interface AdminAnalytics {
  total_users?: number;
  active_7d?: number;
  active_30d?: number;
  dormant?: number;
  signups_30d?: { day: string; count: number }[];
  trades_30d?: { day: string; count: number }[];
  top_users?: { user_id: string; email: string | null; trades: number }[];
}

export const fetchAdminFeedback = async (): Promise<AdminFeedback[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('id, user_id, email, category, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data as AdminFeedback[]) || [];
  } catch (err) {
    console.error('admin feedback failed:', err);
    return [];
  }
};

export const setFeedbackStatus = async (id: string, status: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('setFeedbackStatus failed:', err);
    return false;
  }
};

export const deleteFeedback = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteFeedback failed:', err);
    return false;
  }
};

export const fetchAdminAnnouncements = async (): Promise<AdminAnnouncement[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, active, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data as AdminAnnouncement[]) || [];
  } catch (err) {
    console.error('admin announcements failed:', err);
    return [];
  }
};

export const createAnnouncement = async (title: string, body: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('announcements').insert({ title, body, active: true });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('createAnnouncement failed:', err);
    return false;
  }
};

export const setAnnouncementActive = async (id: string, active: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('announcements').update({ active }).eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('setAnnouncementActive failed:', err);
    return false;
  }
};

export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteAnnouncement failed:', err);
    return false;
  }
};

export const fetchAdminAnalytics = async (): Promise<AdminAnalytics | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_analytics');
    if (error) throw error;
    return (data as AdminAnalytics) || null;
  } catch (err) {
    console.error('admin_analytics failed:', err);
    return null;
  }
};

// ==========================================
// Full-database backup (admin only, RLS admin_all)
// ==========================================

const BACKUP_TABLES = [
  'accounts',
  'trades',
  'withdrawals',
  'playbooks',
  'user_settings',
  'profiles',
  'review_sessions',
  'review_comments',
  'feedback',
  'announcements',
  'user_flags'
] as const;

const fetchAllRows = async (table: string): Promise<Record<string, unknown>[]> => {
  if (!supabase) return [];
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data as Record<string, unknown>[]) || [];
    rows.push(...chunk);
    if (chunk.length < pageSize || from > 500000) break;
    from += pageSize;
  }
  return rows;
};

export interface FullBackupResult {
  payload: string;
  bytes: number;
  counts: Record<string, number>;
}

export const fetchFullBackup = async (): Promise<FullBackupResult | null> => {
  if (!supabase) return null;
  try {
    const tables: Record<string, Record<string, unknown>[]> = {};
    const counts: Record<string, number> = {};
    for (const name of BACKUP_TABLES) {
      try {
        const rows = await fetchAllRows(name);
        tables[name] = rows;
        counts[name] = rows.length;
      } catch (err) {
        console.error(`backup: table ${name} failed:`, err);
        tables[name] = [];
        counts[name] = -1;
      }
    }
    const payload = JSON.stringify(
      {
        app: 'iTradeJournal',
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: 'admin',
        counts,
        tables
      },
      null,
      2
    );
    return { payload, counts, bytes: new Blob([payload]).size };
  } catch (err) {
    console.error('fetchFullBackup failed:', err);
    return null;
  }
};

// ==========================================
// Coaching / mentor role (admin)
// ==========================================

export interface AdminCoachingLink {
  link_id: string;
  user_id: string;
  email: string | null;
  status: string;
}

export interface AdminUserCoaching {
  is_mentor: boolean;
  as_mentor: AdminCoachingLink[];
  as_student: AdminCoachingLink[];
}

export const fetchMentors = async (): Promise<{ user_id: string }[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('mentors').select('user_id');
    if (error) throw error;
    return (data as { user_id: string }[]) || [];
  } catch {
    return [];
  }
};

export const adminSetMentor = async (userId: string, isMentor: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('admin_set_mentor', { p_user: userId, p_mentor: isMentor });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('admin_set_mentor failed:', err);
    return false;
  }
};

export const fetchAdminUserCoaching = async (userId: string): Promise<AdminUserCoaching | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_user_coaching', { p_user: userId });
    if (error) throw error;
    return (data as AdminUserCoaching) || null;
  } catch (err) {
    console.error('admin_user_coaching failed:', err);
    return null;
  }
};

export const adminLinkMentor = async (
  studentEmail: string,
  mentorEmail: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Offline.' };
  try {
    const { data, error } = await supabase.rpc('admin_link_mentor', {
      p_student_email: studentEmail,
      p_mentor_email: mentorEmail,
      p_active: active
    });
    if (error) throw error;
    const res = (data || {}) as { ok?: boolean; error?: string };
    return { ok: Boolean(res.ok), error: res.error };
  } catch (err) {
    console.error('admin_link_mentor failed:', err);
    return { ok: false, error: 'Link failed.' };
  }
};
