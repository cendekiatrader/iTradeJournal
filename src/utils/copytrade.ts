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

// `status` diisi oleh request_copy(): 'pending' (menunggu provider menerima) atau
// 'active' (sudah/begitu diterima). Dipakai UI untuk memilih kalimat yang benar.
export type CopyApplyResult = { ok: boolean; error?: string; slug?: string; status?: string };
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

/**
 * Codes that mean "the CopyTrade objects are not in this project" (migration not
 * run) as opposed to "something else failed". Everything that is NOT one of
 * these must be shown to the user verbatim: the earlier blanket message
 * ("not active yet") hid real failures and sent people back to re-run a
 * migration that had already run.
 */
const MISSING_MIGRATION_HINT =
  'CopyTrade is not installed in this Supabase project yet - run supabase_copytrade.sql in the SQL editor, then reload.';

// 42883 (undefined_function) sengaja TIDAK di sini: itu juga muncul saat sebuah
// objek migrasi ada tapi dependensinya tidak resolvable (mis. pgcrypto di schema
// `extensions` dengan search_path hanya `public`). Dahulu error itu ditampilkan
// sebagai "belum dimigrasi" dan menyesatkan. "Belum dimigrasi" yang sungguhan
// datang sebagai PGRST202/205/204 (PostgREST tidak menemukan fungsi/tabel) atau
// 42P01 (relation does not exist).
const MISSING_CODES = ['PGRST202', 'PGRST205', 'PGRST204', '42P01'];
const MISSING_HINTS = [
  'could not find the function',
  'could not find the table',
  'schema cache',
  'does not exist',
  'undefined table',
  'undefined function'
];

const looksMissing = (err: unknown): boolean => {
  const code = err && typeof err === 'object' ? String((err as any).code || '') : '';
  if (code && MISSING_CODES.includes(code)) return true;
  const raw = typeof err === 'string' ? err : String((err as any)?.message || '');
  const m = raw.toLowerCase();
  return MISSING_HINTS.some((h) => m.includes(h));
};

/** Full, honest description of a failure for the UI (code + message + details). */
const errorText = (err: unknown): string => {
  if (typeof err === 'string') return err;
  const e = (err || {}) as any;
  const bits = [e.message, e.details, e.hint].filter(Boolean).map(String);
  const prefix = e.code ? `${e.code}: ` : '';
  return `${prefix}${bits.join(' · ') || 'Request failed'}`;
};

/**
 * Thin RPC wrapper: normalises the three outcomes the UI cares about
 * (data / error / "the CopyTrade migration has not been run here").
 */
