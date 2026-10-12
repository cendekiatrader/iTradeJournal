-- ============================================================
-- iTradeJournal — CopyTrade (MT5), Fase 0-4
--   Skema + RPC + RLS sesuai PRD-copytrade.md §3, §6, §7
--   Model MIRROR: web app TIDAK PERNAH menekan order di akun client.
--   Server hanya menyimpan state posisi provider + event; yang mengeksekusi
--   adalah EA di terminal MT5 milik client/provider sendiri.
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_admin_panel.sql (public.admins + public.is_admin()).
-- ============================================================

-- pgcrypto: SUPABASE memasangnya di schema `extensions`, bukan `public`.
-- Fungsi yang memanggil digest() punya `set search_path`, jadi ekstensinya harus
-- ada di schema yang disebut search_path itu (lihat ea_token_hash()).
-- Tanpa ini, permintaan pertama dari web/EA gagal dengan
--   42883: function digest(text, unknown) does not exist
-- karena digest() tidak terlihat dari search_path `public`.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    begin
      execute 'create extension pgcrypto with schema extensions';   -- layout Supabase
    exception when others then
      execute 'create extension pgcrypto';                          -- Postgres biasa: public
    end;
  end if;
end $$;

-- ============================================================
-- 1) TABEL (§7.1 + §7.3)
-- ============================================================

-- 1a) Provider (self-serve, langsung tayang; moderasi setelah laporan)
create table if not exists public.signal_providers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Trader',
  slug text not null unique,
  bio text,
  avatar_url text,
  is_active boolean not null default true,
  is_suspended boolean not null default false,     -- true => fan-out diputus di trigger
  is_verified boolean not null default false,      -- hanya admin (lihat guard trigger)
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1b) Relasi client <-> provider
create table if not exists public.copy_links (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','paused','revoked')),
  settings jsonb not null default '{}'::jsonb,      -- §7.2 (tanpa dryRun)
  runtime_state jsonb not null default '{}'::jsonb, -- kill switch, daily pnl, equity peak, day key
  requested_by text not null default 'client',      -- client | provider | admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, client_id)
);

-- 1c) State posisi provider (dipublikasikan EA provider)
create table if not exists public.provider_positions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  provider_ticket bigint not null,
  symbol text not null default '?',
  side text not null default 'buy' check (side in ('buy','sell')),
  volume numeric not null default 0,
  entry numeric,
  sl numeric,
  tp numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null default 0,               -- naik tiap sl/tp/volume berubah (§6.5.3)
  status text not null default 'open' check (status in ('open','closed')),
  unique (provider_id, provider_ticket)
);

-- 1d) Append-only lifecycle event
create table if not exists public.copy_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  provider_position_id uuid references public.provider_positions(id) on delete set null,
  kind text not null check (kind in ('OPEN','MODIFY_SL','MODIFY_TP','PARTIAL_CLOSE','CLOSE','CLOSE_ALL')),
  seq bigint not null default 1,                    -- monoton per provider (§6.5.3)
  payload jsonb not null default '{}'::jsonb,       -- { sl, tp } LENGKAP, bukan delta (§6.5.2)
  created_at timestamptz not null default now()
);

-- 1e) 1 baris per client per event (hasil fan-out)
create table if not exists public.copy_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.copy_events(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references auth.users(id) on delete cascade,   -- denormalisasi untuk query cepat
  status text not null default 'pending' check (status in ('pending','executed','skipped','expired','failed')),
  skip_reason text,
  fail_reason text,
  client_ticket bigint,
  fill_price numeric,
  slippage_points numeric,
  lots numeric,
  risk_amount numeric,
  risk_pct numeric,
  ea_balance numeric,
  ea_equity numeric,
  picked_at timestamptz,
  executed_at timestamptz,
  expires_at timestamptz,                            -- OPEN expire 120 dtk; CLOSE/CLOSE_ALL tidak pernah expire (§6.2)
  created_at timestamptz not null default now(),
  unique (event_id, client_id)
);

-- 1f) Pemetaan posisi client <-> posisi provider (§6.3)
create table if not exists public.client_positions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references auth.users(id) on delete cascade,
  provider_position_id uuid references public.provider_positions(id) on delete set null,
  client_ticket bigint,
  symbol text,
  lots numeric,
  state text not null default 'open' check (state in ('open','closed','missed')),
  sl numeric,
  tp numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 1g) Token EA per terminal (HANYA HASH yang disimpan, token mentah tidak pernah masuk DB)
create table if not exists public.ea_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,   -- pemilik = provider atau client
  token_hash text not null,                          -- sha256 hex dari token mentah
  label text,
  active boolean not null default true,
  role text not null default 'CLIENT' check (role in ('PROVIDER','CLIENT','BOTH')),
  last_seen timestamptz,
  terminal_build text,
  account_login text,
  account_server text,
  is_demo boolean,
  leverage integer,
  created_at timestamptz not null default now()
);

-- 1h) Penanda perubahan murah (hemat egress §2.2)
create table if not exists public.ea_feed (
  client_id uuid primary key references auth.users(id) on delete cascade,
  rev bigint not null default 0
);

-- 1i) Log guard / rekonsiliasi (§5, §6.4)
create table if not exists public.guard_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 1j) Laporan provider (moderasi setelah laporan §3)
create table if not exists public.provider_reports (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 1k) Auto-jurnal ke Journal client (default OFF)
create table if not exists public.journal_auto_sync (
  client_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'close' check (mode in ('open','close','both')),
  updated_at timestamptz not null default now()
);

-- 1l) Bot Telegram per provider (§7.3) — token_enc TIDAK pernah bisa dibaca client
create table if not exists public.telegram_bots (
  provider_id uuid primary key references auth.users(id) on delete cascade,
  bot_username text,
  token_enc bytea,                                   -- pgp_sym_encrypt(token, TG_TOKEN_KEY)
  -- gen_random_uuid() = fungsi INTI Postgres (13+), bukan pgcrypto. Jangan pakai
  -- gen_random_bytes() di DEFAULT kolom: itu milik pgcrypto yang di Supabase
  -- tinggal di schema `extensions`, sedangkan DEFAULT dievaluasi dengan
  -- search_path pemanggil -> INSERT gagal `42883 function gen_random_bytes(...) does not exist`.
  webhook_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  is_active boolean not null default false,
  linked_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

-- Untuk instalasi yang SUDAH menjalankan versi file sebelumnya: `create table if
-- not exists` di atas tidak mengubah default kolom yang sudah ada, sehingga
-- `telegram_bots` masih menyimpan default pgcrypto yang gagal di Supabase.
-- Perintah idempotent ini memperbaikinya tanpa menyentuh data.
alter table public.telegram_bots
  alter column webhook_secret set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- 1m) Tautan chat_id client ke bot provider
create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  copy_link_id uuid references public.copy_links(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  chat_id bigint not null,
  tg_username text,
  code_used text,
  is_active boolean not null default true,
  linked_at timestamptz not null default now(),
  unique (provider_id, chat_id)
);

-- 1n) Kode akses per copy_link (8 karakter, bisa di-rotate)
create table if not exists public.telegram_codes (
  copy_link_id uuid primary key references public.copy_links(id) on delete cascade,
  code text not null unique,
  rotated_at timestamptz not null default now(),
  used_at timestamptz
);

-- ============================================================
-- 2) INDEX
-- ============================================================
create index if not exists signal_providers_slug_idx on public.signal_providers (slug);
create index if not exists copy_links_provider_idx on public.copy_links (provider_id, status);
create index if not exists copy_links_client_idx on public.copy_links (client_id, status);
create index if not exists provider_positions_provider_idx on public.provider_positions (provider_id, status);
create index if not exists provider_positions_open_idx on public.provider_positions (provider_id) where status = 'open';
create index if not exists copy_events_provider_seq_idx on public.copy_events (provider_id, seq desc);
create index if not exists copy_events_position_idx on public.copy_events (provider_position_id, seq desc);
create index if not exists copy_deliveries_client_idx on public.copy_deliveries (client_id, status, created_at desc);
create index if not exists copy_deliveries_pending_idx on public.copy_deliveries (client_id) where status = 'pending';
create unique index if not exists client_positions_pair_idx on public.client_positions (client_id, provider_position_id);
create index if not exists client_positions_client_idx on public.client_positions (client_id, state);
create unique index if not exists ea_tokens_hash_idx on public.ea_tokens (token_hash);
create index if not exists ea_tokens_client_idx on public.ea_tokens (client_id, active);
create index if not exists guard_events_client_idx on public.guard_events (client_id, created_at desc);
create index if not exists provider_reports_provider_idx on public.provider_reports (provider_id, status);
create index if not exists telegram_links_provider_idx on public.telegram_links (provider_id, is_active);
create index if not exists telegram_links_client_idx on public.telegram_links (client_id, is_active);

-- ============================================================
-- 3) FUNGSI BANTU
-- ============================================================

-- Pola is_mentor()
create or replace function public.is_provider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.signal_providers p where p.user_id = auth.uid());
$$;

-- Token mentah EA (header x-ea-token) -> sha256 hex. NULL kalau header tidak ada.
create or replace function public.ea_token_hash()
returns text
language sql
stable
-- `extensions` WAJIB ada di sini: di Supabase digest() tinggal di schema itu.
-- (Fungsi ini tidak security definer - hanya membaca GUC header - jadi menambah
--  schema ke search_path-nya tidak membuka jalur eskalasi.)
set search_path = public, extensions
as $$
  select encode(digest(t.val, 'sha256'), 'hex')
  from (
    select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-ea-token' as val
  ) t
  where t.val is not null and t.val <> '';
$$;

-- Pemilik (client_id) token EA yang cocok & masih active. Definisi: bypass RLS di dalam sini.
create or replace function public.ea_uid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.client_id
  from public.ea_tokens t
  where t.active
    and t.token_hash = public.ea_token_hash()
  limit 1;
$$;

create or replace function public.ea_token_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.ea_tokens t
  where t.active
    and t.token_hash = public.ea_token_hash()
  limit 1;
$$;

create or replace function public.ea_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.role
  from public.ea_tokens t
  where t.active
    and t.token_hash = public.ea_token_hash()
  limit 1;
$$;

-- text -> numeric ('' / null / bukan angka -> null; payload EA tidak boleh bikin error)
create or replace function public.copytrade_num(p_text text)
returns numeric
language plpgsql
immutable
as $$
begin
  return nullif(btrim(coalesce(p_text, '')), '')::numeric;
exception when others then
  return null;
end $$;

-- text -> harga. 0 di MQL5 berarti "tidak ada SL/TP" => NULL.
create or replace function public.copytrade_price(p_text text)
returns numeric
language sql
immutable
as $$
  select nullif(public.copytrade_num(p_text), 0);
$$;

