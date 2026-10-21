-- Margo database. Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- Every tester's data lives in "docs": one row per document, private to its owner.
--   id = 'profile'      → name + creator profile
--   id = 'studio'       → the Studio draft in progress
--   id = 'b-YYYY-MM-DD' → a daily brief
--   id = 's-<id>'       → a saved script (with its results)
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  id         text        not null check (char_length(id) between 1 and 80),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists docs_user_updated on public.docs (user_id, updated_at desc);

alter table public.docs enable row level security;

drop policy if exists "docs: read own"   on public.docs;
drop policy if exists "docs: insert own" on public.docs;
drop policy if exists "docs: update own" on public.docs;
drop policy if exists "docs: delete own" on public.docs;
create policy "docs: read own"   on public.docs for select using (auth.uid() = user_id);
create policy "docs: insert own" on public.docs for insert with check (auth.uid() = user_id);
create policy "docs: update own" on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "docs: delete own" on public.docs for delete using (auth.uid() = user_id);

-- Every Margo AI request is logged here so each tester has a daily limit.
-- Testers can add and read their own rows but never change or delete them.
create table if not exists public.ai_calls (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  action     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_user_time on public.ai_calls (user_id, created_at desc);

alter table public.ai_calls enable row level security;

drop policy if exists "ai_calls: read own"   on public.ai_calls;
drop policy if exists "ai_calls: insert own" on public.ai_calls;
create policy "ai_calls: read own"   on public.ai_calls for select using (auth.uid() = user_id);
create policy "ai_calls: insert own" on public.ai_calls for insert with check (auth.uid() = user_id);