async function callRpc<T>(
  name: string,
  params?: Record<string, unknown>
): Promise<{ data: T | null; error: string | null; missing: boolean }> {
  if (!supabase) return { data: null, error: 'Supabase is not configured in this build.', missing: true };
  try {
    const { data, error } = await supabase.rpc(name, params as any);
    if (error) throw error;
    return { data: (data as T) ?? null, error: null, missing: false };
  } catch (err: any) {
    return { data: null, error: errorText(err), missing: looksMissing(err) };
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
    const message = errorText(err);
    return { ok: false, error: looksMissing(err) ? MISSING_MIGRATION_HINT : message };
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
    return { ok: false, error: looksMissing(err) ? MISSING_MIGRATION_HINT : errorText(err) };
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


/* ================================================================== *
 * Fase 1 — dashboard client & provider
 * ================================================================== */

/**
 * The settings object the EA reads from `copy_links.settings`. The shape MUST
 * mirror `copytrade_default_settings()` in supabase_copytrade.sql - the server
 * deep-merges what we send and the EA parses the keys by name, so a renamed key
 * silently falls back to the EA default instead of erroring.
 */
export interface CopySettings {
  mode: 'auto';
  sizing: {
    method: 'risk_pct';
    riskPct: number;
    basis: 'balance' | 'equity';
    maxLotCap: number;
    allowMinLotFallback: boolean;
  };
  // Satuan jarak memakai PERSEN HARGA, bukan poin: `point` = 1 desimal terakhir
  // harga, jadi 30 poin berarti 0,30 USD di broker 2-desimal tapi 0,03 USD di
  // broker 3-desimal. Elemen *Points tetap ada sebagai alternatif manual (0 = off).
  stops: { slFallbackPct: number; slFallbackPoints: number; copyTp: boolean; maxHoldMinutes: number };
  mirror: { modifyThrottleSeconds: number; minModifyPoints: number; riskBreachAction: 'warn' | 'trim' | 'ignore' };
  guards: {
    maxSpreadPct: number;
    maxSpreadPoints: number;
    maxEntryDeviationPct: number;
    maxEntryDeviationPoints: number;
    maxSlippagePoints: number;
    maxPositions: number;
    maxPositionsPerSymbol: number;
    allowSymbols: string[];
    blockSymbols: string[];
    sessionFilter: { enabled: boolean; start: string; end: string };
    followOnReconnect: boolean;
    failStreakPause: boolean;
  };
  limits: {
    maxTotalRiskPct: number;
    dailyLossLimitPct: number;
    dailyProfitTargetPct: number | null;
    maxDrawdownPct: number;
    maxTradesPerDay: number;
  };
  order: { type: 'market'; deviationPct: number; deviationPoints: number; fillPolicy: 'IOC' | 'FOK' | 'RETURN' };
  journal: { autoSync: boolean; accountId: string | null };
  notify: { telegram: boolean; bell: boolean };
}

export const DEFAULT_COPY_SETTINGS: CopySettings = {
  mode: 'auto',
  sizing: { method: 'risk_pct', riskPct: 1, basis: 'balance', maxLotCap: 5, allowMinLotFallback: false },
  stops: { slFallbackPct: 0.15, slFallbackPoints: 0, copyTp: true, maxHoldMinutes: 0 },
  mirror: { modifyThrottleSeconds: 3, minModifyPoints: 0, riskBreachAction: 'warn' },
  guards: {
    maxSpreadPct: 0.08,
    maxSpreadPoints: 0,
    maxEntryDeviationPct: 0.2,
    maxEntryDeviationPoints: 0,
    maxSlippagePoints: 20,
    maxPositions: 5,
    maxPositionsPerSymbol: 1,
    allowSymbols: [],
    blockSymbols: [],
    sessionFilter: { enabled: false, start: '07:00', end: '22:00' },
    followOnReconnect: false,
    failStreakPause: true
  },
  limits: { maxTotalRiskPct: 10, dailyLossLimitPct: 5, dailyProfitTargetPct: null, maxDrawdownPct: 15, maxTradesPerDay: 20 },
  order: { type: 'market', deviationPct: 0.05, deviationPoints: 0, fillPolicy: 'IOC' },
  journal: { autoSync: false, accountId: null },
  notify: { telegram: true, bell: true }
};

/** Shallow-merge a server object onto the defaults (one level per section). */
export const mergeSettings = (raw: unknown): CopySettings => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<CopySettings>;
  const d = DEFAULT_COPY_SETTINGS;
  const sec = <K extends keyof CopySettings>(key: K): CopySettings[K] => ({
    ...(d[key] as any),
    ...((src[key] as any) || {})
  });
  return {
    mode: 'auto',
    sizing: sec('sizing'),
    stops: sec('stops'),
    mirror: sec('mirror'),
    guards: { ...sec('guards'), sessionFilter: { ...d.guards.sessionFilter, ...((src.guards as any)?.sessionFilter || {}) } },
    limits: sec('limits'),
    order: sec('order'),
    journal: sec('journal'),
    notify: sec('notify')
  };
};

export const RISK_PRESETS = [0.5, 1, 2, 5];

/**
 * Risk % is deliberately uncapped (product decision), so instead of a hard limit
 * the UI escalates: normal -> yellow -> red -> typed confirmation.
 */
export const riskWarning = (riskPct: number): { level: 'ok' | 'warn' | 'danger'; text: string } => {
  if (!Number.isFinite(riskPct) || riskPct <= 0) return { level: 'danger', text: 'Enter a risk percentage above 0.' };
  if (riskPct > 100) return { level: 'danger', text: 'Above 100% of the balance cannot be sized - the order would be rejected on margin.' };
  if (riskPct > 25) return { level: 'danger', text: `${riskPct}% means a single stop-out can take a quarter of the account or more.` };
  if (riskPct > 10) return { level: 'danger', text: `${riskPct}% per trade is very aggressive - ten losses in a row is not a rare event.` };
  if (riskPct > 5) return { level: 'warn', text: `${riskPct}% is above the usual 0.5-2% band.` };
  return { level: 'ok', text: '' };
};

/**
 * Money moved by a 1.0 price move, for one lot, in the account currency.
 * These are TYPICAL values - the EA recalculates with the real tick value from
 * the broker, which can differ per symbol suffix and account currency.
 */
const VALUE_PER_PRICE_UNIT_PER_LOT: Record<string, number> = {
  XAUUSD: 100,
  XAGUSD: 5000,
  EURUSD: 100000,
  GBPUSD: 100000,
  AUDUSD: 100000,
  NZDUSD: 100000,
  USDCAD: 100000,
  USDCHF: 100000,
  EURJPY: 1000,
  USDJPY: 1000,
  US500: 1,
  US100: 1,
  US30: 1,
  GER40: 1,
  UK100: 1,
  BTCUSD: 1,
  ETHUSD: 1
};

export const symbolValueHint = (symbol: string): number | null => {
  const key = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const k of Object.keys(VALUE_PER_PRICE_UNIT_PER_LOT)) {
    if (key.startsWith(k)) return VALUE_PER_PRICE_UNIT_PER_LOT[k];
  }
  return null;
};