-- text -> timestamptz (null kalau kosong / bukan waktu)
create or replace function public.copytrade_ts(p_text text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return nullif(btrim(coalesce(p_text, '')), '')::timestamptz;
exception when others then
  return null;
end $$;

-- Deep merge jsonb (b menimpa a secara rekursif, kunci a yang tidak ada di b tetap)
create or replace function public.jsonb_deep_merge(p_a jsonb, p_b jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when p_a is null then p_b
    when p_b is null then p_a
    when jsonb_typeof(p_a) = 'object' and jsonb_typeof(p_b) = 'object' then (
      select coalesce(jsonb_object_agg(x.k, x.v), '{}'::jsonb)
      from (
        select e.key as k,
               case when p_a ? e.key
                     and jsonb_typeof(p_a -> e.key) = 'object'
                     and jsonb_typeof(e.value) = 'object'
                    then public.jsonb_deep_merge(p_a -> e.key, e.value)
                    else e.value end as v
        from jsonb_each(p_b) e
        union all
        select e2.key, e2.value
        from jsonb_each(p_a) e2
        where not (p_b ? e2.key)
      ) x
    )
    else p_b
  end;
$$;

-- Nilai default copy_links.settings (§7.2). Tidak ada dryRun (keputusan 12).
create or replace function public.copytrade_default_settings()
returns jsonb
language sql
immutable
as $$
  select '{
    "mode": "auto",
    "sizing": {"method": "risk_pct", "riskPct": 1.0, "basis": "balance",
               "maxLotCap": 5.0, "allowMinLotFallback": false},
    "stops":  {"slFallbackPct": 0.15, "slFallbackPoints": 0, "copyTp": true, "maxHoldMinutes": 0},
    "mirror": {"modifyThrottleSeconds": 3, "minModifyPoints": 0, "riskBreachAction": "warn"},
    "guards": {"maxSpreadPct": 0.08, "maxSpreadPoints": 0,
               "maxEntryDeviationPct": 0.20, "maxEntryDeviationPoints": 0,
               "maxSlippagePoints": 0, "maxPositions": 5, "maxPositionsPerSymbol": 1,
               "allowSymbols": [], "blockSymbols": [],
               "sessionFilter": {"enabled": false, "start": "07:00", "end": "22:00"},
               "followOnReconnect": false, "failStreakPause": true},
    "limits": {"maxTotalRiskPct": 10, "dailyLossLimitPct": 5, "dailyProfitTargetPct": null,
               "maxDrawdownPct": 15, "maxTradesPerDay": 20},
    "order":  {"type": "market", "deviationPct": 0.05, "deviationPoints": 0, "fillPolicy": "IOC"},
    "journal": {"autoSync": false, "accountId": null},
    "notify": {"telegram": true, "bell": true}
  }'::jsonb;
$$;

-- Mengapa batas jarak memakai PERSEN HARGA, bukan poin:
-- `point` = 1 desimal terakhir harga, jadi angka poin TIDAK berarti sama di broker
-- berbeda. Contoh nyata: spread XAUUSD 0,30 USD terbaca 30 poin di broker dengan 2
-- desimal, tetapi 300 poin di broker dengan 3 desimal - dengan batas 30 poin, client
-- di broker 3-desimal SELALU dilewati meski spreadnya normal. Persen harga sama
-- artinya di mana pun. Angka poin tetap bisa diisi (elemen `*Points` > 0) kalau client
-- memang ingin memakai konvensi brokernya.
--
-- Migrasi untuk instalasi yang sudah punya baris: nilai poin lama diganti; hanya
-- menyentuh baris yang belum punya kunci persen, jadi aman diulang dan tidak menimpa
-- pilihan yang sudah dibuat setelah pembaruan ini.
update public.copy_links
   set settings = public.jsonb_deep_merge(settings, '{
         "guards": {"maxSpreadPct": 0.08, "maxSpreadPoints": 0,
                    "maxEntryDeviationPct": 0.20, "maxEntryDeviationPoints": 0},
         "stops":  {"slFallbackPct": 0.15, "slFallbackPoints": 0},
         "order":  {"deviationPct": 0.05, "deviationPoints": 0}
       }'::jsonb)
 where settings -> 'guards' -> 'maxSpreadPct' is null;

-- Kode akses 8 karakter (tanpa huruf/angka yang mudah tertukar)
create or replace function public.copytrade_new_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_out text := '';
  i integer;
begin
  for i in 1..8 loop
    v_out := v_out || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return v_out;
end $$;

-- Pastikan sebuah copy_link punya kode akses (dipakai saat link diaktifkan)
create or replace function public.copytrade_ensure_code(p_link_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  i integer;
begin
  select code into v_code from public.telegram_codes where copy_link_id = p_link_id;
  if v_code is not null then
    return v_code;
  end if;
  for i in 1..6 loop
    begin
      v_code := public.copytrade_new_code();
      insert into public.telegram_codes (copy_link_id, code, rotated_at)
      values (p_link_id, v_code, now())
      on conflict (copy_link_id) do update set code = excluded.code, rotated_at = now();
      return v_code;
    exception when unique_violation then
      if i = 6 then raise; end if;
    end;
  end loop;
  return v_code;
end $$;

-- updated_at otomatis
create or replace function public.copytrade_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================
-- 4) TRIGGER
-- ============================================================

-- 4a) provider_positions.revision naik saat sl/tp/volume berubah (§6.5.3)
create or replace function public.provider_positions_bump_revision()
returns trigger
language plpgsql
as $$
begin
  if new.sl is distinct from old.sl
     or new.tp is distinct from old.tp
     or new.volume is distinct from old.volume then
    new.revision := old.revision + 1;
  end if;
  return new;
end $$;

drop trigger if exists provider_positions_bump_revision on public.provider_positions;
create trigger provider_positions_bump_revision
  before update on public.provider_positions
  for each row execute function public.provider_positions_bump_revision();

-- 4b) updated_at untuk tabel yang punya kolom itu
do $$
declare
  t text;
begin
  foreach t in array array[
    'signal_providers','copy_links','provider_positions','client_positions',
    'journal_auto_sync','telegram_bots'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop trigger if exists %I_touch_updated_at on public.%I', t, t);
      execute format(
        'create trigger %I_touch_updated_at before update on public.%I for each row execute function public.copytrade_touch_updated_at()',
        t, t
      );
    end if;
  end loop;
end $$;

-- 4c) is_verified / is_suspended tidak boleh diubah sendiri oleh provider (hanya admin)
create or replace function public.signal_providers_guard_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_verified := old.is_verified;
    new.is_suspended := old.is_suspended;
  end if;
  return new;
end $$;

drop trigger if exists signal_providers_guard_flags on public.signal_providers;
create trigger signal_providers_guard_flags
  before update on public.signal_providers
  for each row execute function public.signal_providers_guard_flags();

-- 4d) Fan-out (§6.2): event baru -> 1 delivery per copy_link aktif + naikkan ea_feed.rev
--     security definer: trigger harus boleh menulis baris milik client lain.
create or replace function public.copytrade_fanout_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- provider yang di-suspend tidak di-fan-out (suspend = putus instan)
  if exists (
    select 1 from public.signal_providers sp
    where sp.user_id = new.provider_id and sp.is_suspended
  ) then
    return new;
  end if;

  -- 1 baris per client; CLOSE / CLOSE_ALL tidak pernah expire (§6.2)
  insert into public.copy_deliveries (event_id, client_id, provider_id, status, expires_at)
  select new.id,
         l.client_id,
         new.provider_id,
         'pending',
         case when new.kind in ('CLOSE','CLOSE_ALL') then null
              else now() + interval '120 seconds' end
  from public.copy_links l
  where l.provider_id = new.provider_id
    and l.status = 'active'
  on conflict (event_id, client_id) do nothing;

  -- pola rev: EA poll murah dulu, payload penuh hanya kalau rev berubah
  insert into public.ea_feed as f (client_id, rev)
  select l.client_id, 1
  from public.copy_links l
  where l.provider_id = new.provider_id
    and l.status = 'active'
  on conflict (client_id) do update set rev = f.rev + 1;

  return new;
end $$;

drop trigger if exists copy_events_fanout on public.copy_events;
create trigger copy_events_fanout
  after insert on public.copy_events
  for each row execute function public.copytrade_fanout_event();

-- ============================================================
-- 5) ROW LEVEL SECURITY
-- ============================================================
alter table public.signal_providers  enable row level security;
alter table public.copy_links        enable row level security;
alter table public.provider_positions enable row level security;
alter table public.copy_events       enable row level security;
alter table public.copy_deliveries   enable row level security;
alter table public.client_positions  enable row level security;
alter table public.ea_tokens         enable row level security;
alter table public.ea_feed           enable row level security;
alter table public.guard_events      enable row level security;
alter table public.provider_reports  enable row level security;
alter table public.journal_auto_sync enable row level security;
alter table public.telegram_bots     enable row level security;
alter table public.telegram_links    enable row level security;
alter table public.telegram_codes    enable row level security;

-- 5a) signal_providers
drop policy if exists "signal_providers_read_self" on public.signal_providers;
create policy "signal_providers_read_self" on public.signal_providers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "signal_providers_read_followers" on public.signal_providers;
create policy "signal_providers_read_followers" on public.signal_providers
  for select to authenticated using (exists (
    select 1 from public.copy_links l
    where l.provider_id = signal_providers.user_id
      and l.client_id = auth.uid()
  ));

drop policy if exists "signal_providers_update_self" on public.signal_providers;
create policy "signal_providers_update_self" on public.signal_providers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admin_all" on public.signal_providers;
create policy "admin_all" on public.signal_providers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5b) copy_links (tulis hanya lewat RPC yang memvalidasi)
drop policy if exists "copy_links_read_involved" on public.copy_links;
create policy "copy_links_read_involved" on public.copy_links
  for select to authenticated
  using (provider_id = auth.uid() or client_id = auth.uid());

-- EA client butuh settings/guards-nya, EA provider butuh daftar link aktifnya
drop policy if exists "copy_links_ea_read" on public.copy_links;
create policy "copy_links_ea_read" on public.copy_links
  for select to anon, authenticated
  using (public.ea_uid() is not null
         and (public.ea_uid() = provider_id or public.ea_uid() = client_id));

drop policy if exists "admin_all" on public.copy_links;
create policy "admin_all" on public.copy_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5c) provider_positions
drop policy if exists "provider_positions_read_provider" on public.provider_positions;
create policy "provider_positions_read_provider" on public.provider_positions
  for select to authenticated using (provider_id = auth.uid());

drop policy if exists "provider_positions_read_clients" on public.provider_positions;
create policy "provider_positions_read_clients" on public.provider_positions
  for select to authenticated using (exists (
    select 1 from public.copy_links l
    where l.provider_id = provider_positions.provider_id
      and l.client_id = auth.uid()
      and l.status in ('pending','active','paused')
  ));

drop policy if exists "provider_positions_ea_read" on public.provider_positions;
create policy "provider_positions_ea_read" on public.provider_positions
  for select to anon, authenticated
  using (public.ea_uid() is not null and (
    public.ea_uid() = provider_positions.provider_id
    or exists (
      select 1 from public.copy_links l
      where l.provider_id = provider_positions.provider_id
        and l.client_id = public.ea_uid()
        and l.status = 'active'
    )
  ));

drop policy if exists "admin_all" on public.provider_positions;
create policy "admin_all" on public.provider_positions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5d) copy_events
drop policy if exists "copy_events_read_provider" on public.copy_events;
create policy "copy_events_read_provider" on public.copy_events
  for select to authenticated using (provider_id = auth.uid());

