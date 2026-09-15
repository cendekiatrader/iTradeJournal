import { supabase } from '../utils/supabase';

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
