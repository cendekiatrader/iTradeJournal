-- ============================================================
-- iTradeJournal — Security hardening & settings table migration
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Backfill legacy rows that predate multi-user (user_id IS NULL)
--    Assigns them to your earliest auth user. If you have more than
--    one user, replace the subquery with your own UUID, e.g.
--      set user_id = '00000000-0000-0000-0000-000000000000'
-- ------------------------------------------------------------
update public.accounts
   set user_id = (select id from auth.users order by created_at asc limit 1)
 where user_id is null;

update public.trades
   set user_id = (select id from auth.users order by created_at asc limit 1)
 where user_id is null;

update public.withdrawals
   set user_id = (select id from auth.users order by created_at asc limit 1)
 where user_id is null;

-- ------------------------------------------------------------
-- 2) Tighten RLS: remove the "user_id IS NULL" leg that let anyone
--    (including anonymous visitors) read/write ownerless legacy rows.
-- ------------------------------------------------------------
drop policy if exists "Users can access own accounts" on public.accounts;
create policy "Users can access own accounts" on public.accounts
  for all
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = accounts.user_id and p.is_public = true)
  )
  with check (auth.uid() = user_id);

drop policy if exists "Users can access own trades" on public.trades;
create policy "Users can access own trades" on public.trades
  for all
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = trades.user_id and p.is_public = true)
  )
  with check (auth.uid() = user_id);

drop policy if exists "Users can access own withdrawals" on public.withdrawals;
create policy "Users can access own withdrawals" on public.withdrawals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) Review comment abuse guard (length cap)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'review_comments_body_len'
  ) then
    alter table public.review_comments
      add constraint review_comments_body_len check (char_length(body) <= 5000);
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) User settings table (replaces auth.user_metadata for
--    setup_queue / dashboard_cards / workspace_config / custom_fields)
--    Keeps settings out of the auth JWT (metadata is embedded in the
--    access token and can bloat/break requests once it grows).
-- ------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  setup_queue jsonb not null default '[]'::jsonb,
  dashboard_cards jsonb,
  workspace_config jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_own" on public.user_settings;
create policy "user_settings_own" on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
