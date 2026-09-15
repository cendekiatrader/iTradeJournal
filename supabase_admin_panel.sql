-- ============================================================
-- iTradeJournal — Admin Panel (allowlist + RLS)
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisites (run first if not yet): supabase_security_settings.sql,
--   supabase_review_schema.sql, supabase_batch_trash_indexes.sql
-- ============================================================

-- 1) Admin allowlist
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admins_read_self" on public.admins;
create policy "admins_read_self" on public.admins
  for select using (user_id = auth.uid());

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- 2) Admin access policies on content tables (select/insert/update/delete)
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','trades','withdrawals','playbooks','user_settings',
    'profiles','review_sessions','review_comments'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop policy if exists "admin_all" on public.%I', t);
      execute format(
        'create policy "admin_all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t
      );
    end if;
  end loop;
end $$;

-- 3) Admin statistics (jsonb; sections guarded so missing tables/columns are tolerated)
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  s jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    return null;
  end if;

  begin
    s := s || jsonb_build_object(
      'users', (select count(*) from auth.users),
      'signups_7d', (select count(*) from auth.users u where u.created_at > now() - interval '7 days')
    );
  exception when others then null; end;

  begin
    s := s || jsonb_build_object(
      'accounts', (select count(*) from public.accounts),
      'trades', (select count(*) from public.trades)
    );
  exception when others then null; end;

  begin
    s := s || jsonb_build_object(
      'trashed', (select count(*) from public.trades t where t.deleted_at is not null)
    );
  exception when others then null; end;

  begin
    s := s || jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'public_profiles', (select count(*) from public.profiles p where p.is_public)
    );
  exception when others then null; end;

  begin
    s := s || jsonb_build_object('review_sessions', (select count(*) from public.review_sessions));
  exception when others then null; end;

  begin
    s := s || jsonb_build_object('comments', (select count(*) from public.review_comments));
  exception when others then null; end;

  begin
    s := s || jsonb_build_object('settings_rows', (select count(*) from public.user_settings));
  exception when others then null; end;

  return s;
end $$;

-- 4) User list (auth.users + per-user counts)
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  accounts_count bigint,
  trades_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  return query
    select u.id,
           u.email::text,
           u.created_at,
           u.last_sign_in_at,
           (select count(*) from public.accounts a where a.user_id = u.id)::bigint,
           (select count(*) from public.trades t where t.user_id = u.id)::bigint
    from auth.users u
    order by u.created_at desc
    limit 300;
end $$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;

-- 5) Promote your account to admin — EDIT THE EMAIL, then run:
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;