drop policy if exists "copy_events_read_clients" on public.copy_events;
create policy "copy_events_read_clients" on public.copy_events
  for select to authenticated using (exists (
    select 1 from public.copy_links l
    where l.provider_id = copy_events.provider_id
      and l.client_id = auth.uid()
  ));

-- EA provider boleh insert event (role PROVIDER/BOTH) hanya untuk dirinya sendiri
drop policy if exists "copy_events_ea_insert" on public.copy_events;
create policy "copy_events_ea_insert" on public.copy_events
  for insert to anon, authenticated
  with check (public.ea_uid() is not null
              and public.ea_uid() = provider_id
              and coalesce(public.ea_role(), '') in ('PROVIDER','BOTH'));

drop policy if exists "admin_all" on public.copy_events;
create policy "admin_all" on public.copy_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5e) copy_deliveries (provider sengaja TIDAK boleh baca: jangan bocorkan identitas client)
drop policy if exists "copy_deliveries_read_own" on public.copy_deliveries;
create policy "copy_deliveries_read_own" on public.copy_deliveries
  for select to authenticated using (client_id = auth.uid());

drop policy if exists "copy_deliveries_ea_read" on public.copy_deliveries;
create policy "copy_deliveries_ea_read" on public.copy_deliveries
  for select to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = client_id);

drop policy if exists "copy_deliveries_ea_update" on public.copy_deliveries;
create policy "copy_deliveries_ea_update" on public.copy_deliveries
  for update to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = client_id)
  with check (public.ea_uid() is not null and public.ea_uid() = client_id);

-- TANPA admin_all di sini (sengaja). Isi tabel ini adalah data PRIBADI per client:
-- log eksekusi tiap client (lot, harga, alasan skip/gagal).
-- Admin tidak butuh ini untuk menindak laporan, dan kalau ada, dasbor CopyTrade
-- milik admin menampilkan data user lain bercampur dengan datanya sendiri
-- (persis keluhan "token client user A muncul di akun user B"). Admin tetap bisa
-- melihat sisi provider (signal_providers, copy_links, provider_positions,
-- copy_events, provider_reports) yang memang dibutuhkan untuk moderasi.
-- Baris `drop` tetap dijalankan supaya instalasi yang sudah terlanjur memakai
-- versi lama ikut dibersihkan (file ini idempotent).
drop policy if exists "admin_all" on public.copy_deliveries;

-- 5f) client_positions
drop policy if exists "client_positions_own" on public.client_positions;
create policy "client_positions_own" on public.client_positions
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "client_positions_ea_all" on public.client_positions;
create policy "client_positions_ea_all" on public.client_positions
  for all to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = client_id)
  with check (public.ea_uid() is not null and public.ea_uid() = client_id);

-- TANPA admin_all di sini (sengaja). Isi tabel ini adalah data PRIBADI per client:
-- posisi milik tiap client.
-- Admin tidak butuh ini untuk menindak laporan, dan kalau ada, dasbor CopyTrade
-- milik admin menampilkan data user lain bercampur dengan datanya sendiri
-- (persis keluhan "token client user A muncul di akun user B"). Admin tetap bisa
-- melihat sisi provider (signal_providers, copy_links, provider_positions,
-- copy_events, provider_reports) yang memang dibutuhkan untuk moderasi.
-- Baris `drop` tetap dijalankan supaya instalasi yang sudah terlanjur memakai
-- versi lama ikut dibersihkan (file ini idempotent).
drop policy if exists "admin_all" on public.client_positions;

-- 5g) ea_tokens (user hanya melihat/mengelola token miliknya sendiri)
drop policy if exists "ea_tokens_own" on public.ea_tokens;
create policy "ea_tokens_own" on public.ea_tokens
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- TANPA admin_all di sini (sengaja). Isi tabel ini adalah data PRIBADI per client:
-- identitas terminal: label, login akun broker, server, leverage.
-- Admin tidak butuh ini untuk menindak laporan, dan kalau ada, dasbor CopyTrade
-- milik admin menampilkan data user lain bercampur dengan datanya sendiri
-- (persis keluhan "token client user A muncul di akun user B"). Admin tetap bisa
-- melihat sisi provider (signal_providers, copy_links, provider_positions,
-- copy_events, provider_reports) yang memang dibutuhkan untuk moderasi.
-- Baris `drop` tetap dijalankan supaya instalasi yang sudah terlanjur memakai
-- versi lama ikut dibersihkan (file ini idempotent).
drop policy if exists "admin_all" on public.ea_tokens;

-- 5h) ea_feed
drop policy if exists "ea_feed_own" on public.ea_feed;
create policy "ea_feed_own" on public.ea_feed
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "ea_feed_ea_read" on public.ea_feed;
create policy "ea_feed_ea_read" on public.ea_feed
  for select to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = client_id);

-- TANPA admin_all di sini (sengaja). Isi tabel ini adalah data PRIBADI per client:
-- umpan status terminal tiap client.
-- Admin tidak butuh ini untuk menindak laporan, dan kalau ada, dasbor CopyTrade
-- milik admin menampilkan data user lain bercampur dengan datanya sendiri
-- (persis keluhan "token client user A muncul di akun user B"). Admin tetap bisa
-- melihat sisi provider (signal_providers, copy_links, provider_positions,
-- copy_events, provider_reports) yang memang dibutuhkan untuk moderasi.
-- Baris `drop` tetap dijalankan supaya instalasi yang sudah terlanjur memakai
-- versi lama ikut dibersihkan (file ini idempotent).
drop policy if exists "admin_all" on public.ea_feed;

-- 5i) guard_events
drop policy if exists "guard_events_own" on public.guard_events;
create policy "guard_events_own" on public.guard_events
  for select to authenticated using (client_id = auth.uid());

drop policy if exists "guard_events_own_insert" on public.guard_events;
create policy "guard_events_own_insert" on public.guard_events
  for insert to authenticated with check (client_id = auth.uid());

drop policy if exists "guard_events_ea_insert" on public.guard_events;
create policy "guard_events_ea_insert" on public.guard_events
  for insert to anon, authenticated
  with check (public.ea_uid() is not null and public.ea_uid() = client_id);

-- TANPA admin_all di sini (sengaja). Isi tabel ini adalah data PRIBADI per client:
-- catatan guard milik tiap client.
-- Admin tidak butuh ini untuk menindak laporan, dan kalau ada, dasbor CopyTrade
-- milik admin menampilkan data user lain bercampur dengan datanya sendiri
-- (persis keluhan "token client user A muncul di akun user B"). Admin tetap bisa
-- melihat sisi provider (signal_providers, copy_links, provider_positions,
-- copy_events, provider_reports) yang memang dibutuhkan untuk moderasi.
-- Baris `drop` tetap dijalankan supaya instalasi yang sudah terlanjur memakai
-- versi lama ikut dibersihkan (file ini idempotent).
drop policy if exists "admin_all" on public.guard_events;

-- 5j) provider_reports
drop policy if exists "provider_reports_insert_own" on public.provider_reports;
create policy "provider_reports_insert_own" on public.provider_reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "provider_reports_read_own" on public.provider_reports;
create policy "provider_reports_read_own" on public.provider_reports
  for select to authenticated
  using (reporter_id = auth.uid() or provider_id = auth.uid());

drop policy if exists "admin_all" on public.provider_reports;
create policy "admin_all" on public.provider_reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5k) journal_auto_sync (default OFF)
drop policy if exists "journal_auto_sync_own" on public.journal_auto_sync;
create policy "journal_auto_sync_own" on public.journal_auto_sync
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "admin_all" on public.journal_auto_sync;
create policy "admin_all" on public.journal_auto_sync
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5l) telegram_bots: SENGAJA tanpa policy SELECT untuk user biasa.
--     Siapa pun yang memegang token bisa mengendalikan bot (K8), jadi token_enc tidak
--     boleh terbaca dari browser. Isi/ubah baris HANYA lewat Edge Function (service_role,
--     bypass RLS). UI memakai view copytrade_telegram_bots_public + RPC telegram_status().
drop policy if exists "admin_all" on public.telegram_bots;
create policy "admin_all" on public.telegram_bots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5m) telegram_links (tautan chat_id; client boleh memutuskan tautannya sendiri)
drop policy if exists "telegram_links_read_involved" on public.telegram_links;
create policy "telegram_links_read_involved" on public.telegram_links
  for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid());

drop policy if exists "telegram_links_client_write" on public.telegram_links;
create policy "telegram_links_client_write" on public.telegram_links
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "telegram_links_client_delete" on public.telegram_links;
create policy "telegram_links_client_delete" on public.telegram_links
  for delete to authenticated using (client_id = auth.uid());

drop policy if exists "admin_all" on public.telegram_links;
create policy "admin_all" on public.telegram_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5n) telegram_codes (peserta link boleh lihat kodenya; tulis lewat RPC rotate_access_code)
drop policy if exists "telegram_codes_read_involved" on public.telegram_codes;
create policy "telegram_codes_read_involved" on public.telegram_codes
  for select to authenticated using (exists (
    select 1 from public.copy_links l
    where l.id = telegram_codes.copy_link_id
      and (l.provider_id = auth.uid() or l.client_id = auth.uid())
  ));

drop policy if exists "admin_all" on public.telegram_codes;
create policy "admin_all" on public.telegram_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 6) VIEW PUBLIK (halaman anon: leaderboard + profil provider)
--    Halaman publik hanya boleh melihat kolom yang aman, jadi pakai view —
--    bukan membuka seluruh tabel. View berjalan sebagai owner (security definer view),
--    sehingga RLS tabel dasar dilewati HANYA untuk kolom yang kita pilih di sini.
-- ============================================================
drop view if exists public.copytrade_providers_public;
create view public.copytrade_providers_public as
select sp.user_id,
       sp.display_name,
       sp.slug,
       sp.bio,
       sp.avatar_url,
       sp.is_verified,
       sp.is_suspended,
       (sp.terms_accepted_at is not null) as terms_accepted,
       sp.created_at
from public.signal_providers sp
where sp.is_active;

drop view if exists public.copytrade_positions_public;
create view public.copytrade_positions_public as
select p.id,
       sp.slug as provider_slug,
       sp.display_name as provider_name,
       p.symbol,
       p.side,
       p.volume,
       p.entry,
       p.opened_at,
       p.closed_at,
       p.status,
       p.updated_at
from public.provider_positions p
join public.signal_providers sp on sp.user_id = p.provider_id
where sp.is_active;

drop view if exists public.copytrade_leaderboard;
create view public.copytrade_leaderboard as
select sp.user_id as provider_id,
       sp.slug,
       sp.display_name,
       sp.bio,
       sp.avatar_url,
       sp.is_verified,
       sp.created_at,
       coalesce(s.trades, 0) as trades,
       coalesce(s.open_positions, 0) as open_positions,
       s.last_position_at
from public.signal_providers sp
left join (
  select provider_id,
         count(*) filter (where status = 'closed') as trades,
         count(*) filter (where status = 'open') as open_positions,
         max(updated_at) as last_position_at
  from public.provider_positions
  group by provider_id
) s on s.provider_id = sp.user_id
where sp.is_active and not sp.is_suspended;

-- Hanya bot_username + status. Token tetap tertutup.
drop view if exists public.copytrade_telegram_bots_public;
create view public.copytrade_telegram_bots_public as
select provider_id, bot_username, is_active, linked_at
from public.telegram_bots
where is_active;

