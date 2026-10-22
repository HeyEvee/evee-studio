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

-- ============================================================
-- Today's Virals: a shared feed every signed-in tester can see.
-- ============================================================
create table if not exists public.virals (
  id            uuid        primary key default gen_random_uuid(),
  added_by      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tiktok_url    text        not null check (char_length(tiktok_url) < 600),
  tiktok_id     text,                           -- the video's number from the link, used to stop duplicates
  caption       text,
  creator       text,
  creator_url   text,
  thumbnail_url text,
  product_name  text,
  category      text,
  gmv           numeric     check (gmv is null or gmv >= 0),
  views         numeric     check (views is null or views >= 0),
  commission_rate numeric   check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100)),
  video_path    text,                           -- uploaded file, deleted once Evee has watched it
  poster_path   text,                           -- a still frame for the feed card
  status        text        not null default 'uploading' check (status in ('uploading','watching','framing','ready','failed')),
  error         text,
  watch         jsonb,                          -- what Gemini saw and heard
  analysis      jsonb,                          -- the framework breakdown
  created_at    timestamptz not null default now()
);
create unique index if not exists virals_tiktok_id on public.virals (tiktok_id) where tiktok_id is not null;
create index if not exists virals_created on public.virals (created_at desc);

alter table public.virals enable row level security;
drop policy if exists "virals: signed-in read" on public.virals;
drop policy if exists "virals: insert own"     on public.virals;
drop policy if exists "virals: update own"     on public.virals;
drop policy if exists "virals: delete own"     on public.virals;
create policy "virals: signed-in read" on public.virals for select to authenticated using (true);
create policy "virals: insert own"     on public.virals for insert to authenticated with check (auth.uid() = added_by);
create policy "virals: update own"     on public.virals for update to authenticated using (auth.uid() = added_by) with check (auth.uid() = added_by);
create policy "virals: delete own"     on public.virals for delete to authenticated using (auth.uid() = added_by);

-- Private storage for dropped videos (max 50 MB) and their poster frames.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('virals', 'virals', false, 52428800, array['video/mp4','video/quicktime','video/webm','image/jpeg'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "virals bucket: upload own folder" on storage.objects;
drop policy if exists "virals bucket: signed-in read"    on storage.objects;
drop policy if exists "virals bucket: delete own folder" on storage.objects;
create policy "virals bucket: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'virals' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "virals bucket: signed-in read" on storage.objects for select to authenticated
  using (bucket_id = 'virals');
create policy "virals bucket: delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'virals' and (storage.foldername(name))[1] = auth.uid()::text);