/**
 * Live lot preview: lots = risk / (stopDistance x valuePerUnitPerLot), rounded
 * DOWN to the volume step. This is an ESTIMATE so the user can see the effect of
 * a risk % before going live; the authoritative number comes from the EA, which
 * reads the broker tick value, min/max lot and margin.
 */
export const estimateLots = (input: {
  balance: number;
  riskPct: number;
  stopDistance: number;
  valuePerUnitPerLot: number;
  volumeStep?: number;
}): { lots: number; riskAmount: number } | null => {
  const { balance, riskPct, stopDistance, valuePerUnitPerLot } = input;
  if (!(balance > 0) || !(riskPct > 0) || !(stopDistance > 0) || !(valuePerUnitPerLot > 0)) return null;
  const step = input.volumeStep && input.volumeStep > 0 ? input.volumeStep : 0.01;
  const riskAmount = (balance * riskPct) / 100;
  const raw = riskAmount / (stopDistance * valuePerUnitPerLot);
  const lots = Math.floor(raw / step) * step;
  return { lots: Number(lots.toFixed(4)), riskAmount: Number(riskAmount.toFixed(2)) };
};

/* ---------------- types for the dashboards ---------------- */

export interface MyLink {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  status: 'pending' | 'active' | 'paused' | 'revoked';
  requestedBy: string;
  settings: CopySettings;
  runtimeState: { kill_switch?: boolean; state?: string } & Record<string, unknown>;
  updatedAt: string;
}

export interface Follower extends MyLink {
  clientId: string;
}

export interface EaTokenRow {
  id: string;
  label: string;
  role: 'PROVIDER' | 'CLIENT' | 'BOTH';
  active: boolean;
  lastSeen: string | null;
  terminalBuild: string | null;
  accountLogin: string | null;
  accountServer: string | null;
  isDemo: boolean | null;
  leverage: number | null;
  createdAt: string;
}

export interface DeliveryRow {
  id: string;
  status: 'pending' | 'executed' | 'skipped' | 'expired' | 'failed';
  kind: string;
  symbol: string;
  lots: number | null;
  riskAmount: number | null;
  riskPct: number | null;
  fillPrice: number | null;
  slippagePoints: number | null;
  skipReason: string | null;
  failReason: string | null;
  eaBalance: number | null;
  eaEquity: number | null;
  executedAt: string | null;
  createdAt: string;
}

/* ---------------- client dashboard reads ---------------- */

interface LinkRaw {
  id: string;
  provider_id: string;
  client_id: string;
  status: string;
  settings: unknown;
  runtime_state: unknown;
  requested_by?: string;
  updated_at: string;
}

const mapLink = (row: LinkRaw, provider?: { slug: string; display_name: string }): MyLink => ({
  id: row.id,
  providerId: row.provider_id,
  providerSlug: provider?.slug || '',
  providerName: provider?.display_name || 'Provider',
  status: (row.status as MyLink['status']) || 'pending',
  requestedBy: row.requested_by || 'client',
  settings: mergeSettings(row.settings),
  runtimeState: (row.runtime_state as MyLink['runtimeState']) || {},
  updatedAt: row.updated_at
});

