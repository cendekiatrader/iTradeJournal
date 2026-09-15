-- ============================================================
-- iTradeJournal — Mentor / Coach role (Fase 2)
--   * role "mentor" diberikan oleh admin
--   * linking murid <-> mentor (murid minta -> mentor approve; admin bisa
--     menyambungkan/mencabut langsung)
--   * catatan coach per trade + permintaan review mingguan
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_admin_panel.sql (is_admin())
-- ============================================================

-- 1) Role: mentors (allowlist, di-grant admin)
create table if not exists public.mentors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.mentors enable row level security;

drop policy if exists "mentors_read_self_or_admin" on public.mentors;
create policy "mentors_read_self_or_admin" on public.mentors
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.mentors;
create policy "admin_all" on public.mentors
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.mentors m where m.user_id = auth.uid());
$$;

-- 2) mentor_links (murid <-> mentor)
create table if not exists public.mentor_links (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',        -- pending | active | rejected | revoked
  requested_by text not null default 'student',  -- student | mentor | admin
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (mentor_id, student_id)
);

create index if not exists mentor_links_mentor_idx on public.mentor_links (mentor_id, status);
create index if not exists mentor_links_student_idx on public.mentor_links (student_id, status);

alter table public.mentor_links enable row level security;

drop policy if exists "mentor_links_read_involved" on public.mentor_links;
create policy "mentor_links_read_involved" on public.mentor_links
  for select using (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.mentor_links;
create policy "admin_all" on public.mentor_links
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Catatan coach per trade
create table if not exists public.trade_notes (
  id uuid primary key default gen_random_uuid(),
  trade_id text not null,
  student_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null default 'mentor',    -- mentor | admin
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists trade_notes_trade_idx on public.trade_notes (trade_id);
create index if not exists trade_notes_student_idx on public.trade_notes (student_id, read_at);

alter table public.trade_notes enable row level security;

drop policy if exists "trade_notes_read_involved" on public.trade_notes;
create policy "trade_notes_read_involved" on public.trade_notes
  for select using (student_id = auth.uid() or author_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.trade_notes;
create policy "admin_all" on public.trade_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- 4) Permintaan review mingguan (murid -> mentor)
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  note text,
  status text not null default 'open',           -- open | done
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists review_requests_mentor_idx on public.review_requests (mentor_id, status);

alter table public.review_requests enable row level security;

drop policy if exists "review_requests_read_involved" on public.review_requests;
create policy "review_requests_read_involved" on public.review_requests
  for select using (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.review_requests;
create policy "admin_all" on public.review_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- 5) RPC: murid meminta mentor (by email)
create or replace function public.request_mentor(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  m_id uuid;
  my_id uuid := auth.uid();
begin
  if my_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;
  select u.id into m_id
  from auth.users u
  join public.mentors mm on mm.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
  if m_id is null then
    return jsonb_build_object('ok', false, 'error', 'No mentor found with that email.');
  end if;
  if m_id = my_id then
    return jsonb_build_object('ok', false, 'error', 'You cannot request yourself.');
  end if;
  insert into public.mentor_links (mentor_id, student_id, status, requested_by)
  values (m_id, my_id, 'pending', 'student')
  on conflict (mentor_id, student_id) do update
    set status = case when public.mentor_links.status = 'active' then 'active' else 'pending' end,
        requested_by = 'student';
  return jsonb_build_object('ok', true);
end $$;

-- 6) RPC: mentor merespons permintaan
create or replace function public.respond_mentor_request(p_link_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.mentor_links
     set status = case when p_accept then 'active' else 'rejected' end,
         responded_at = now()
   where id = p_link_id
     and mentor_id = auth.uid()
     and status = 'pending';
  return found;
end $$;

-- 7) RPC: admin memberi / mencabut role mentor
create or replace function public.admin_set_mentor(p_user uuid, p_mentor boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  if p_mentor then
    insert into public.mentors (user_id) values (p_user) on conflict (user_id) do nothing;
  else
    delete from public.mentors where user_id = p_user;
    update public.mentor_links
       set status = 'revoked', responded_at = now()
     where mentor_id = p_user and status in ('active', 'pending');
  end if;
  return true;
end $$;

-- 8) RPC: admin menyambungkan / memutuskan murid <-> mentor langsung
create or replace function public.admin_link_mentor(p_student_email text, p_mentor_email text, p_active boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  s_id uuid;
  m_id uuid;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not admin.');
  end if;
  select id into s_id from auth.users where lower(email) = lower(trim(p_student_email)) limit 1;
  if s_id is null then
    return jsonb_build_object('ok', false, 'error', 'Student email not found.');
  end if;
  select u.id into m_id
  from auth.users u
  join public.mentors mm on mm.user_id = u.id
  where lower(u.email) = lower(trim(p_mentor_email))
  limit 1;
  if m_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mentor email not found (must be a mentor).');
  end if;
  if s_id = m_id then
    return jsonb_build_object('ok', false, 'error', 'Student and mentor cannot be the same account.');
  end if;
  insert into public.mentor_links (mentor_id, student_id, status, requested_by, responded_at)
  values (m_id, s_id, case when p_active then 'active' else 'revoked' end, 'admin', now())
  on conflict (mentor_id, student_id) do update
    set status = case when p_active then 'active' else 'revoked' end,
        requested_by = 'admin',
        responded_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- 9) RPC: ringkasan coaching untuk user yang login
create or replace function public.coaching_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  my_id uuid := auth.uid();
begin
  if my_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'is_mentor', exists (select 1 from public.mentors m where m.user_id = my_id),
    'as_mentor', coalesce((
      select jsonb_agg(jsonb_build_object('link_id', l.id, 'user_id', l.student_id, 'email', u.email::text, 'status', l.status, 'created_at', l.created_at) order by l.created_at desc)
      from public.mentor_links l join auth.users u on u.id = l.student_id
      where l.mentor_id = my_id and l.status in ('active', 'pending', 'rejected')
    ), '[]'::jsonb),
    'as_student', coalesce((
      select jsonb_agg(jsonb_build_object('link_id', l.id, 'user_id', l.mentor_id, 'email', u.email::text, 'status', l.status, 'created_at', l.created_at) order by l.created_at desc)
      from public.mentor_links l join auth.users u on u.id = l.mentor_id
      where l.student_id = my_id and l.status in ('active', 'pending', 'rejected', 'revoked')
    ), '[]'::jsonb),
    'review_requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'user_id', r.student_id, 'email', u.email::text, 'note', r.note, 'created_at', r.created_at) order by r.created_at desc)
      from public.review_requests r join auth.users u on u.id = r.student_id
      where r.mentor_id = my_id and r.status = 'open'
    ), '[]'::jsonb),
    'my_open_reviews', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'user_id', r.mentor_id, 'email', u.email::text, 'note', r.note, 'created_at', r.created_at, 'status', r.status) order by r.created_at desc)
      from public.review_requests r join auth.users u on u.id = r.mentor_id
      where r.student_id = my_id and r.status = 'open'
    ), '[]'::jsonb)
  );