-- ============================================================
-- 7) RPC (§7.4, SECURITY DEFINER, pola coaching)
-- ============================================================

-- 7a) apply_provider — self-serve daftar jadi provider, langsung tayang
create or replace function public.apply_provider(p_slug text, p_bio text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  my_id uuid := auth.uid();
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_slug text;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  if v_name is null then
    select nullif(split_part(coalesce(u.email::text, ''), '@', 1), '') into v_name
    from auth.users u where u.id = my_id;
  end if;
  v_name := coalesce(v_name, 'Trader');

  v_slug := lower(regexp_replace(coalesce(p_slug, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if length(v_slug) > 48 then
    v_slug := substr(v_slug, 1, 48);
  end if;
  if length(v_slug) < 3 then
    v_slug := 'p-' || substr(replace(my_id::text, '-', ''), 1, 8);
  end if;

  begin
    insert into public.signal_providers (user_id, display_name, slug, bio, terms_accepted_at, is_active)
    values (my_id, v_name, v_slug, nullif(btrim(coalesce(p_bio, '')), ''), now(), true)
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          slug = excluded.slug,
          bio = excluded.bio,
          terms_accepted_at = coalesce(public.signal_providers.terms_accepted_at, now()),
          is_active = true;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Slug sudah dipakai. Pilih slug lain.');
  end;

  return jsonb_build_object('ok', true, 'slug', v_slug, 'display_name', v_name);
end $$;

-- 7b) admin_suspend_provider — efek instan: trigger fan-out berhenti
create or replace function public.admin_suspend_provider(p_user uuid, p_suspended boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  update public.signal_providers set is_suspended = p_suspended where user_id = p_user;
  return found;
end $$;

-- 7c) admin_verify_provider
create or replace function public.admin_verify_provider(p_user uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  update public.signal_providers set is_verified = p_verified where user_id = p_user;
  return found;
end $$;

-- 7d) report_provider — tombol laporkan
create or replace function public.report_provider(p_provider_id uuid, p_reason text, p_detail text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  v_id uuid;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Alasan wajib diisi.');
  end if;
  if not exists (select 1 from public.signal_providers p where p.user_id = p_provider_id) then
    return jsonb_build_object('ok', false, 'error', 'Provider tidak ditemukan.');
  end if;

  insert into public.provider_reports (provider_id, reporter_id, reason, detail, status)
  values (p_provider_id, my_id, btrim(p_reason), nullif(btrim(coalesce(p_detail, '')), ''), 'open')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'report_id', v_id);
end $$;

-- 7e) request_copy — client minta follow provider
create or replace function public.request_copy(p_provider_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  v_provider uuid;
  v_status text;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  select sp.user_id into v_provider
  from public.signal_providers sp
  where sp.slug = lower(btrim(coalesce(p_provider_slug, ''))) and sp.is_active;

  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'Provider tidak ditemukan.');
  end if;
  if v_provider = my_id then
    return jsonb_build_object('ok', false, 'error', 'Tidak bisa follow diri sendiri.');
  end if;

  insert into public.copy_links (provider_id, client_id, status, requested_by, settings, runtime_state)
  values (v_provider, my_id, 'pending', 'client', public.copytrade_default_settings(), '{}'::jsonb)
  -- Menekan tombol "Copy" lagi TIDAK boleh menurunkan status yang sudah dimiliki
  -- client: kalau link sedang 'paused' dan statusnya direset ke 'pending', EA
  -- (yang hanya mengambil active|paused) berhenti, tanpa penjelasan yang jelas.
  -- 'active' dan 'paused' dipertahankan; 'rejected'/'ended' boleh jadi permintaan baru.
  on conflict (provider_id, client_id) do update
    set status = case
          when public.copy_links.status in ('active', 'paused') then public.copy_links.status
          else 'pending'
        end,
        requested_by = 'client'
  returning status into v_status;

  return jsonb_build_object('ok', true, 'status', v_status);
end $$;

-- 7f) respond_copy_request — provider (atau client sendiri / admin) menyetujui
create or replace function public.respond_copy_request(p_link_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  l record;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  select * into l from public.copy_links where id = p_link_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Link tidak ditemukan.');
  end if;
  if l.provider_id <> my_id and l.client_id <> my_id and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Forbidden.');
  end if;

  if p_accept then
    update public.copy_links set status = 'active' where id = p_link_id;
    insert into public.ea_feed (client_id, rev) values (l.client_id, 0)
    on conflict (client_id) do nothing;
    perform public.copytrade_ensure_code(p_link_id);
  else
    update public.copy_links set status = 'revoked' where id = p_link_id;
  end if;

  return jsonb_build_object('ok', true, 'status', case when p_accept then 'active' else 'revoked' end);
end $$;

-- 7g) set_copy_settings — validasi rentang di server (§4.3, §5, §7.2)
create or replace function public.set_copy_settings(p_link_id uuid, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  s jsonb;
  v_num numeric;
  v_txt text;
  k text;
  path text[];
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  if not exists (
    select 1 from public.copy_links l
    where l.id = p_link_id
      and (l.client_id = my_id or l.provider_id = my_id or public.is_admin())
  ) then
    return jsonb_build_object('ok', false, 'error', 'Link tidak ditemukan.');
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'settings harus object.');
  end if;
  -- keputusan 12: dry-run dihapus, jangan simpan kalau ada yang menyelipkan
  if p_settings ? 'dryRun' then
    return jsonb_build_object('ok', false, 'error', 'dryRun tidak didukung (keputusan 12).');
  end if;

  s := public.jsonb_deep_merge(public.copytrade_default_settings(), p_settings);

  -- sizing: tanpa hard cap, tapi > 100% ditolak (validasi kewajaran §4.3)
  v_num := public.copytrade_num(s #>> '{sizing,riskPct}');
  if v_num is null or v_num <= 0 then
    return jsonb_build_object('ok', false, 'error', 'sizing.riskPct harus > 0.');
  end if;
  if v_num > 100 then
    return jsonb_build_object('ok', false, 'error', 'sizing.riskPct maksimal 100.');
  end if;
  v_txt := s #>> '{sizing,basis}';
  if v_txt is not null and v_txt not in ('balance','equity') then
    return jsonb_build_object('ok', false, 'error', 'sizing.basis harus balance atau equity.');
  end if;

  -- enum
  v_txt := s #>> '{mirror,riskBreachAction}';
  if v_txt is not null and v_txt not in ('warn','trim','ignore') then
    return jsonb_build_object('ok', false, 'error', 'mirror.riskBreachAction harus warn/trim/ignore.');
  end if;
  v_txt := s #>> '{order,type}';
  if v_txt is not null and v_txt not in ('market') then
    return jsonb_build_object('ok', false, 'error', 'order.type harus market.');
  end if;
  v_txt := s #>> '{order,fillPolicy}';
  if v_txt is not null and v_txt not in ('IOC','FOK','RETURN') then
    return jsonb_build_object('ok', false, 'error', 'order.fillPolicy harus IOC/FOK/RETURN.');
  end if;

  -- semua angka non-negatif dan tipenya benar
  foreach k in array array[
    'sizing.maxLotCap','stops.slFallbackPoints','stops.maxHoldMinutes',
    'mirror.modifyThrottleSeconds','mirror.minModifyPoints',
    'guards.maxSpreadPoints','guards.maxEntryDeviationPoints','guards.maxSlippagePoints',
    'guards.maxPositions','guards.maxPositionsPerSymbol',
    'limits.maxTotalRiskPct','limits.dailyLossLimitPct','limits.dailyProfitTargetPct',
    'limits.maxDrawdownPct','limits.maxTradesPerDay','order.deviationPoints'
  ] loop
    path := string_to_array(k, '.');
    if (s #> path) is not null and jsonb_typeof(s #> path) not in ('number','null') then
      return jsonb_build_object('ok', false, 'error', format('%s harus angka.', k));
    end if;
    v_num := public.copytrade_num(s #>> path);
    if v_num is not null and v_num < 0 then
      return jsonb_build_object('ok', false, 'error', format('%s tidak boleh negatif.', k));
    end if;
  end loop;

  -- persen <= 100
  foreach k in array array[
    'limits.maxTotalRiskPct','limits.dailyLossLimitPct','limits.maxDrawdownPct','limits.dailyProfitTargetPct'
  ] loop
    v_num := public.copytrade_num(s #>> string_to_array(k, '.'));
    if v_num is not null and v_num > 100 then
      return jsonb_build_object('ok', false, 'error', format('%s maksimal 100.', k));
    end if;
  end loop;

  update public.copy_links set settings = s where id = p_link_id;
  return jsonb_build_object('ok', true, 'settings', s);
end $$;

-- 7h) set_copy_state — pause / resume / kill switch (runtime_state)
create or replace function public.set_copy_state(p_link_id uuid, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  v_status text;
  v_state jsonb;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'state harus object.');
  end if;
  if not exists (
    select 1 from public.copy_links l
    where l.id = p_link_id
      and (l.client_id = my_id or l.provider_id = my_id or public.is_admin())
  ) then
    return jsonb_build_object('ok', false, 'error', 'Link tidak ditemukan.');
  end if;

  v_status := lower(nullif(btrim(coalesce(p_state ->> 'status', '')), ''));
  if v_status is not null and v_status not in ('active','paused') then
    return jsonb_build_object('ok', false, 'error', 'status harus active atau paused.');
  end if;

  update public.copy_links
     set runtime_state = coalesce(runtime_state, '{}'::jsonb) || (p_state - 'status'),
         status = coalesce(v_status, status)
   where id = p_link_id
  returning runtime_state, status into v_state, v_status;

  return jsonb_build_object('ok', true, 'status', v_status, 'runtime_state', v_state);
end $$;

-- 7i) provider_publish_event — dipanggil EA provider (auth: header x-ea-token)
create or replace function public.provider_publish_event(p_kind text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.ea_uid();
  v_role text := public.ea_role();
  v_kind text := upper(btrim(coalesce(p_kind, '')));
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_ticket bigint;
  v_pos uuid;
  v_seq bigint;
  v_event uuid;
begin
  if uid is null or coalesce(v_role, '') not in ('PROVIDER','BOTH') then
    return jsonb_build_object('ok', false, 'error', 'Token EA tidak valid (butuh role PROVIDER).');
  end if;
  if v_kind not in ('OPEN','MODIFY_SL','MODIFY_TP','PARTIAL_CLOSE','CLOSE','CLOSE_ALL') then
    return jsonb_build_object('ok', false, 'error', 'kind tidak dikenal.');
  end if;
  -- token hanya boleh menyentuh baris miliknya sendiri
  if btrim(coalesce(payload ->> 'provider_id', '')) <> ''
     and btrim(payload ->> 'provider_id') <> uid::text then
    return jsonb_build_object('ok', false, 'error', 'provider_id tidak cocok dengan token.');
  end if;

  v_ticket := public.copytrade_num(payload ->> 'provider_ticket')::bigint;

  if v_kind <> 'CLOSE_ALL' and v_ticket is not null then
    insert into public.provider_positions as pp
      (provider_id, provider_ticket, symbol, side, volume, entry, sl, tp, opened_at, status)
    values
      (uid, v_ticket,
       coalesce(nullif(btrim(payload ->> 'symbol'), ''), '?'),
       case when lower(coalesce(payload ->> 'side','buy')) = 'sell' then 'sell' else 'buy' end,
       coalesce(public.copytrade_num(payload ->> 'volume'), 0),
       public.copytrade_price(payload ->> 'entry'),
       public.copytrade_price(payload ->> 'sl'),
       public.copytrade_price(payload ->> 'tp'),
       coalesce(public.copytrade_ts(payload ->> 'opened_at'), now()),
       case when v_kind = 'CLOSE' then 'closed' else 'open' end)
    on conflict (provider_id, provider_ticket) do update
      set symbol = case when payload ? 'symbol'
                        then coalesce(nullif(btrim(payload ->> 'symbol'), ''), pp.symbol)
                        else pp.symbol end,
          side = case when payload ? 'side'
                      then case when lower(payload ->> 'side') = 'sell' then 'sell' else 'buy' end
                      else pp.side end,
          volume = case when payload ? 'volume'
                        then coalesce(public.copytrade_num(payload ->> 'volume'), pp.volume)
                        else pp.volume end,
          entry = case when payload ? 'entry' then public.copytrade_price(payload ->> 'entry')
                       else pp.entry end,
          -- §6.5.2: MODIFY membawa pasangan (sl, tp) LENGKAP; 0 = dihapus => NULL
          sl = case when payload ? 'sl' then public.copytrade_price(payload ->> 'sl')
                    else pp.sl end,
          tp = case when payload ? 'tp' then public.copytrade_price(payload ->> 'tp')
                    else pp.tp end,
          -- posisi yang sudah closed tidak dihidupkan lagi oleh event telat
          status = case when v_kind = 'CLOSE' then 'closed'
                        when pp.status = 'closed' then 'closed'
                        else 'open' end,
          closed_at = case when v_kind = 'CLOSE' then now() else pp.closed_at end
    returning id into v_pos;
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq
  from public.copy_events where provider_id = uid;

  insert into public.copy_events (provider_id, provider_position_id, kind, seq, payload)
  values (uid, v_pos, v_kind, v_seq, payload)
  returning id into v_event;   -- trigger copy_events_fanout menangani sisa

  update public.ea_tokens set last_seen = now() where id = public.ea_token_id();

  return jsonb_build_object(
    'ok', true,
    'event_id', v_event,
    'provider_position_id', v_pos,
    'seq', v_seq,
    'revision', (select p.revision from public.provider_positions p where p.id = v_pos)
  );
end $$;

-- 7j) provider_sync_positions — snapshot posisi provider dari EA
create or replace function public.provider_sync_positions(p_positions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.ea_uid();
  v_role text := public.ea_role();
  arr jsonb;
  r jsonb;
  v_ticket bigint;
  n integer := 0;
  v_closed integer := 0;
  tickets bigint[] := '{}'::bigint[];
begin
  if uid is null or coalesce(v_role, '') not in ('PROVIDER','BOTH') then
    return jsonb_build_object('ok', false, 'error', 'Token EA tidak valid (butuh role PROVIDER).');
  end if;

  if p_positions is null then
    return jsonb_build_object('ok', false, 'error', 'positions wajib diisi.');
  end if;
  if jsonb_typeof(p_positions) = 'array' then
    arr := p_positions;
  elsif jsonb_typeof(p_positions) = 'object'
        and p_positions ? 'positions'
        and jsonb_typeof(p_positions -> 'positions') = 'array' then
    arr := p_positions -> 'positions';
  else
    return jsonb_build_object('ok', false, 'error', 'positions harus array atau {positions:[...]}.');
  end if;

  for r in select * from jsonb_array_elements(arr) loop
    v_ticket := public.copytrade_num(r ->> 'provider_ticket')::bigint;
    if v_ticket is null then
      continue;
    end if;

    insert into public.provider_positions as pp
      (provider_id, provider_ticket, symbol, side, volume, entry, sl, tp, opened_at, status)
    values
      (uid, v_ticket,
       coalesce(nullif(btrim(r ->> 'symbol'), ''), '?'),
       case when lower(coalesce(r ->> 'side','buy')) = 'sell' then 'sell' else 'buy' end,
       coalesce(public.copytrade_num(r ->> 'volume'), 0),
       public.copytrade_price(r ->> 'entry'),
       public.copytrade_price(r ->> 'sl'),
       public.copytrade_price(r ->> 'tp'),
       coalesce(public.copytrade_ts(r ->> 'opened_at'), now()),
       'open')
    on conflict (provider_id, provider_ticket) do update
      set symbol = coalesce(nullif(btrim(r ->> 'symbol'), ''), pp.symbol),
          side = case when lower(coalesce(r ->> 'side','')) = 'sell' then 'sell'
                      when lower(coalesce(r ->> 'side','')) = 'buy' then 'buy'
                      else pp.side end,
          volume = coalesce(public.copytrade_num(r ->> 'volume'), pp.volume),
          entry = coalesce(public.copytrade_price(r ->> 'entry'), pp.entry),
          -- null = MT5 tidak punya SL/TP, jadi ini memang state terbaru (§6.5.2)
          sl = case when r ? 'sl' then public.copytrade_price(r ->> 'sl') else pp.sl end,
          tp = case when r ? 'tp' then public.copytrade_price(r ->> 'tp') else pp.tp end,
          status = 'open',
          closed_at = null;

    n := n + 1;
    tickets := tickets || v_ticket;
  end loop;

  -- posisi yang tidak ada lagi di snapshot = sudah close di MT5 provider
  update public.provider_positions
     set status = 'closed', closed_at = coalesce(closed_at, now())
   where provider_id = uid
     and status = 'open'
     and not (provider_ticket = any(tickets));
  get diagnostics v_closed = row_count;

  update public.ea_tokens set last_seen = now() where id = public.ea_token_id();

  return jsonb_build_object('ok', true, 'upserted', n, 'closed', v_closed);
end $$;

-- 7k) client_ack — ack eksekusi dari EA client (auth: header x-ea-token)
create or replace function public.client_ack(p_delivery_id uuid, p_status text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.ea_uid();
  st text := lower(btrim(coalesce(p_status, '')));
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  d record;
  ev record;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Token EA tidak valid.');
  end if;
  if st not in ('pending','executed','skipped','expired','failed') then
    return jsonb_build_object('ok', false, 'error', 'status tidak dikenal.');
  end if;

  select * into d
  from public.copy_deliveries
  where id = p_delivery_id and client_id = uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Delivery tidak ditemukan untuk token ini.');
  end if;

  update public.copy_deliveries
     set status = st,
         skip_reason = case when st = 'skipped' then nullif(btrim(payload ->> 'reason'), '') else skip_reason end,
         fail_reason = case when st = 'failed'  then nullif(btrim(payload ->> 'reason'), '') else fail_reason end,
         client_ticket = coalesce(public.copytrade_num(payload ->> 'client_ticket')::bigint, client_ticket),
         fill_price = coalesce(public.copytrade_price(payload ->> 'fill_price'), fill_price),
         slippage_points = coalesce(public.copytrade_num(payload ->> 'slippage_points'), slippage_points),
         lots = coalesce(public.copytrade_num(payload ->> 'lots'), lots),
         risk_amount = coalesce(public.copytrade_num(payload ->> 'risk_amount'), risk_amount),
         risk_pct = coalesce(public.copytrade_num(payload ->> 'risk_pct'), risk_pct),
         ea_balance = coalesce(public.copytrade_num(payload ->> 'ea_balance'), ea_balance),
         ea_equity = coalesce(public.copytrade_num(payload ->> 'ea_equity'), ea_equity),
         picked_at = coalesce(picked_at, case when st <> 'pending' then now() else null end),
         executed_at = case when st in ('executed','skipped','failed') then now() else executed_at end
   where id = p_delivery_id and client_id = uid;

  select e.kind, e.provider_position_id, e.provider_id into ev
  from public.copy_events e where e.id = d.event_id;

  if st = 'executed' then
    if ev.kind = 'OPEN' and ev.provider_position_id is not null then
      insert into public.client_positions
        (client_id, provider_id, provider_position_id, client_ticket, symbol, lots, state, sl, tp, opened_at)
      values
        (uid, ev.provider_id, ev.provider_position_id,
         public.copytrade_num(payload ->> 'client_ticket')::bigint,
         nullif(btrim(payload ->> 'symbol'), ''),
         public.copytrade_num(payload ->> 'lots'),
         'open',
         public.copytrade_price(payload ->> 'sl'),
         public.copytrade_price(payload ->> 'tp'),
         now())
      on conflict (client_id, provider_position_id) do update
        set client_ticket = coalesce(excluded.client_ticket, public.client_positions.client_ticket),
            lots = coalesce(excluded.lots, public.client_positions.lots),
            state = 'open',
            closed_at = null;
    elsif ev.kind = 'CLOSE' and ev.provider_position_id is not null then
      update public.client_positions
         set state = 'closed', closed_at = now()
       where client_id = uid and provider_position_id = ev.provider_position_id and state <> 'closed';
    elsif ev.kind = 'CLOSE_ALL' then
      update public.client_positions
         set state = 'closed', closed_at = now()
       where client_id = uid and provider_id = ev.provider_id and state = 'open';
    elsif ev.kind in ('MODIFY_SL','MODIFY_TP') and ev.provider_position_id is not null then
      update public.client_positions
         set sl = case when payload ? 'sl' then public.copytrade_price(payload ->> 'sl') else sl end,
             tp = case when payload ? 'tp' then public.copytrade_price(payload ->> 'tp') else tp end
       where client_id = uid and provider_position_id = ev.provider_position_id and state = 'open';
    end if;
  elsif st = 'skipped' and ev.kind = 'OPEN' and ev.provider_position_id is not null then
    insert into public.client_positions (client_id, provider_id, provider_position_id, state, symbol, opened_at)
    values (uid, ev.provider_id, ev.provider_position_id, 'missed',
            nullif(btrim(payload ->> 'symbol'), ''), now())
    on conflict (client_id, provider_position_id) do nothing;
  end if;

  update public.ea_tokens set last_seen = now() where id = public.ea_token_id();

  return jsonb_build_object('ok', true, 'delivery_id', p_delivery_id, 'status', st);
end $$;

-- 7l) provider_stats — statistik publik dari provider_positions
--     Catatan: P&L diukur dalam "poin harga" (close - entry per arah), bukan mata uang,
--     karena DB tidak menyimpan nilai per tick broker provider. avg_rr memakai jarak SL
--     saat ini sebagai perkiraan risiko.
create or replace function public.provider_stats(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_provider uuid;
  v_out jsonb;
begin
  select sp.user_id into v_provider
  from public.signal_providers sp
  where sp.slug = lower(btrim(coalesce(p_slug, '')));

  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'Provider tidak ditemukan.');
  end if;

  with pos as (
    select p.id, p.side, p.entry, p.sl, p.opened_at, p.closed_at,
           coalesce((
             select public.copytrade_price(e.payload ->> 'close_price')
             from public.copy_events e
             where e.provider_position_id = p.id and e.kind = 'CLOSE'
             order by e.seq desc
             limit 1
           ), p.entry) as exit_price
    from public.provider_positions p
    where p.provider_id = v_provider
      and p.status = 'closed'
      and p.entry is not null
  ), calc as (
    select pos.*,
           case when pos.side = 'sell' then pos.entry - pos.exit_price
                else pos.exit_price - pos.entry end as points,
           nullif(abs(pos.entry - coalesce(pos.sl, pos.entry)), 0) as risk_points
    from pos
  ), agg as (
    select count(*) as trades,
           count(*) filter (where points > 0) as wins,
           count(*) filter (where points < 0) as losses,
           coalesce(avg(points) filter (where points > 0), 0) as avg_win,
           coalesce(avg(points) filter (where points < 0), 0) as avg_loss,
           coalesce(sum(points), 0) as total_points,
           coalesce(sum(case when risk_points is not null then points / risk_points end), 0) as rr_sum,
           count(risk_points) as rr_n,
           coalesce(max(points), 0) as best_points,
           coalesce(min(points), 0) as worst_points
    from calc
  ), curve as (
    select closed_at, id, sum(points) over (order by closed_at, id) as cum
    from calc
  ), dd as (
    select coalesce(max(peak - cum), 0) as max_dd
    from (select cum, max(cum) over (order by closed_at, id) as peak from curve) x
  )
  select jsonb_build_object(
    'ok', true,
    'slug', lower(btrim(coalesce(p_slug, ''))),
    'trades', agg.trades,
    'wins', agg.wins,
    'losses', agg.losses,
    'winrate', case when agg.trades > 0 then round(agg.wins::numeric * 100 / agg.trades, 2) else null end,
    'avg_rr', case when agg.rr_n > 0 then round(agg.rr_sum / agg.rr_n, 3) else null end,
    'avg_win_points', round(agg.avg_win, 4),
    'avg_loss_points', round(agg.avg_loss, 4),
    'total_points', round(agg.total_points, 4),
    'best_points', round(agg.best_points, 4),
    'worst_points', round(agg.worst_points, 4),
    'max_drawdown_points', round(dd.max_dd, 4),
    'open_positions', (
      select count(*) from public.provider_positions p
      where p.provider_id = v_provider and p.status = 'open'
    ),
    'equity_curve', coalesce((
      select jsonb_agg(jsonb_build_object('t', closed_at, 'v', round(cum, 4)) order by closed_at, id)
      from curve
    ), '[]'::jsonb)
  ) into v_out
  from agg, dd;

  return coalesce(v_out, jsonb_build_object('ok', true, 'trades', 0));
end $$;

-- 7m) client_copy_overview — ringkasan dashboard client
create or replace function public.client_copy_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
begin
  if my_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'link_id', l.id, 'provider_id', l.provider_id, 'status', l.status,
               'settings', l.settings, 'runtime_state', l.runtime_state,
               'slug', sp.slug, 'display_name', sp.display_name,
               'is_suspended', coalesce(sp.is_suspended, false),
               'is_verified', coalesce(sp.is_verified, false),
               'created_at', l.created_at
             ) order by l.created_at desc)
      from public.copy_links l
      left join public.signal_providers sp on sp.user_id = l.provider_id
      where l.client_id = my_id
    ), '[]'::jsonb),
    'ea', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'label', t.label, 'role', t.role, 'active', t.active,
               'last_seen', t.last_seen, 'is_demo', t.is_demo,
               'account_login', t.account_login, 'account_server', t.account_server,
               'terminal_build', t.terminal_build, 'leverage', t.leverage,
               'online', (t.last_seen is not null and t.last_seen > now() - interval '5 minutes')
             ) order by t.created_at desc)
      from public.ea_tokens t
      where t.client_id = my_id
    ), '[]'::jsonb),
    'open_positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', cp.id, 'provider_id', cp.provider_id, 'symbol', cp.symbol,
               'lots', cp.lots, 'state', cp.state, 'sl', cp.sl, 'tp', cp.tp,
               'client_ticket', cp.client_ticket, 'opened_at', cp.opened_at
             ) order by cp.opened_at desc)
      from public.client_positions cp
      where cp.client_id = my_id and cp.state = 'open'
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
               'delivery_id', d.id, 'provider_id', d.provider_id, 'kind', e.kind,
               'symbol', e.payload ->> 'symbol', 'status', d.status,
               'skip_reason', d.skip_reason, 'fail_reason', d.fail_reason,
               'lots', d.lots, 'risk_amount', d.risk_amount, 'risk_pct', d.risk_pct,
               'fill_price', d.fill_price, 'slippage_points', d.slippage_points,
               'client_ticket', d.client_ticket, 'created_at', d.created_at,
               'executed_at', d.executed_at
             ) order by d.created_at desc)
      from (
        select * from public.copy_deliveries
        where client_id = my_id
        order by created_at desc
        limit 50
      ) d
      join public.copy_events e on e.id = d.event_id
    ), '[]'::jsonb),
    'skip_reasons', coalesce((
      select jsonb_agg(jsonb_build_object('reason', s.skip_reason, 'n', s.n) order by s.n desc)
      from (
        select coalesce(skip_reason, '(tanpa alasan)') as skip_reason, count(*) as n
        from public.copy_deliveries
        where client_id = my_id and status = 'skipped'
        group by 1
        order by n desc
        limit 5
      ) s
    ), '[]'::jsonb),
    'journal_auto_sync', (
      select jsonb_build_object('enabled', j.enabled, 'mode', j.mode)
      from public.journal_auto_sync j where j.client_id = my_id
    ),
    'telegram', coalesce((
      select jsonb_agg(jsonb_build_object(
               'provider_id', tl.provider_id, 'chat_id', tl.chat_id,
               'is_active', tl.is_active, 'linked_at', tl.linked_at,
               'tg_username', tl.tg_username
             ) order by tl.linked_at desc)
      from public.telegram_links tl
      where tl.client_id = my_id
    ), '[]'::jsonb)
  );
