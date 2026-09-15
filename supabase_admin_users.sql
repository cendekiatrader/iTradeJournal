-- ============================================================
-- iTradeJournal — Admin: manage ALL users
--   * per-user drill-down (accounts + recent trades)
--   * suspend / unsuspend a user account
--   * delete a user and all their data (typed confirmation in the UI)
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_admin_panel.sql (is_admin() must exist)
-- ============================================================

-- 1) user_flags — suspension state per user
create table if not exists public.user_flags (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suspended boolean not null default false,
  suspended_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_flags enable row level security;

drop policy if exists "user_flags_read_own" on public.user_flags;
create policy "user_flags_read_own" on public.user_flags
  for select using (user_id = auth.uid());

drop policy if exists "admin_all" on public.user_flags;
create policy "admin_all" on public.user_flags
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Admin: everything about one user (counts, accounts, recent trades, profile, suspension)
create or replace function public.admin_user_detail(target uuid)
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
      'email', (select u.email::text from auth.users u where u.id = target),
      'created_at', (select u.created_at from auth.users u where u.id = target),
      'last_sign_in_at', (select u.last_sign_in_at from auth.users u where u.id = target)
    );
  exception when others then null; end;

  begin
    out := out || jsonb_build_object(
      'accounts_count', (select count(*) from public.accounts a where a.user_id = target),
      'trades_count', (select count(*) from public.trades t where t.user_id = target),
      'trades_trashed', (select count(*) from public.trades t where t.user_id = target and t.deleted_at is not null)
    );
  exception when others then null; end;

  begin
    out := out || jsonb_build_object(
      'suspended', coalesce((select f.suspended from public.user_flags f where f.user_id = target), false)
    );
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('profile', (
      select jsonb_build_object('username', p.username, 'display_name', p.display_name, 'is_public', p.is_public)
      from public.profiles p where p.id = target
    ));
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'broker', a.broker,
        'currency', a.currency,
        'type', a.type,
        'status', a.status,
        'initial_balance', a.initial_balance,
        'current_balance', a.current_balance,
        'created_at', a.created_at
      ) order by a.created_at desc)
      from public.accounts a where a.user_id = target
    ), '[]'::jsonb));
  exception when others then null; end;

  begin
    out := out || jsonb_build_object('trades', coalesce((
      select jsonb_agg(x order by x->>'entry_date' desc)
      from (
        select jsonb_build_object(
          'id', t.id,
          'symbol', t.symbol,
          'direction', t.direction,
          'entry_date', t.entry_date,
          'exit_date', t.exit_date,
          'pnl', t.pnl,
          'status', t.status,
          'setup', t.setup,
          'session', t.session,
          'deleted_at', t.deleted_at
        ) as x
        from public.trades t
        where t.user_id = target
        order by t.entry_date desc
        limit 60
      ) sub
    ), '[]'::jsonb));
  exception when others then null; end;

  return out;
end $$;

-- 3) Admin: delete a user and all their data (cannot delete yourself)
create or replace function public.admin_delete_user(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  if target = auth.uid() then
    return false;
  end if;

  begin delete from public.trades where user_id = target; exception when others then null; end;
  begin delete from public.accounts where user_id = target; exception when others then null; end;
  begin delete from public.withdrawals where user_id = target; exception when others then null; end;
  begin delete from public.playbooks where user_id = target; exception when others then null; end;
  begin delete from public.user_settings where user_id = target; exception when others then null; end;
  begin delete from public.user_flags where user_id = target; exception when others then null; end;
  begin delete from public.profiles where id = target; exception when others then null; end;
  delete from auth.users where id = target;
  return true;
end $$;

grant execute on function public.admin_user_detail(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
