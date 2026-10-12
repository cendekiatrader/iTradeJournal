import { supabase } from './supabase';

/**
 * CopyTrade data layer (public + self-serve provider).
 *
 * Everything the public pages need goes through RPCs (`copytrade_leaderboard`,
 * `copytrade_provider_public`) so the database - not the UI - decides which
 * columns anonymous visitors may see. Writes that change roles (apply as
 * provider, report a provider) are SECURITY DEFINER RPCs too.
 *
 * The module tolerates a database where `supabase_copytrade.sql` has not been
 * run yet: reads return empty and `missing: true` instead of throwing, so the
 * public page can show "not active yet" instead of a blank screen or an error.
 */

export interface CopyLeaderRow {
  slug: string;
  displayName: string;
  bio: string;
  isVerified: boolean;
  isSuspended: boolean;
  followers: number;
  trades: number;
  winrate: number | null;
  avgRr: number | null;
  /** Max drawdown in POINTS (lot sizes differ per client, so points are the
   *  only figure that means the same thing for everybody). */
  maxDdPoints: number | null;
  totalPoints: number | null;
  eaOnline: boolean;
  lastSeen: string | null;
}

export interface CopyProviderDetail {
  provider: CopyLeaderRow;
  openPositions: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    volume: number;
    entry: number;
    sl: number | null;
    tp: number | null;
    openedAt: string;
  }>;
  recent: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    volume: number;
    entry: number;
    exit: number | null;
    closedAt: string | null;
    pnl: number | null;
  }>;
}

export type CopyApplyResult = { ok: boolean; error?: string; slug?: string };
export type CopyReportResult = { ok: boolean; error?: string };

/** Files offered on the public download card. Served straight from `public/`. */
export interface EaFile {
  /** Path inside the deployed site. */
  href: string;
  filename: string;
  label: string;
  detail: string;
  /** `true` for the ready-to-use compiled binary, false for the source. */
  compiled: boolean;
}

export const EA_FILES: EaFile[] = [
  {
    href: '/downloads/ITJCopyTrade.ex5',
    filename: 'ITJCopyTrade.ex5',
    label: 'Ready to run (.ex5)',
    detail: 'Already compiled - copy it into the MT5 experts folder and attach it to a chart.',
    compiled: true
  },
  {
    href: '/downloads/ITJCopyTrade.mq5',
    filename: 'ITJCopyTrade.mq5',
    label: 'Source code (.mq5)',
    detail: 'Same file, uncompiled. Open it in MetaEditor and press Compile if you want to read the code or build it yourself.',
    compiled: false
  }
];

const MISSING_HINTS = [
  'could not find the function',
  'does not exist',
  'schema cache',
  'undefined table',
  'undefined function'
];

const looksMissing = (message: string): boolean => {
  const m = (message || '').toLowerCase();
  return MISSING_HINTS.some((h) => m.includes(h));
};

/**
 * Thin RPC wrapper: normalises the three outcomes the UI cares about
 * (data / error / "the CopyTrade migration has not been run here").
 */
async function callRpc<T>(
  name: string,
  params?: Record<string, unknown>
): Promise<{ data: T | null; error: string | null; missing: boolean }> {
  if (!supabase) return { data: null, error: 'Supabase not configured', missing: true };
  try {
    const { data, error } = await supabase.rpc(name, params as any);
    if (error) throw error;
    return { data: (data as T) ?? null, error: null, missing: false };
  } catch (err: any) {
    const message = err?.message || 'Request failed';
    return { data: null, error: message, missing: looksMissing(message) };
  }
}

const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Row shape returned by the `copytrade_leaderboard` RPC (snake_case). */
interface LeaderRaw {
  slug?: string;
  display_name?: string;
  bio?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  followers?: number;
  trades?: number;
  winrate?: number;
  avg_rr?: number;
  max_dd_points?: number;
  total_points?: number;
  ea_online?: boolean;
  last_seen?: string | null;
}

const mapLeader = (row: LeaderRaw): CopyLeaderRow => ({
  slug: String(row.slug || ''),
  displayName: String(row.display_name || row.slug || 'Provider'),
  bio: String(row.bio || ''),
  isVerified: Boolean(row.is_verified),
  isSuspended: Boolean(row.is_suspended),
  followers: asNumber(row.followers),
  trades: asNumber(row.trades),
  winrate: asNullableNumber(row.winrate),
  avgRr: asNullableNumber(row.avg_rr),
  maxDdPoints: asNullableNumber(row.max_dd_points),
  totalPoints: asNullableNumber(row.total_points),
  eaOnline: Boolean(row.ea_online),
  lastSeen: row.last_seen ?? null
});