end $$;

-- 7n) close_all_from_provider — tombol CLOSE_ALL di app provider
create or replace function public.close_all_from_provider(p_provider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  v_seq bigint;
  v_event uuid;
  n integer := 0;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  if my_id <> p_provider_id and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Forbidden.');
  end if;

  update public.provider_positions
     set status = 'closed', closed_at = coalesce(closed_at, now())
   where provider_id = p_provider_id and status = 'open';
  get diagnostics n = row_count;

  select coalesce(max(seq), 0) + 1 into v_seq
  from public.copy_events where provider_id = p_provider_id;

  insert into public.copy_events (provider_id, provider_position_id, kind, seq, payload)
  values (p_provider_id, null, 'CLOSE_ALL', v_seq,
          jsonb_build_object('closed_positions', n, 'by', 'provider'))
  returning id into v_event;

  return jsonb_build_object('ok', true, 'event_id', v_event, 'seq', v_seq, 'closed_positions', n);
end $$;

-- 7o) rotate_access_code — provider mengganti kode akses satu copy_link
create or replace function public.rotate_access_code(p_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  l record;
  v_code text;
  i integer;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  select * into l from public.copy_links where id = p_link_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Link tidak ditemukan.');
  end if;
  if l.provider_id <> my_id and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Forbidden.');
  end if;

  for i in 1..6 loop
    begin
      v_code := public.copytrade_new_code();
      insert into public.telegram_codes (copy_link_id, code, rotated_at)
      values (p_link_id, v_code, now())
      on conflict (copy_link_id) do update
        set code = excluded.code, rotated_at = now();
      return jsonb_build_object('ok', true, 'copy_link_id', p_link_id, 'code', v_code);
    exception when unique_violation then
      if i = 6 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object('ok', false, 'error', 'Gagal membuat kode unik.');
end $$;

-- 7p) telegram_status — status bot TANPA token
create or replace function public.telegram_status(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  v_is_provider boolean;
  v_linked boolean;
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  v_is_provider := (my_id = p_provider_id) or public.is_admin();
  v_linked := exists (
    select 1 from public.copy_links l
    where l.provider_id = p_provider_id and l.client_id = my_id
  );

  if not v_is_provider and not v_linked then
    return jsonb_build_object('ok', false, 'error', 'Forbidden.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'provider_id', p_provider_id,
    'bot_username', (select b.bot_username from public.telegram_bots b where b.provider_id = p_provider_id),
    'is_active', coalesce((select b.is_active from public.telegram_bots b where b.provider_id = p_provider_id), false),
    'token_set', coalesce((select b.token_enc is not null from public.telegram_bots b where b.provider_id = p_provider_id), false),
    'linked_at', (select b.linked_at from public.telegram_bots b where b.provider_id = p_provider_id),
    'last_error', (select b.last_error from public.telegram_bots b where b.provider_id = p_provider_id),
    'followers', case when v_is_provider then (
      select count(*) from public.telegram_links tl
      where tl.provider_id = p_provider_id and tl.is_active
    ) else null end,
    'my_links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'copy_link_id', tl.copy_link_id, 'chat_id', tl.chat_id,
               'is_active', tl.is_active, 'linked_at', tl.linked_at)
             order by tl.linked_at desc)
      from public.telegram_links tl
      where tl.provider_id = p_provider_id and tl.client_id = my_id
    ), '[]'::jsonb),
    -- provider melihat kode tiap link tanpa identitas client (§11.10)
    'provider_codes', case when v_is_provider then coalesce((
      select jsonb_agg(jsonb_build_object(
               'copy_link_id', c.copy_link_id, 'code', c.code,
               'rotated_at', c.rotated_at, 'used_at', c.used_at,
               'link_status', l.status)
             order by c.rotated_at desc)
      from public.telegram_codes c
      join public.copy_links l on l.id = c.copy_link_id
      where l.provider_id = p_provider_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    -- client hanya melihat kodenya sendiri (untuk tombol Hubungkan)
    'my_codes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'copy_link_id', c.copy_link_id, 'code', c.code,
               'rotated_at', c.rotated_at, 'used_at', c.used_at)
             order by c.rotated_at desc)
      from public.telegram_codes c
      join public.copy_links l on l.id = c.copy_link_id
      where l.provider_id = p_provider_id and l.client_id = my_id
    ), '[]'::jsonb)
  );
