import { supabase } from './supabase';

export interface CoachLink {
  link_id: string;
  user_id: string;
  email: string | null;
  status: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  user_id: string;
  email: string | null;
  note: string | null;
  created_at: string;
  status?: string;
}

export interface CoachingOverview {
  is_mentor: boolean;
  as_mentor: CoachLink[];
  as_student: CoachLink[];
  review_requests: ReviewItem[];
  my_open_reviews: ReviewItem[];
}

export interface StudentAccount {
  id: string;
  name: string;
  broker: string;
  currency: string;
  status?: string;
  initial_balance?: number;
  current_balance?: number;
}

export interface StudentTrade {
  id: string;
  symbol: string;
  direction: string;
  entry_date: string;
  exit_date?: string | null;
  pnl: number;
  status: string;
  setup?: string;
  session?: string;
  rules_followed?: boolean;
  deleted_at?: string | null;
}

export interface StudentNote {
  id: string;
  trade_id: string;
  body: string;
  author_role: string;
  created_at: string;
}

export interface StudentData {
  email?: string;
  accounts: StudentAccount[];
  trades: StudentTrade[];
  notes: StudentNote[];
}

export interface MyCoachNote {
  id: string;
  trade_id: string;
  body: string;
  author_role: string;
  created_at: string;
  read_at: string | null;
}

export const fetchCoachingOverview = async (): Promise<CoachingOverview | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('coaching_overview');
    if (error) throw error;
    return (data as CoachingOverview) || null;
  } catch (err) {
    console.error('coaching_overview failed:', err);
    return null;
  }
};

export const requestMentor = async (email: string): Promise<{ ok: boolean; error?: string }> => {
  if (!supabase) return { ok: false, error: 'Offline.' };
  try {
    const { data, error } = await supabase.rpc('request_mentor', { p_email: email });
    if (error) throw error;
    const res = (data || {}) as { ok?: boolean; error?: string };
    return { ok: Boolean(res.ok), error: res.error };
  } catch (err) {
    console.error('request_mentor failed:', err);
    return { ok: false, error: 'Request failed.' };
  }
};

export const respondMentorRequest = async (linkId: string, accept: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('respond_mentor_request', { p_link_id: linkId, p_accept: accept });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('respond_mentor_request failed:', err);
    return false;
  }
};

export const fetchMentorStudentData = async (studentId: string): Promise<StudentData | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('mentor_student_data', { p_student: studentId });
    if (error) throw error;
    return (data as StudentData) || null;
  } catch (err) {
    console.error('mentor_student_data failed:', err);
    return null;
  }
};

export const addTradeNote = async (tradeId: string, body: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('add_trade_note', { p_trade_id: tradeId, p_body: body });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('add_trade_note failed:', err);
    return false;
  }
};

export const markNotesRead = async (): Promise<number> => {
  if (!supabase) return 0;
  try {
    const { data, error } = await supabase.rpc('mark_notes_read');
    if (error) throw error;
    return Number(data) || 0;
  } catch {
    return 0;
  }
};

export const markNoteRead = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('mark_note_read', { p_id: id });
    if (error) throw error;
    return Boolean(data);
  } catch {
    return false;
  }
};

export const requestReview = async (mentorId: string, note: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('request_review', { p_mentor: mentorId, p_note: note });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('request_review failed:', err);
    return false;
  }
};

export const resolveReviewRequest = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('resolve_review_request', { p_id: id });
    if (error) throw error;
    return Boolean(data);
  } catch {
    return false;
  }
};

/** Coach notes written on MY trades (for the bell + trade details). */
export const fetchMyCoachNotes = async (): Promise<MyCoachNote[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('trade_notes')
      .select('id, trade_id, body, author_role, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data as MyCoachNote[]) || [];
  } catch {
    return [];
  }
};

/** Notes attached to one trade (visible to the student + the note authors). */
export const fetchTradeNotes = async (tradeId: string): Promise<StudentNote[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('trade_notes')
      .select('id, trade_id, body, author_role, created_at')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as StudentNote[]) || [];
  } catch {
    return [];
  }
};