/** Provider display info for a set of provider ids (public view, safe columns). */
const providerInfoMap = async (ids: string[]): Promise<Record<string, { slug: string; display_name: string }>> => {
  if (!supabase || ids.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('copytrade_providers_public')
      .select('user_id, slug, display_name')
      .in('user_id', ids);
    if (error) throw error;
    const map: Record<string, { slug: string; display_name: string }> = {};
    (data || []).forEach((r: any) => {
      map[r.user_id] = { slug: r.slug, display_name: r.display_name };
    });
    return map;
  } catch {
    return {};
  }
};

/** Links where I am the client. */
export const fetchMyClientLinks = async (): Promise<{ links: MyLink[]; missing: boolean; error: string | null }> => {
  if (!supabase) return { links: [], missing: true, error: 'Supabase is not configured in this build.' };
  try {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return { links: [], missing: false, error: null };
    const { data, error } = await supabase
      .from('copy_links')
      .select('id,provider_id,client_id,status,settings,runtime_state,requested_by,updated_at')
      .eq('client_id', me)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []) as LinkRaw[];
    const info = await providerInfoMap(Array.from(new Set(rows.map((r) => r.provider_id))));
    return { links: rows.map((r) => mapLink(r, info[r.provider_id])), missing: false, error: null };
  } catch (err: any) {
    return { links: [], missing: looksMissing(err), error: errorText(err) };
  }
};

/** My EA terminals. Never returns the token itself - only the hash is stored. */
export const fetchMyEaTokens = async (): Promise<EaTokenRow[]> => {
  if (!supabase) return [];
  try {
    // Filter eksplisit `client_id = me` - JANGAN bergantung pada RLS saja. Untuk
    // akun admin, RLS sendiri tidak cukup: policy admin_all membuat SEMUA baris
    // token user lain ikut terambil dan tampil di dasbor ini.
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return [];
    const { data, error } = await supabase
      .from('ea_tokens')
      .select('id,label,role,active,last_seen,terminal_build,account_login,account_server,is_demo,leverage,created_at')
      .eq('client_id', me)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      label: r.label || 'terminal',
      role: r.role,
      active: Boolean(r.active),
      lastSeen: r.last_seen,
      terminalBuild: r.terminal_build,
      accountLogin: r.account_login,
      accountServer: r.account_server,
      isDemo: r.is_demo,
      leverage: r.leverage,
      createdAt: r.created_at
    }));
  } catch {
    return [];
  }
};

/** Execution / skip log for my deliveries (event kind comes from the embed). */
export const fetchMyDeliveries = async (limit = 60): Promise<DeliveryRow[]> => {
  if (!supabase) return [];
  try {
    // Sama seperti token: filter eksplisit, karena admin_all (dulu) membuat log
    // eksekusi semua client ikut terbaca.
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return [];
    const { data, error } = await supabase
      .from('copy_deliveries')
      .select(
        'id,status,lots,risk_amount,risk_pct,fill_price,slippage_points,skip_reason,fail_reason,ea_balance,ea_equity,executed_at,created_at,' +
          'copy_events(kind,payload)'
      )
      .eq('client_id', me)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((r: any) => {
      const ev = r.copy_events || {};
      const pay = ev.payload || {};
      return {
        id: r.id,
        status: r.status,
        kind: ev.kind || '-',
        symbol: pay.symbol || '?',
        lots: r.lots === null ? null : Number(r.lots),
        riskAmount: r.risk_amount === null ? null : Number(r.risk_amount),
        riskPct: r.risk_pct === null ? null : Number(r.risk_pct),
        fillPrice: r.fill_price === null ? null : Number(r.fill_price),
        slippagePoints: r.slippage_points === null ? null : Number(r.slippage_points),
        skipReason: r.skip_reason,
        failReason: r.fail_reason,
        eaBalance: r.ea_balance === null ? null : Number(r.ea_balance),
        eaEquity: r.ea_equity === null ? null : Number(r.ea_equity),
        executedAt: r.executed_at,
        createdAt: r.created_at
      };
    });
  } catch {
    return [];
  }
};