end $$;

-- ============================================================
-- 8) GRANTS
-- ============================================================
grant execute on function public.is_provider() to authenticated;
grant execute on function public.ea_token_hash() to anon, authenticated;

grant execute on function public.apply_provider(text, text, text) to authenticated;
grant execute on function public.admin_suspend_provider(uuid, boolean) to authenticated;
grant execute on function public.admin_verify_provider(uuid, boolean) to authenticated;
grant execute on function public.report_provider(uuid, text, text) to authenticated;
grant execute on function public.request_copy(text) to authenticated;
grant execute on function public.respond_copy_request(uuid, boolean) to authenticated;
grant execute on function public.set_copy_settings(uuid, jsonb) to authenticated;
grant execute on function public.set_copy_state(uuid, jsonb) to authenticated;
grant execute on function public.client_copy_overview() to authenticated;
grant execute on function public.close_all_from_provider(uuid) to authenticated;
grant execute on function public.rotate_access_code(uuid) to authenticated;
grant execute on function public.telegram_status(uuid) to authenticated;

-- dipanggil EA (anon key + header x-ea-token); otorisasi di dalam fungsi
grant execute on function public.provider_publish_event(text, jsonb) to anon, authenticated;
grant execute on function public.provider_sync_positions(jsonb) to anon, authenticated;
grant execute on function public.client_ack(uuid, text, jsonb) to anon, authenticated;

