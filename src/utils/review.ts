import { supabase, isSupabaseConfigured } from './supabase';
import { Trade } from '../types';

export interface ReviewSession {
  token: string;
  tradeIds: string[];
  note?: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  sessionToken: string;
  tradeId: string | null;
  author: string;
  body: string;
  createdAt: string;
}

const genToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Creates a review session. The trade snapshot is stored locally (works on this
 * device immediately) and pushed to Supabase when the `review_sessions` table
 * exists (see supabase_review_schema.sql), which makes the link shareable.
 */
export const createReviewSession = async (
  tradeIds: string[],
  snapshot: Trade[],
  note?: string
): Promise<{ token: string; cloud: boolean }> => {
  const token = genToken();
  const session: ReviewSession = { token, tradeIds, note, createdAt: new Date().toISOString() };

  try {
    localStorage.setItem(`itrade_review_${token}`, JSON.stringify({ session, trades: snapshot }));
  } catch {
    /* ignore quota errors */
  }

  let cloud = false;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('review_sessions').insert({
        token,
        trade_ids: tradeIds,
        trades_snapshot: snapshot,
        note: note || null
      });
      cloud = !error;
    } catch {
      cloud = false;
    }
  }

  return { token, cloud };
};

export const fetchReviewSession = async (
  token: string
): Promise<{ trades: Trade[]; note?: string; cloud: boolean } | null> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (!error && data) {
        return {
          trades: (data.trades_snapshot as Trade[]) || [],
          note: data.note || undefined,
          cloud: true
        };
      }
    } catch {
      /* fall through to local */
    }
  }

  try {
    const raw = localStorage.getItem(`itrade_review_${token}`);
    if (raw) {
      const parsed = JSON.parse(raw) as { session?: ReviewSession; trades?: Trade[] };
      return { trades: parsed.trades || [], note: parsed.session?.note, cloud: false };
    }
  } catch {
    /* ignore */
  }

  return null;
};

export const fetchReviewComments = async (token: string): Promise<ReviewComment[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('review_comments')
      .select('*')
      .eq('session_token', token)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      sessionToken: String(c.session_token),
      tradeId: (c.trade_id as string) || null,
      author: String(c.author),
      body: String(c.body),
      createdAt: String(c.created_at)
    }));
  } catch {
    return [];
  }
};

export const addReviewComment = async (
  token: string,
  tradeId: string | null,
  author: string,
  body: string
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('review_comments').insert({
      session_token: token,
      trade_id: tradeId,
      author,
      body
    });
    return !error;
  } catch {
    return false;
  }
};
