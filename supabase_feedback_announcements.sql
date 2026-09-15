-- ============================================================
-- iTradeJournal — Feedback, Announcements & Admin Analytics
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_admin_panel.sql (is_admin())
-- ============================================================

-- 1) User feedback (bug reports / ideas) — users insert their own, admin reads all
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null default 'other',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (user_id = auth.uid());

drop policy if exists "feedback_read_own" on public.feedback;
create policy "feedback_read_own" on public.feedback
  for select using (user_id = auth.uid());

drop policy if exists "admin_all" on public.feedback;
create policy "admin_all" on public.feedback
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Announcements — admin publishes, everyone signed-in reads the active ones
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_read_active" on public.announcements;
create policy "announcements_read_active" on public.announcements
  for select using (active or public.is_admin());

drop policy if exists "admin_all" on public.announcements;
create policy "admin_all" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Admin analytics: activity, retention (7/30d), 30-day trends, top users
create or replace function public.admin_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  out jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    return null;
  end if;

  begin
    out := out || jsonb_build_object(
      'total_users', (select count(*) from auth.users),
      'active_7d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '7 days'),
      'active_30d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '30 days'),
      'dormant', (select count(*) from auth.users u where u.last_sign_in_at is null or u.last_sign_in_at <= now() - interval '30 days')
    );
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('signups_30d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'count', coalesce(s.c, 0)) order by d.day), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') as d(day)
      left join (
        select created_at::date as day, count(*) as c
        from auth.users
        where created_at >= current_date - 30
        group by 1
      ) s on s.day = d.day::date
    ));
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('trades_30d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'count', coalesce(s.c, 0)) order by d.day), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') as d(day)
      left join (
        select (entry_date::timestamptz)::date as day, count(*) as c
        from public.trades
        where entry_date::timestamptz >= current_date - 30
        group by 1
      ) s on s.day = d.day::date
    ));
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('top_users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', t.user_id,
        'email', (select u.email::text from auth.users u where u.id = t.user_id),
        'trades', t.c
      ) order by t.c desc), '[]'::jsonb)
      from (
        select user_id, count(*) as c
        from public.trades
        where user_id is not null
        group by user_id
        order by c desc
        limit 8
      ) t
    ));
  exception when others then null; end;

  return out;
end $$;

grant execute on function public.admin_analytics() to authenticated;
