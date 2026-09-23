-- ============================================================
-- iTradeJournal — Blog (public articles, admin-only publishing)
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Prerequisite: supabase_admin_panel.sql (defines public.is_admin()).
--
-- Access model:
--   * anyone (anon) can READ posts with status = 'published'
--   * only members of public.admins can INSERT / UPDATE / DELETE
-- ============================================================

create extension if not exists "pgcrypto";

-- 1) Posts
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  views integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent column adds (in case an earlier draft of the table exists)
alter table public.blog_posts add column if not exists excerpt text;
alter table public.blog_posts add column if not exists content text not null default '';
alter table public.blog_posts add column if not exists cover_image_url text;
alter table public.blog_posts add column if not exists tags text[] not null default '{}';
alter table public.blog_posts add column if not exists status text not null default 'draft';
alter table public.blog_posts add column if not exists author_id uuid;
alter table public.blog_posts add column if not exists author_name text;
alter table public.blog_posts add column if not exists views integer not null default 0;
alter table public.blog_posts add column if not exists published_at timestamptz;
alter table public.blog_posts add column if not exists created_at timestamptz not null default now();
alter table public.blog_posts add column if not exists updated_at timestamptz not null default now();

create index if not exists blog_posts_feed_idx on public.blog_posts (status, published_at desc nulls last);
create index if not exists blog_posts_tags_idx on public.blog_posts using gin (tags);
create index if not exists blog_posts_updated_idx on public.blog_posts (updated_at desc);

-- 2) Row Level Security
alter table public.blog_posts enable row level security;

-- Public read: only live posts. Drafts are invisible to everyone but admins.
drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read" on public.blog_posts
  for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

-- Write: admins only (this is what stops a normal user from posting an article).
drop policy if exists "blog_posts_admin_write" on public.blog_posts;
create policy "blog_posts_admin_write" on public.blog_posts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) Keep updated_at fresh
create or replace function public.blog_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_touch_updated_at();

-- 4) View counter (public, no auth needed — used by the blog page)
create or replace function public.blog_increment_views(p_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  update public.blog_posts
     set views = views + 1
   where slug = p_slug
     and status = 'published'
  returning views into v;

  return coalesce(v, 0);
end $$;

grant execute on function public.blog_increment_views(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- 5) Cover images / inline images uploaded from the admin editor
insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read on blog-media" on storage.objects;
drop policy if exists "Admins can upload blog media" on storage.objects;
drop policy if exists "Admins can delete blog media" on storage.objects;

create policy "Public read on blog-media" on storage.objects
  for select using (bucket_id = 'blog-media');

create policy "Admins can upload blog media" on storage.objects
  for insert to authenticated with check (bucket_id = 'blog-media' and public.is_admin());

create policy "Admins can delete blog media" on storage.objects
  for delete to authenticated using (bucket_id = 'blog-media' and public.is_admin());

-- 6) Promote your account to admin (if not done yet) — EDIT THE EMAIL:
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;