-- halaman publik (leaderboard + profil provider)
grant execute on function public.provider_stats(text) to anon, authenticated;
grant select on public.copytrade_providers_public to anon, authenticated;
grant select on public.copytrade_positions_public to anon, authenticated;
grant select on public.copytrade_leaderboard to anon, authenticated;
grant select on public.copytrade_telegram_bots_public to anon, authenticated;

-- ============================================================
-- CARA MENJALANKAN
-- ------------------------------------------------------------
-- 1) Di Supabase SQL editor, jalankan dulu supabase_admin_panel.sql
--    (butuh public.admins + public.is_admin()). Kalau sudah ada, lanjut.
-- 2) Jalankan file ini SATU KALI. File aman dijalankan berulang
--    (create table if not exists / create or replace function /
--     drop policy if exists sebelum create policy / drop trigger if exists).
-- 3) Kolom provider publish langsung tayang (keputusan 10). Suspend = efek instan
--    karena trigger copy_events_fanout berhenti membuat delivery (keputusan 14.5 default).
-- 4) Password/secret yang dibutuhkan Edge Function Telegram (Fase 4):
--      SUPABASE_URL                  - otomatis tersedia di Edge Function
--      SUPABASE_SERVICE_ROLE_KEY     - otomatis; dipakai untuk bypass RLS (service_role)
--      TG_TOKEN_KEY                  - kunci simetris pgp_sym_encrypt(token_bot, TG_TOKEN_KEY)
--      TG_WEBHOOK_BASE_URL           - https://<project>.supabase.co/functions/v1/tg
--      TG_SEND_SECRET                - secret internal untuk endpoint kirim/broadcast
--    URL webhook tiap provider: <TG_WEBHOOK_BASE_URL>/<telegram_bots.webhook_secret>
-- 5) PENTING: kolom telegram_bots.token_enc HANYA boleh diisi/diubah lewat Edge Function
--    (pgp_sym_encrypt), karena hanya service_role yang boleh menyentuh tabel itu.
--    Tabel telegram_bots sengaja TIDAK punya policy SELECT untuk user biasa, sehingga
--    token tidak mungkin terbaca dari browser. Yang boleh dipakai UI:
--      - view  public.copytrade_telegram_bots_public  (bot_username + status saja)
--      - RPC   public.telegram_status(provider_id)     (bot_username + status, tanpa token)
-- 6) Token EA: yang disimpan hanya sha256 hex di ea_tokens.token_hash. EA mengirim token
--    mentah di header x-ea-token; RPC EA (provider_publish_event / provider_sync_positions /
--    client_ack) memverifikasi hash itu dan hanya boleh menyentuh baris milik token tersebut.
-- 7) Broadcast notifikasi banyak follower: jalankan lewat pg_cron + Edge Function
--    (rate limit Telegram ~30 pesan/detik per bot, tangani 429 retry_after,
--     simpan kegagalan di telegram_bots.last_error) - bukan di dalam trigger DB.
-- ============================================================


-- ============================================================
-- 9) API BACA PUBLIK UNTUK HALAMAN WEB (§9)
-- ------------------------------------------------------------
-- Dipakai oleh halaman /copytrade dan /copytrade/provider/<slug>.
-- Fungsi di sini tidak membuka kolom baru: semuanya hanya MENYUSUN data yang
-- sudah aman dibaca publik (view §6 + provider_stats §7l). Idempotent.
-- Angka performa memakai satuan POIN (§7l provider_stats), bukan persen, karena
-- ukuran lot tiap klien berbeda - poin adalah metrik yang paling portabel.
-- ============================================================

-- 9a) Leaderboard (halaman publik /copytrade)
create or replace function public.copytrade_leaderboard()
returns table (
  slug text,
  display_name text,
  bio text,
  is_verified boolean,
  is_suspended boolean,
  followers bigint,
  trades bigint,
  winrate numeric,
  avg_rr numeric,
  total_points numeric,
  max_dd_points numeric,
  ea_online boolean,
  last_seen timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.slug,
         sp.display_name,
         sp.bio,
         sp.is_verified,
         sp.is_suspended,
         coalesce(f.followers, 0)::bigint as followers,
         coalesce(public.copytrade_num(ps.st ->> 'trades'), 0) as trades,
         public.copytrade_num(ps.st ->> 'winrate') as winrate,
         public.copytrade_num(ps.st ->> 'avg_rr') as avg_rr,
         public.copytrade_num(ps.st ->> 'total_points') as total_points,
         public.copytrade_num(ps.st ->> 'max_drawdown_points') as max_dd_points,
         (t.last_seen is not null and t.last_seen > now() - interval '15 minutes') as ea_online,
         t.last_seen
  from public.signal_providers sp
  left join (
    select cl.provider_id, count(*) as followers
    from public.copy_links cl
    where cl.status = 'active'
    group by cl.provider_id
  ) f on f.provider_id = sp.user_id
  -- satu panggilan provider_stats per provider (lateral), bukan per kolom
  left join lateral (select public.provider_stats(sp.slug) as st) ps on true
  -- terminal provider dianggap online kalau token PROVIDER/BOTH heartbeat < 15 menit
  left join lateral (
    select max(e.last_seen) as last_seen
    from public.ea_tokens e
    where e.active
      and e.client_id = sp.user_id
      and e.role in ('PROVIDER','BOTH')
  ) t on true
  where sp.is_active
  order by coalesce(f.followers, 0) desc, sp.created_at desc;
$$;

-- 9b) Halaman publik satu provider: profil + statistik + posisi terbuka + riwayat
create or replace function public.copytrade_provider_public(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prov public.signal_providers%rowtype;
  v_stats jsonb;
  v_last timestamptz;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  select * into v_prov
  from public.signal_providers sp
  where sp.slug = v_slug and sp.is_active;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Provider tidak ditemukan.');
  end if;

  v_stats := public.provider_stats(v_prov.slug);

  select max(e.last_seen) into v_last
  from public.ea_tokens e
  where e.active and e.client_id = v_prov.user_id and e.role in ('PROVIDER','BOTH');

  return jsonb_build_object(
    'ok', true,
    'provider', jsonb_build_object(
      'slug', v_prov.slug,
      'display_name', v_prov.display_name,
      'bio', v_prov.bio,
      'is_verified', v_prov.is_verified,
      'is_suspended', v_prov.is_suspended,
      'followers', (select count(*) from public.copy_links cl
                    where cl.provider_id = v_prov.user_id and cl.status = 'active'),
      'ea_online', (v_last is not null and v_last > now() - interval '15 minutes'),
      'last_seen', v_last,
      'trades', coalesce(public.copytrade_num(v_stats ->> 'trades'), 0),
      'winrate', public.copytrade_num(v_stats ->> 'winrate'),
      'avg_rr', public.copytrade_num(v_stats ->> 'avg_rr'),
      'total_points', public.copytrade_num(v_stats ->> 'total_points'),
      'max_dd_points', public.copytrade_num(v_stats ->> 'max_drawdown_points')
    ),
    'open_positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'symbol', p.symbol, 'side', p.side, 'volume', p.volume,
               'entry', p.entry, 'sl', p.sl, 'tp', p.tp, 'opened_at', p.opened_at
             ) order by p.opened_at desc nulls last)
      from public.provider_positions p
      where p.provider_id = v_prov.user_id and p.status = 'open'
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r.x order by r.closed_at desc nulls last)
      from (
        select p.closed_at,
               jsonb_build_object(
                 'symbol', p.symbol,
                 'side', p.side,
                 'volume', p.volume,
                 'entry', p.entry,
                 -- harga keluar hanya ada di payload event CLOSE (EA yang mengirim)
                 'exit', public.copytrade_price(e.payload ->> 'close_price'),
                 'closed_at', p.closed_at
               ) as x
        from public.provider_positions p
        left join lateral (
          select ev.payload
          from public.copy_events ev
          where ev.provider_position_id = p.id and ev.kind = 'CLOSE'
          order by ev.seq desc
          limit 1
        ) e on true
        where p.provider_id = v_prov.user_id and p.status = 'closed'
        order by p.closed_at desc nulls last
        limit 30
      ) r
    ), '[]'::jsonb)
  );
end $$;

-- 9c) Provider milik user yang sedang login (dipakai form "Register as provider")
create or replace function public.copytrade_my_provider()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'slug', x.slug,
           'is_verified', x.is_verified,
           'is_suspended', x.is_suspended
         )
  from (
    select sp.slug, sp.is_verified, sp.is_suspended
    from public.signal_providers sp
    where sp.user_id = auth.uid()
  ) x;
$$;

-- 9d) Laporan lewat slug (UI publik tidak pernah tahu uuid provider)
create or replace function public.report_provider_slug(p_slug text, p_reason text, p_detail text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider uuid;
begin
  select sp.user_id into v_provider
  from public.signal_providers sp
  where sp.slug = lower(btrim(coalesce(p_slug, '')));

  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'Provider tidak ditemukan.');
  end if;

  return public.report_provider(v_provider, p_reason, p_detail);
end $$;

-- grant untuk halaman publik web
grant execute on function public.copytrade_leaderboard() to anon, authenticated;
grant execute on function public.copytrade_provider_public(text) to anon, authenticated;
grant execute on function public.copytrade_my_provider() to authenticated;
grant execute on function public.report_provider_slug(text, text, text) to authenticated;


-- ============================================================
-- 10) JEMBATAN EA -> TABEL (akses langsung via PostgREST)
-- ------------------------------------------------------------
-- EA TIDAK memanggil RPC §7: ia POST/PATCH tabel langsung dengan header
-- x-ea-token (pola PRD §7.4). Supaya itu benar-benar bekerja, lima hal harus
-- disediakan server, dan kelimanya ada di bagian ini:
--   (1) copy_events.provider_ticket  - EA mengirim ticket, bukan uuid
--   (2) provider_id diisi dari token (BEFORE INSERT)
--   (3) provider_position_id diresolusi dari ticket (BEFORE INSERT)
--   (4) state provider_positions DITURUNKAN dari event (AFTER INSERT), supaya
--       jalan yang sama dipakai entah EA insert langsung atau lewat RPC
--   (5) policy tulis untuk peran anon/by-token: provider_positions insert+update,
--       ea_tokens update (heartbeat), copy_events select (return=representation)
-- Tanpa (4), rekonsiliasi klien (§6.4) akan mengira posisi provider masih
-- terbuka selamanya dan tidak pernah menutup exit yang terlewat. Idempotent.
-- ============================================================

-- 10a) Kolom ticket di copy_events (EA mengirimnya di body)
alter table public.copy_events add column if not exists provider_ticket bigint;
create index if not exists copy_events_ticket_idx on public.copy_events(provider_id, provider_ticket);