/** Positions currently mirrored in my account (written by the ack trigger). */
export const fetchClientPositions = async (): Promise<
  Array<{ id: string; state: string; symbol: string; lots: number; sl: number | null; tp: number | null; openedAt: string | null }>
> => {
  if (!supabase) return [];
  try {
    // Filter eksplisit (lihat catatan di fetchMyEaTokens): jangan andalkan RLS saja.
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return [];
    const { data, error } = await supabase
      .from('client_positions')
      .select('id,state,symbol,lots,sl,tp,opened_at')
      .eq('client_id', me)
      .order('opened_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      state: r.state,
      symbol: r.symbol || '?',
      lots: Number(r.lots || 0),
      sl: r.sl === null ? null : Number(r.sl),
      tp: r.tp === null ? null : Number(r.tp),
      openedAt: r.opened_at
    }));
  } catch {
    return [];
  }
};

/* ---------------- provider dashboard reads ---------------- */

export interface ProviderPanel {
  slug: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  followers: Follower[];
  pending: Follower[];
  stats: Record<string, any> | null;
  tokens: EaTokenRow[];
  missing: boolean;
  error: string | null;
}

export const fetchProviderPanel = async (): Promise<ProviderPanel> => {
  const empty: ProviderPanel = {
    slug: null,
    isVerified: false,
    isSuspended: false,
    followers: [],
    pending: [],
    stats: null,
    tokens: [],
    missing: false,
    error: null
  };
  if (!supabase) return { ...empty, missing: true, error: 'Supabase is not configured in this build.' };
  try {
    const { slug, missing } = await fetchMyProvider();
    if (!slug) return { ...empty, missing };

    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id || '';
    const { data: linkRows, error: linkErr } = await supabase
      .from('copy_links')
      .select('id,provider_id,client_id,status,settings,runtime_state,requested_by,updated_at')
      .eq('provider_id', me)
      .order('updated_at', { ascending: false });
    if (linkErr) throw linkErr;

    const rows = (linkRows || []) as LinkRaw[];
    const followers = rows.filter((r) => r.status === 'active' || r.status === 'paused').map((r) => ({ ...mapLink(r), clientId: r.client_id }));
    const pending = rows.filter((r) => r.status === 'pending').map((r) => ({ ...mapLink(r), clientId: r.client_id }));

    const statsRes = await callRpc<Record<string, any>>('provider_stats', { p_slug: slug });
    const mine = await fetchMyProviderDetail(slug);
    const tokens = await fetchMyEaTokens();

    return {
      slug,
      isVerified: mine.isVerified,
      isSuspended: mine.isSuspended,
      followers,
      pending,
      stats: statsRes.data,
      tokens,
      missing: false,
      error: null
    };
  } catch (err: any) {
    return { ...empty, missing: looksMissing(err), error: errorText(err) };
  }
};

/** My provider row (works even while suspended, unlike the public view). */
export const fetchMyProviderDetail = async (
  slug?: string
): Promise<{ slug: string | null; isVerified: boolean; isSuspended: boolean }> => {
  const fallback = { slug: slug || null, isVerified: false, isSuspended: false };
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('signal_providers')
      .select('slug,is_verified,is_suspended')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback;
    return { slug: (data as any).slug, isVerified: Boolean((data as any).is_verified), isSuspended: Boolean((data as any).is_suspended) };
  } catch {
    return fallback;
  }
};

/* ---------------- writes ---------------- */

const rpcOk = async (name: string, params: Record<string, unknown>): Promise<CopyApplyResult> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await supabase.rpc(name, params as any);
    if (error) throw error;
    const res = (data || {}) as any;
    if (res.ok === false) return { ok: false, error: res.error || 'Rejected' };
    return { ok: true, slug: res.slug };
  } catch (err: any) {
    return { ok: false, error: looksMissing(err) ? MISSING_MIGRATION_HINT : errorText(err) };
  }
};

/** Ask to follow a provider (creates the link as 'pending'). */
export const requestFollow = (providerSlug: string) => rpcOk('request_copy', { p_provider_slug: providerSlug });