end $$;

-- 10) RPC: data murid untuk mentor (read-only) + catatan
create or replace function public.mentor_student_data(p_student uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  allowed boolean;
begin
  if auth.uid() is null then
    return null;
  end if;
  allowed := public.is_admin() or exists (
    select 1 from public.mentor_links l
    where l.mentor_id = auth.uid() and l.student_id = p_student and l.status = 'active'
  );
  if not allowed then
    return null;
  end if;
  return jsonb_build_object(
    'email', (select u.email::text from auth.users u where u.id = p_student),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'broker', a.broker, 'currency', a.currency, 'status', a.status, 'initial_balance', a.initial_balance, 'current_balance', a.current_balance) order by a.created_at)
      from public.accounts a where a.user_id = p_student
    ), '[]'::jsonb),
    'trades', coalesce((
      select jsonb_agg(x order by x->>'entry_date' desc)
      from (
        select jsonb_build_object(
          'id', t.id::text, 'symbol', t.symbol, 'direction', t.direction, 'entry_date', t.entry_date,
          'exit_date', t.exit_date, 'pnl', t.pnl, 'status', t.status, 'setup', t.setup, 'session', t.session,
          'rules_followed', t.rules_followed, 'deleted_at', t.deleted_at
        ) as x
        from public.trades t
        where t.user_id = p_student
        order by t.entry_date desc
        limit 300
      ) sub
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'trade_id', n.trade_id, 'body', n.body, 'author_role', n.author_role, 'created_at', n.created_at) order by n.created_at desc)
      from public.trade_notes n where n.student_id = p_student
    ), '[]'::jsonb)
  );