-- 10b1) Stempel provider_id dari token.
--       Trigger function TIDAK boleh diasumsikan dipakai satu tabel saja:
--       provider_positions/guard_events tidak punya kolom provider_position_id
--       atau provider_ticket, dan plpgsql menyelesaikan field `new.x` saat
--       statement dijalankan - jadi satu fungsi "shared" gagal di runtime
--       ("record new has no field ..."). Karena itu dipisah.
create or replace function public.copytrade_ea_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.provider_id is null then
    new.provider_id := public.ea_uid();
  end if;
  return new;
end $$;

-- 10b2) Khusus copy_events: tambahan resolusi provider_position_id dari ticket.
--       EA mengirim provider_ticket, bukan uuid posisi. Untuk event OPEN posisi
--       belum ada (dibuat oleh trigger AFTER di 10c), jadi hasilnya NULL dan
--       event berikutnya tetap bisa diresolusi dari ticket.
create or replace function public.copytrade_ea_stamp_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.provider_id is null then
    new.provider_id := public.ea_uid();
  end if;

  if new.provider_position_id is null and new.provider_ticket is not null then
    select p.id into new.provider_position_id
    from public.provider_positions p
    where p.provider_id = new.provider_id
      and p.provider_ticket = new.provider_ticket
    limit 1;
  end if;

  return new;
end $$;

do $$
declare
  t text;
begin
  -- tabel dengan provider_id saja
  foreach t in array array['provider_positions', 'guard_events'] loop
    execute format('drop trigger if exists %I_ea_stamp on public.%I', t, t);
    execute format('create trigger %I_ea_stamp before insert on public.%I '
                   'for each row execute function public.copytrade_ea_stamp()', t, t);
  end loop;
end $$;

drop trigger if exists copy_events_ea_stamp on public.copy_events;
create trigger copy_events_ea_stamp
  before insert on public.copy_events
  for each row execute function public.copytrade_ea_stamp_event();

-- 10c) AFTER INSERT: provider_positions diturunkan dari event.
--      Ini yang membuat snapshot EA + aliran event tetap konsisten, dan yang
--      membuat rekonsiliasi klien melihat status yang benar.
create or replace function public.copytrade_apply_event_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sl numeric := public.copytrade_price(new.payload ->> 'sl');
  v_tp numeric := public.copytrade_price(new.payload ->> 'tp');
  v_vol numeric := public.copytrade_num(new.payload ->> 'volume');
begin
  if new.kind = 'OPEN' then
    if new.provider_ticket is null then
      return new;
    end if;
    insert into public.provider_positions as pp (
      provider_id, provider_ticket, symbol, side, volume, entry, sl, tp, opened_at, status
    ) values (
      new.provider_id,
      new.provider_ticket,
      coalesce(new.payload ->> 'symbol', '?'),
      case when new.payload ->> 'side' = 'sell' then 'sell' else 'buy' end,
      coalesce(v_vol, 0),
      public.copytrade_price(new.payload ->> 'entry'),
      v_sl,
      v_tp,
      public.copytrade_ts(new.payload ->> 'opened_at'),
      'open'
    )
    on conflict (provider_id, provider_ticket) do update
      set symbol    = excluded.symbol,
          side      = excluded.side,
          volume    = excluded.volume,
          entry     = excluded.entry,
          sl        = excluded.sl,
          tp        = excluded.tp,
          opened_at = coalesce(pp.opened_at, excluded.opened_at),
          status    = 'open',
          closed_at = null,
          updated_at = now();

    -- backfill id posisi ke event OPEN (RETURNING PostgREST sudah lewat, tapi
    -- ini yang membuat join dashboard/recent konsisten)
    update public.copy_events
       set provider_position_id = (
         select p.id from public.provider_positions p
         where p.provider_id = new.provider_id and p.provider_ticket = new.provider_ticket
       )
     where id = new.id and provider_position_id is null;

  elsif new.kind in ('MODIFY_SL', 'MODIFY_TP') then
    update public.provider_positions
       set sl       = coalesce(v_sl, sl),
           tp       = coalesce(v_tp, tp),
           volume   = coalesce(v_vol, volume),
           updated_at = now()
     where id = new.provider_position_id;

  elsif new.kind = 'PARTIAL_CLOSE' then
    update public.provider_positions
       set volume   = coalesce(v_vol, volume),
           sl       = coalesce(v_sl, sl),
           tp       = coalesce(v_tp, tp),
           updated_at = now()
     where id = new.provider_position_id;

  elsif new.kind = 'CLOSE' then
    update public.provider_positions
       set status    = 'closed',
           closed_at = now(),
           volume    = coalesce(v_vol, volume),
           updated_at = now()
     where id = new.provider_position_id;

  elsif new.kind = 'CLOSE_ALL' then
    update public.provider_positions
       set status    = 'closed',
           closed_at = now(),
           updated_at = now()
     where provider_id = new.provider_id
       and status = 'open';
  end if;

  return new;
end $$;

drop trigger if exists copy_events_state on public.copy_events;
create trigger copy_events_state
  after insert on public.copy_events
  for each row execute function public.copytrade_apply_event_state();

-- 10d) Policy tulis untuk EA (peran anon bawaan anon key + x-ea-token)
drop policy if exists "provider_positions_ea_insert" on public.provider_positions;
create policy "provider_positions_ea_insert" on public.provider_positions
  for insert to anon, authenticated
  with check (public.ea_uid() is not null
              and public.ea_uid() = provider_id
              and coalesce(public.ea_role(), '') in ('PROVIDER','BOTH'));

drop policy if exists "provider_positions_ea_update" on public.provider_positions;
create policy "provider_positions_ea_update" on public.provider_positions
  for update to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = provider_id)
  with check (public.ea_uid() is not null and public.ea_uid() = provider_id);

-- return=representation pada POST copy_events: butuh policy SELECT untuk dirinya
drop policy if exists "copy_events_ea_read" on public.copy_events;
create policy "copy_events_ea_read" on public.copy_events
  for select to anon, authenticated
  using (public.ea_uid() is not null and public.ea_uid() = provider_id);

-- EA CLIENT membaca event lewat EMBED PostgREST
--   GET copy_deliveries?select=...,copy_events(id,kind,payload)
-- Embed menghormati RLS tabel yang di-embed: tanpa policy ini, objek copy_events
-- kembali null dan EA tidak tahu kind/payload apa yang harus dieksekusi.
drop policy if exists "copy_events_ea_read_client" on public.copy_events;
create policy "copy_events_ea_read_client" on public.copy_events
  for select to anon, authenticated
  using (public.ea_uid() is not null and exists (
    select 1 from public.copy_deliveries d
    where d.event_id = copy_events.id
      and d.client_id = public.ea_uid()
  ));

-- heartbeat EA: baca + update HANYA baris tokennya sendiri.
-- CATATAN PENTING: PostgreSQL menerapkan policy SELECT juga saat sebuah UPDATE
-- mencari barisnya - tabel yang cuma punya policy UPDATE akan menghasilkan
-- "UPDATE 0" tanpa error. Karena itu pasangan read+update di bawah ini wajib
-- ada berdua (copy_deliveries sudah punya keduanya, ea_tokens belum).
drop policy if exists "ea_tokens_ea_read" on public.ea_tokens;
create policy "ea_tokens_ea_read" on public.ea_tokens
  for select to anon, authenticated
  using (public.ea_token_id() is not null and id = public.ea_token_id());

drop policy if exists "ea_tokens_ea_update" on public.ea_tokens;
create policy "ea_tokens_ea_update" on public.ea_tokens
  for update to anon, authenticated
  using (public.ea_token_id() is not null and id = public.ea_token_id())
  with check (public.ea_token_id() is not null and id = public.ea_token_id());

-- 10f) KEDALUWARSA delivery ditandai SERVER, bukan EA.
--      Tanpa ini delivery 'pending' yang lewat expires_at tinggal selamanya, dan
--      saat EA client menyala belakangan entry LAMA itu ikut dieksekusi di harga
--      sekarang - kesalahan yang jauh lebih mahal daripada melewatkannya.
--      Pemicunya heartbeat EA client (UPDATE ea_tokens.last_seen), jadi penilaian
--      waktunya memakai jam server: tidak bergantung pada jam PC/VPS client.
create or replace function public.copytrade_expire_stale_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.copy_deliveries d
     set status      = 'expired',
         skip_reason = 'kedaluwarsa: sinyal sudah berumur ' ||
                       floor(extract(epoch from (now() - d.created_at)))::text ||
                       ' detik dan belum diambil EA di terminal client (entry tidak dikejar)'
   where d.client_id = new.client_id      -- client_id (pemilik token), BUKAN new.id (id baris token)
     and d.status = 'pending'
     and d.expires_at is not null
     and d.expires_at < now();
  return new;
end $$;

drop trigger if exists ea_tokens_expire_deliveries on public.ea_tokens;
create trigger ea_tokens_expire_deliveries
  after update of last_seen on public.ea_tokens
  for each row execute function public.copytrade_expire_stale_deliveries();

-- 10e) client_positions diturunkan dari ACK EA (PATCH copy_deliveries).
--      EA client menyimpan mapping-nya di berkas lokal (MQL5/Files); tabel ini
--      yang bikin dashboard web + client_copy_overview bisa menampilkan posisi
--      yang sedang dicopy tanpa membaca terminal client.
create or replace function public.copytrade_apply_ack_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_pp uuid;
  v_sym text;
  v_sl numeric;
  v_tp numeric;
  v_entry numeric;
begin
  if new.status <> 'executed' or coalesce(old.status, '') = 'executed' then
    return new;
  end if;

  select e.kind, e.provider_position_id, pp.symbol, pp.sl, pp.tp, pp.entry
    into v_kind, v_pp, v_sym, v_sl, v_tp, v_entry
  from public.copy_events e
  left join public.provider_positions pp on pp.id = e.provider_position_id
  where e.id = new.event_id;

  if v_kind is null then
    return new;
  end if;

  if v_kind = 'OPEN' then
    insert into public.client_positions as cp (
      client_id, provider_id, provider_position_id, client_ticket,
      symbol, lots, state, sl, tp, opened_at
    ) values (
      new.client_id, new.provider_id, v_pp, new.client_ticket,
      v_sym, new.lots, 'open', v_sl, v_tp, coalesce(new.executed_at, now())
    )
    on conflict do nothing;

  elsif v_kind in ('CLOSE', 'CLOSE_ALL') then
    update public.client_positions
       set state = 'closed', closed_at = coalesce(new.executed_at, now()), updated_at = now()
     where client_id = new.client_id
       and state = 'open'
       and (provider_position_id = v_pp
            or (v_kind = 'CLOSE_ALL' and provider_id = new.provider_id));

  elsif v_kind = 'PARTIAL_CLOSE' then
    update public.client_positions
       set lots = coalesce(new.lots, lots), updated_at = now()
     where client_id = new.client_id and provider_position_id = v_pp and state = 'open';

  else -- MODIFY_SL / MODIFY_TP
    update public.client_positions
       set sl = coalesce(v_sl, sl), tp = coalesce(v_tp, tp), updated_at = now()
     where client_id = new.client_id and provider_position_id = v_pp and state = 'open';
  end if;

  return new;
end $$;

drop trigger if exists copy_deliveries_ack_state on public.copy_deliveries;
create trigger copy_deliveries_ack_state
  after update on public.copy_deliveries
  for each row execute function public.copytrade_apply_ack_state();