/**
 * Terima apa pun yang dibagikan provider: URL halaman lengkap
 * (`https://.../copytrade/provider/gold-london`), bentuk hash
 * (`#/copytrade/provider/gold-london`), `@gold-london`, atau handle polos.
 *
 * Normalisasinya SENGAJA sama dengan apply_provider() di supabase_copytrade.sql
 * (lowercase, karakter non-alfanumerik -> '-', trim '-', maks 48, min 3) supaya
 * apa yang diketik client menghasilkan slug yang identik dengan yang disimpan.
 */
export const slugFromProviderRef = (value: string): string | null => {
  const raw = (value || '').trim();
  if (!raw) return null;
  const cut = raw.split(/[?#]/)[0];
  const m = cut.match(/copytrade\/provider\/([^/\s]+)/i);
  const base = (m ? m[1] : cut).replace(/^@+/, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug.length >= 3 ? slug : null;
};

/** Provider side: accept or reject a follow request. */
export const respondFollow = (linkId: string, accept: boolean) =>
  rpcOk('respond_copy_request', { p_link_id: linkId, p_accept: accept });

/** Save the full settings object (server deep-merges and validates). */
export const saveCopySettings = (linkId: string, settings: CopySettings) =>
  rpcOk('set_copy_settings', { p_link_id: linkId, p_settings: settings });

/**
 * Pause / resume. `set_copy_state` writes any extra keys into runtime_state and
 * uses `status` for the link status column. Status matters beyond the UI: the
 * fan-out only creates deliveries for 'active' links, so pausing also stops new
 * work at the source instead of piling up deliveries the EA has to skip.
 */
export const setLinkStatus = (linkId: string, status: 'active' | 'paused') =>
  rpcOk('set_copy_state', { p_link_id: linkId, p_state: { status } });

/**
 * Kill switch. Sent as `kill_switch` inside runtime_state because that is the
 * exact key the EA reads (`JsonGetBool(run, "kill_switch")`); the link stays
 * 'active' so the EA still sees the row and can stop on it.
 */
export const setKillSwitch = (linkId: string, on: boolean) =>
  rpcOk('set_copy_state', { p_link_id: linkId, p_state: { kill_switch: on } });

/** Provider side: close every follower's positions for this provider. */
export const closeAllProviderPositions = (providerId: string) =>
  rpcOk('close_all_from_provider', { p_provider_id: providerId });

export interface CreatedToken {
  ok: boolean;
  token?: string;
  error?: string;
}

const randomToken = (): string | null => {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) return null;
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const sha256Hex = async (value: string): Promise<string | null> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Create an EA token.
 *
 * The raw token is generated in the browser and only its SHA-256 hash is sent to
 * the database, so the server never sees (and cannot leak) a usable token. The
 * raw value is returned ONCE for the user to paste into the EA - it is not
 * recoverable afterwards, only replaceable.
 */
export const createEaToken = async (input: { role: 'PROVIDER' | 'CLIENT' | 'BOTH'; label: string }): Promise<CreatedToken> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return { ok: false, error: 'This browser cannot generate a token (needs a secure https context).' };
  }
  const token = randomToken();
  if (!token) return { ok: false, error: 'Could not generate a random token.' };
  const hash = await sha256Hex(token);
  if (!hash) return { ok: false, error: 'Could not hash the token.' };
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false, error: 'Sign in first' };
    const { error } = await supabase.from('ea_tokens').insert({
      client_id: auth.user.id,
      token_hash: hash,
      label: input.label || 'terminal',
      role: input.role,
      active: true
    });
    if (error) throw error;
    return { ok: true, token };
  } catch (err: any) {
    return { ok: false, error: looksMissing(err) ? MISSING_MIGRATION_HINT : errorText(err) };
  }
};

/** Revoke a terminal: the EA keeps polling but every request loses access. */
export const revokeEaToken = async (id: string): Promise<CopyApplyResult> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { error } = await supabase.from('ea_tokens').update({ active: false }).eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not revoke' };
  }
};

/** EA online = heartbeat within the last 15 minutes (same rule as the RPCs). */
export const EA_STALE_MINUTES = 15;

export const isEaOnline = (lastSeen: string | null): boolean => {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < EA_STALE_MINUTES * 60 * 1000;
};