end $$;

-- 11) RPC: mentor/admin menulis catatan coach pada trade
create or replace function public.add_trade_note(p_trade_id text, p_body text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  owner_id uuid;
  is_admin_call boolean := public.is_admin();
begin
  if auth.uid() is null or coalesce(trim(p_body), '') = '' then
    return false;
  end if;
  select t.user_id into owner_id from public.trades t where t.id::text = p_trade_id limit 1;
  if owner_id is null then
    return false;
  end if;
  if not is_admin_call and not exists (
    select 1 from public.mentor_links l
    where l.mentor_id = auth.uid() and l.student_id = owner_id and l.status = 'active'
  ) then
    return false;
  end if;
  insert into public.trade_notes (trade_id, student_id, author_id, author_role, body)
  values (p_trade_id, owner_id, auth.uid(), case when is_admin_call then 'admin' else 'mentor' end, trim(p_body));
  return true;
end $$;

-- 12) RPC: murid menandai catatan sudah dibaca
create or replace function public.mark_notes_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.trade_notes
     set read_at = now()
   where student_id = auth.uid() and read_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.mark_note_read(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trade_notes
     set read_at = now()
   where id = p_id and student_id = auth.uid() and read_at is null;
  return found;
end $$;

-- 13) RPC: murid meminta review mingguan ke mentor
create or replace function public.request_review(p_mentor uuid, p_note text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if not exists (
    select 1 from public.mentor_links l
    where l.mentor_id = p_mentor and l.student_id = auth.uid() and l.status = 'active'
  ) then
    return false;
  end if;
  insert into public.review_requests (mentor_id, student_id, note)
  values (p_mentor, auth.uid(), nullif(trim(p_note), ''));
  return true;
end $$;

-- 14) RPC: mentor menandai permintaan review selesai
create or replace function public.resolve_review_request(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.review_requests
     set status = 'done', resolved_at = now()
   where id = p_id and mentor_id = auth.uid() and status = 'open';
  return found;
end $$;

-- 15) RPC: admin melihat status mentor + links seorang user
create or replace function public.admin_user_coaching(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    return null;
  end if;
  return jsonb_build_object(
    'is_mentor', exists (select 1 from public.mentors m where m.user_id = p_user),
    'as_mentor', coalesce((
      select jsonb_agg(jsonb_build_object('link_id', l.id, 'user_id', l.student_id, 'email', u.email::text, 'status', l.status) order by l.created_at desc)
      from public.mentor_links l join auth.users u on u.id = l.student_id
      where l.mentor_id = p_user
    ), '[]'::jsonb),
    'as_student', coalesce((
      select jsonb_agg(jsonb_build_object('link_id', l.id, 'user_id', l.mentor_id, 'email', u.email::text, 'status', l.status) order by l.created_at desc)
      from public.mentor_links l join auth.users u on u.id = l.mentor_id
      where l.student_id = p_user
    ), '[]'::jsonb)
  );
end $$;

-- Grants
grant execute on function public.is_mentor() to authenticated;
grant execute on function public.request_mentor(text) to authenticated;
grant execute on function public.respond_mentor_request(uuid, boolean) to authenticated;
grant execute on function public.admin_set_mentor(uuid, boolean) to authenticated;
grant execute on function public.admin_link_mentor(text, text, boolean) to authenticated;
grant execute on function public.coaching_overview() to authenticated;
grant execute on function public.mentor_student_data(uuid) to authenticated;
grant execute on function public.add_trade_note(text, text) to authenticated;
grant execute on function public.mark_notes_read() to authenticated;
grant execute on function public.mark_note_read(uuid) to authenticated;
grant execute on function public.request_review(uuid, text) to authenticated;
grant execute on function public.resolve_review_request(uuid) to authenticated;
grant execute on function public.admin_user_coaching(uuid) to authenticated;
