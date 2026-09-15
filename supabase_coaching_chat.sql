-- ============================================================
-- iTradeJournal — Coaching Chat
--   * chat 2 arah privat mentor <-> murid (hanya pasangan + admin)
--   * broadcast 1 arah: HANYA mentor yang bisa kirim, semua member bisa baca
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_coaching.sql
-- ============================================================

-- 1) Chat 2 arah (privat per pasangan mentor-murid)
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.mentor_links(id) on delete cascade,
  mentor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists coach_messages_link_idx on public.coach_messages (link_id, created_at);
create index if not exists coach_messages_mentor_unread_idx on public.coach_messages (mentor_id, read_at);
create index if not exists coach_messages_student_unread_idx on public.coach_messages (student_id, read_at);

alter table public.coach_messages enable row level security;

drop policy if exists "coach_messages_read_pair" on public.coach_messages;
create policy "coach_messages_read_pair" on public.coach_messages
  for select using (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.coach_messages;
create policy "admin_all" on public.coach_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Broadcast 1 arah (hanya mentor/admin yang posting; semua member bisa baca)
create table if not exists public.mentor_broadcasts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists mentor_broadcasts_created_idx on public.mentor_broadcasts (created_at desc);

alter table public.mentor_broadcasts enable row level security;

drop policy if exists "broadcasts_read_members" on public.mentor_broadcasts;
create policy "broadcasts_read_members" on public.mentor_broadcasts
  for select using (auth.uid() is not null or public.is_admin());

drop policy if exists "broadcasts_delete_author" on public.mentor_broadcasts;
create policy "broadcasts_delete_author" on public.mentor_broadcasts
  for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "admin_all" on public.mentor_broadcasts;
create policy "admin_all" on public.mentor_broadcasts
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) RPC: kirim pesan chat (harus salah satu pihak dari link yang aktif)
create or replace function public.send_coach_message(p_link_id uuid, p_body text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  l record;
begin
  if auth.uid() is null or coalesce(trim(p_body), '') = '' then
    return false;
  end if;
  select * into l from public.mentor_links where id = p_link_id;
  if not found or l.status <> 'active' then
    return false;
  end if;
  if auth.uid() <> l.mentor_id and auth.uid() <> l.student_id then
    return false;
  end if;
  insert into public.coach_messages (link_id, mentor_id, student_id, sender_id, body)
  values (p_link_id, l.mentor_id, l.student_id, auth.uid(), left(trim(p_body), 2000));
  return true;
end $$;

-- 4) RPC: ambil pesan chat (validasi keanggotaan; riwayat tetap ada walau link revoked)
create or replace function public.fetch_coach_messages(p_link_id uuid, p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  l record;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into l from public.mentor_links where id = p_link_id;
  if not found then
    return null;
  end if;
  if auth.uid() <> l.mentor_id and auth.uid() <> l.student_id and not public.is_admin() then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'link_id', m.link_id, 'sender_id', m.sender_id,
      'body', m.body, 'created_at', m.created_at, 'read_at', m.read_at
    ) order by m.created_at)
    from (
      select * from public.coach_messages
      where link_id = p_link_id
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 200), 500))
    ) m
  ), '[]'::jsonb);
end $$;

-- 5) RPC: tandai pesan dari lawan bicara sudah dibaca
create or replace function public.mark_coach_messages_read(p_link_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.coach_messages
     set read_at = now()
   where link_id = p_link_id
     and sender_id <> auth.uid()
     and read_at is null
     and (mentor_id = auth.uid() or student_id = auth.uid());
  get diagnostics n = row_count;
  return n;
end $$;

-- 6) RPC: jumlah pesan belum dibaca per link (untuk badge)
create or replace function public.coach_unread_by_link()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '{}'::jsonb;
  end if;
  return coalesce((
    select jsonb_object_agg(t.link_id::text, t.cnt)
    from (
      select link_id, count(*) as cnt
      from public.coach_messages
      where (mentor_id = auth.uid() or student_id = auth.uid())
        and sender_id <> auth.uid()
        and read_at is null
      group by link_id
    ) t
  ), '{}'::jsonb);
end $$;

-- 7) RPC: posting broadcast (hanya mentor/admin)
create or replace function public.post_mentor_broadcast(p_body text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or coalesce(trim(p_body), '') = '' then
    return false;
  end if;
  if not (public.is_mentor() or public.is_admin()) then
    return false;
  end if;
  insert into public.mentor_broadcasts (author_id, author_email, body)
  values (
    auth.uid(),
    (select u.email::text from auth.users u where u.id = auth.uid()),
    left(trim(p_body), 2000)
  );
  return true;
end $$;

-- Grants
grant execute on function public.send_coach_message(uuid, text) to authenticated;
grant execute on function public.fetch_coach_messages(uuid, integer) to authenticated;
grant execute on function public.mark_coach_messages_read(uuid) to authenticated;
grant execute on function public.coach_unread_by_link() to authenticated;
grant execute on function public.post_mentor_broadcast(text) to authenticated;
