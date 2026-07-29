-- Notevoro schema — idempotent. Paste into Supabase SQL Editor and Run.
create extension if not exists pgcrypto;

-- =========================
-- TABLES
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  grade text,
  curriculum text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.study_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  grade text,
  curriculum text,
  notes_md text not null default '',
  flashcards jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.atlas_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  grade text,
  curriculum text,
  lesson jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{"concept_idx":0,"step_idx":0,"answers":{},"completed":false}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default 'violet',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled',
  content_html text not null default '',
  content_text text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  theme text default 'violet',
  slides jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text default 'reminder',
  event_date date not null,
  event_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text default 'medium',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  duration_minutes int not null default 30,
  questions jsonb not null default '[]'::jsonb,
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- TRIGGERS
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_chat_owner(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.chats where id = p_chat_id and user_id = auth.uid());
$$;

-- =========================
-- RLS ENABLE
-- =========================
alter table public.profiles          enable row level security;
alter table public.chats             enable row level security;
alter table public.messages          enable row level security;
alter table public.study_packs       enable row level security;
alter table public.atlas_sessions    enable row level security;
alter table public.folders           enable row level security;
alter table public.notes             enable row level security;
alter table public.research_reports  enable row level security;
alter table public.presentations     enable row level security;
alter table public.calendar_events   enable row level security;
alter table public.flashcard_sets    enable row level security;
alter table public.quiz_sets         enable row level security;
alter table public.practice_tests    enable row level security;

-- =========================
-- RLS POLICIES (explicit per table)
-- =========================

-- profiles (keyed by id = auth.uid())
drop policy if exists "profile_own_all" on public.profiles;
create policy "profile_own_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- chats
drop policy if exists "chats_own_all" on public.chats;
create policy "chats_own_all" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages (keyed by chat ownership)
drop policy if exists "messages_select_own_chat" on public.messages;
create policy "messages_select_own_chat" on public.messages
  for select using (public.is_chat_owner(chat_id));
drop policy if exists "messages_insert_own_chat" on public.messages;
create policy "messages_insert_own_chat" on public.messages
  for insert with check (public.is_chat_owner(chat_id) and auth.uid() = user_id);
drop policy if exists "messages_delete_own_chat" on public.messages;
create policy "messages_delete_own_chat" on public.messages
  for delete using (public.is_chat_owner(chat_id));

-- study_packs
drop policy if exists "study_packs_own_all" on public.study_packs;
create policy "study_packs_own_all" on public.study_packs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- atlas_sessions
drop policy if exists "atlas_sessions_own_all" on public.atlas_sessions;
create policy "atlas_sessions_own_all" on public.atlas_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- folders
drop policy if exists "folders_own_all" on public.folders;
create policy "folders_own_all" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
drop policy if exists "notes_own_all" on public.notes;
create policy "notes_own_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- research_reports
drop policy if exists "research_reports_own_all" on public.research_reports;
create policy "research_reports_own_all" on public.research_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- presentations
drop policy if exists "presentations_own_all" on public.presentations;
create policy "presentations_own_all" on public.presentations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- calendar_events
drop policy if exists "calendar_events_own_all" on public.calendar_events;
create policy "calendar_events_own_all" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- flashcard_sets
drop policy if exists "flashcard_sets_own_all" on public.flashcard_sets;
create policy "flashcard_sets_own_all" on public.flashcard_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quiz_sets
drop policy if exists "quiz_sets_own_all" on public.quiz_sets;
create policy "quiz_sets_own_all" on public.quiz_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- practice_tests
drop policy if exists "practice_tests_own_all" on public.practice_tests;
create policy "practice_tests_own_all" on public.practice_tests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_chats_user            on public.chats(user_id, updated_at desc);
create index if not exists idx_messages_chat         on public.messages(chat_id, created_at asc);
create index if not exists idx_study_packs_user      on public.study_packs(user_id, updated_at desc);
create index if not exists idx_atlas_user            on public.atlas_sessions(user_id, updated_at desc);
create index if not exists idx_notes_user            on public.notes(user_id, updated_at desc);
create index if not exists idx_notes_folder          on public.notes(folder_id);
create index if not exists idx_research_user         on public.research_reports(user_id, updated_at desc);
create index if not exists idx_presentations_user    on public.presentations(user_id, updated_at desc);
create index if not exists idx_calendar_user_date    on public.calendar_events(user_id, event_date);
create index if not exists idx_flashcard_sets_user   on public.flashcard_sets(user_id, updated_at desc);
create index if not exists idx_quiz_sets_user        on public.quiz_sets(user_id, updated_at desc);
create index if not exists idx_practice_tests_user   on public.practice_tests(user_id, created_at desc);
