import { supabase } from './supabase';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface FeedbackInput {
  category: 'bug' | 'idea' | 'other';
  message: string;
  email?: string;
  userId?: string;
}

export const submitFeedback = async (input: FeedbackInput): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('feedback').insert({
      user_id: input.userId || null,
      email: input.email || null,
      category: input.category,
      message: input.message
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('submitFeedback failed:', err);
    return false;
  }
};

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return (data as Announcement[]) || [];
  } catch {
    return [];
  }
};
