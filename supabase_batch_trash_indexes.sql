-- ============================================================
-- iTradeJournal — Trash (soft delete), DB indexes, review rate limit
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- 1) Soft delete for trades (Trash keeps deleted trades for 30 days)
alter table public.trades
  add column if not exists deleted_at timestamptz;

create index if not exists trades_deleted_at_idx on public.trades (deleted_at);

-- 2) Performance indexes
create index if not exists trades_user_idx on public.trades (user_id);
create index if not exists trades_account_entry_idx on public.trades (account_id, entry_date desc);
create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists withdrawals_account_idx on public.withdrawals (account_id);

-- 3) Rate limit review comments (max 10 per minute per review link)
create or replace function public.review_comments_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.review_comments
    where session_token = new.session_token
      and created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'rate limit exceeded: too many comments for this review link';
  end if;
  return new;
end $$;

drop trigger if exists review_comments_rate_limit_trg on public.review_comments;
create trigger review_comments_rate_limit_trg
  before insert on public.review_comments
  for each row execute function public.review_comments_rate_limit();
