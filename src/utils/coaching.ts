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

// ==========================================
// Coaching chat (2 arah) + broadcast (1 arah)
// ==========================================

export interface CoachMessage {
  id: string;
  link_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MentorBroadcast {
  id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  created_at: string;
}

export const fetchCoachMessages = async (linkId: string, limit = 200): Promise<CoachMessage[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('fetch_coach_messages', { p_link_id: linkId, p_limit: limit });
    if (error) throw error;
    return (data as CoachMessage[]) || [];
  } catch (err) {
    console.error('fetch_coach_messages failed:', err);
    return [];
  }
};

export const sendCoachMessage = async (linkId: string, body: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('send_coach_message', { p_link_id: linkId, p_body: body });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('send_coach_message failed:', err);
    return false;
  }
};

export const markCoachMessagesRead = async (linkId: string): Promise<number> => {
  if (!supabase) return 0;
  try {
    const { data, error } = await supabase.rpc('mark_coach_messages_read', { p_link_id: linkId });
    if (error) throw error;
    return Number(data) || 0;
  } catch {
    return 0;
  }
};

export const fetchCoachUnread = async (): Promise<Record<string, number>> => {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.rpc('coach_unread_by_link');
    if (error) throw error;
    return (data as Record<string, number>) || {};
  } catch {
    return {};
  }
};

export const fetchMentorBroadcasts = async (limit = 60): Promise<MentorBroadcast[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('mentor_broadcasts')
      .select('id, author_id, author_email, body, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as MentorBroadcast[]) || [];
  } catch {
    return [];
  }
};

export const postMentorBroadcast = async (body: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('post_mentor_broadcast', { p_body: body });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('post_mentor_broadcast failed:', err);
    return false;
  }
};

export const deleteMentorBroadcast = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('mentor_broadcasts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
};