/** Public leaderboard. Empty array when the migration has not been run. */
export const fetchLeaderboard = async (): Promise<{
  rows: CopyLeaderRow[];
  missing: boolean;
  error: string | null;
}> => {
  const { data, error, missing } = await callRpc<LeaderRaw[]>('copytrade_leaderboard');
  if (!Array.isArray(data)) return { rows: [], missing, error };
  return {
    rows: data
      .map(mapLeader)
      .filter((r) => r.slug && !r.isSuspended)
      .sort((a, b) => b.followers - a.followers),
    missing,
    error
  };
};

/** One provider's public page. Null when the provider does not exist. */
export const fetchProviderPublic = async (
  slug: string
): Promise<{ detail: CopyProviderDetail | null; missing: boolean; error: string | null }> => {
  if (!slug) return { detail: null, missing: false, error: 'Missing slug' };
  const { data, error, missing } = await callRpc<any>('copytrade_provider_public', { p_slug: slug });
  if (!data || typeof data !== 'object') return { detail: null, missing, error };
  const provider = mapLeader(data.provider || { slug });
  const openPositions = Array.isArray(data.open_positions) ? data.open_positions : [];
  const recent = Array.isArray(data.recent) ? data.recent : [];
  return {
    detail: {
      provider,
      openPositions: openPositions.map((p: any) => ({
        symbol: String(p.symbol || ''),
        side: p.side === 'sell' ? 'sell' : 'buy',
        volume: asNumber(p.volume),
        entry: asNumber(p.entry),
        sl: asNullableNumber(p.sl),
        tp: asNullableNumber(p.tp),
        openedAt: String(p.opened_at || '')
      })),
      recent: recent.map((p: any) => ({
        symbol: String(p.symbol || ''),
        side: p.side === 'sell' ? 'sell' : 'buy',
        volume: asNumber(p.volume),
        entry: asNumber(p.entry),
        exit: asNullableNumber(p.exit),
        closedAt: p.closed_at ?? null,
        pnl: asNullableNumber(p.pnl)
      }))
    },
    missing,
    error
  };
};

/**
 * Self-serve provider registration. Publishes immediately (the platform
 * moderates after the fact, not before), so the terms + the 24/7 acknowledgement
 * are enforced here and again inside the RPC.
 */
export const applyAsProvider = async (input: {
  displayName: string;
  slug: string;
  bio: string;
}): Promise<CopyApplyResult> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false, error: 'Sign in first' };
    const { data, error } = await supabase.rpc('apply_provider', {
      p_slug: input.slug,
      p_display_name: input.displayName,
      p_bio: input.bio
    });
    if (error) throw error;
    return { ok: true, slug: (data as any)?.slug || input.slug };
  } catch (err: any) {
    const message = err?.message || 'Could not register as provider';
    return { ok: false, error: looksMissing(message) ? 'CopyTrade is not active on this deployment yet.' : message };
  }
};

/** Is the signed-in user already a provider? Returns the slug when yes. */
export const fetchMyProvider = async (): Promise<{ slug: string | null; missing: boolean }> => {
  const { data, missing } = await callRpc<any>('copytrade_my_provider');
  const slug = data && typeof data === 'object' ? data.slug || null : null;
  return { slug: slug ? String(slug) : null, missing };
};

/** Public report button on a provider page. */
export const reportProvider = async (input: {
  slug: string;
  reason: string;
  detail: string;
}): Promise<CopyReportResult> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { error } = await supabase.rpc('report_provider_slug', {
      p_slug: input.slug,
      p_reason: input.reason,
      p_detail: input.detail
    });
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    const message = err?.message || 'Could not send the report';
    return { ok: false, error: looksMissing(message) ? 'CopyTrade is not active on this deployment yet.' : message };
  }
};

export const REPORT_REASONS = [
  'Terminal offline most of the time',
  'Suspicious / unverifiable results',
  'Marketplace or spam behaviour',
  'Abusive content or profile',
  'Other'
] as const;

/** `29.4%` / `1.85` / `-` formatting helpers shared by both public pages. */
export const fmtPct = (value: number | null, digits = 1): string =>
  value === null ? '-' : `${value.toFixed(digits)}%`;

export const fmtNum = (value: number | null, digits = 2): string =>
  value === null ? '-' : value.toFixed(digits);

export const fmtRelative = (iso: string | null): string => {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'never';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
