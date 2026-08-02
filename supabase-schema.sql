-- Notevoro schema — FULL RESET VERSION
-- WARNING: This will DROP and RECREATE all tables, policies, indexes, and functions
-- Use only for development setup or when you need to completely reset the database schema
-- For production, use migrations instead
create extension if not exists pgcrypto;

-- =========================
-- DROP EXISTING OBJECTS (for clean setup)
-- =========================
-- Drop tables first (CASCADE will handle dependencies)
drop table if exists public.usage cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.practice_tests cascade;
drop table if exists public.quiz_sets cascade;
drop table if exists public.flashcard_sets cascade;
drop table if exists public.calendar_events cascade;
drop table if exists public.presentations cascade;
drop table if exists public.research_reports cascade;
drop table if exists public.notes cascade;
drop table if exists public.folders cascade;
drop table if exists public.atlas_sessions cascade;
drop table if exists public.study_packs cascade;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.profiles cascade;
drop table if exists public.chat_uploads cascade;
drop table if exists public.chat_context cascade;
drop table if exists public.chat_memories cascade;
drop table if exists public.chat_images cascade;
drop table if exists public.chat_web_results cascade;
drop table if exists public.chat_tools cascade;
drop table if exists public.chat_modes cascade;

-- Drop triggers
drop trigger if exists on_auth_user_created on auth.users;

-- Drop functions
drop function if exists public.handle_new_user();
drop function if exists public.is_chat_owner(p_chat_id uuid);
drop function if exists public.create_user_profile(p_user_id uuid, p_email text, p_metadata jsonb);
drop function if exists public.ensure_user_records(p_user_id uuid, p_email text, p_metadata jsonb);

-- =========================
-- TABLES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  grade text,
  curriculum text,
  preferred_explanation_style text default 'balanced',
  difficulty_preference text default 'medium',
  learning_pace text default 'moderate',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  user_id uuid,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tools_used jsonb default '[]'::jsonb,
  context_sources jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.study_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  grade text,
  curriculum text,
  notes_md text not null default '',
  flashcards jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.atlas_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  grade text,
  curriculum text,
  lesson jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{"concept_idx":0,"step_idx":0,"answers":{},"completed":false}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  color text default 'violet',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  folder_id uuid,
  title text not null default 'Untitled',
  content_html text not null default '',
  content_text text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  theme text default 'violet',
  slides jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  event_type text default 'reminder',
  event_date date not null,
  event_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  difficulty text default 'medium',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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
-- SUBSCRIPTION & USAGE TABLES
-- =========================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  plan text not null check (plan in ('free', 'pro', 'premium')),
  status text not null check (status in ('active', 'inactive', 'pending', 'cancelled', 'expired')),
  provider text not null default 'internal',
  razorpay_customer_id text,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, status)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'razorpay',
  amount decimal(10,2) not null,
  currency text not null default 'INR',
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  payment_id text,
  order_id text,
  invoice_id text,
  created_at timestamptz default now()
);

create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  date date not null,
  ai_chat_used int not null default 0,
  atlas_sessions_used int not null default 0,
  flashcards_used int not null default 0,
  quizzes_used int not null default 0,
  tests_used int not null default 0,
  presentations_used int not null default 0,
  research_used int not null default 0,
  images_used int not null default 0,
  storage_used_mb int not null default 0,
  file_uploads_used int not null default 0,
  web_searches_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete set null,
  study_hours decimal(5,2) default 0,
  study_streak int default 0,
  notes_created int default 0,
  flashcards_created int default 0,
  quizzes_completed int default 0,
  tests_completed int default 0,
  last_active timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text,
  size bigint not null,
  created_at timestamptz default now()
);

-- =========================
-- AI WORKSPACE TABLES
-- =========================
create table public.chat_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  name text not null,
  mime_type text,
  size bigint not null,
  pages int,
  processed boolean default false,
  ocr_text text,
  content_summary text,
  created_at timestamptz default now()
);

create table public.chat_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  source_type text not null check (source_type in ('notes', 'folders', 'atlas_sessions', 'research_reports', 'presentations', 'flashcard_sets', 'quiz_sets', 'practice_tests', 'calendar_events', 'uploads')),
  source_id uuid,
  source_name text,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table public.chat_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  memory_type text not null,
  memory_key text not null,
  memory_value text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chat_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  storage_path text not null,
  prompt text,
  image_type text check (image_type in ('generated', 'uploaded', 'analyzed')),
  analysis_result jsonb,
  ocr_text text,
  created_at timestamptz default now()
);

create table public.chat_web_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  query text not null,
  search_engine text default 'google',
  results jsonb default '[]'::jsonb,
  citations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table public.chat_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  tool_name text not null,
  tool_data jsonb default '{}'::jsonb,
  status text default 'active' check (status in ('active', 'completed', 'failed')),
  result jsonb,
  created_at timestamptz default now()
);

create table public.chat_modes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete cascade,
  mode text not null check (mode in ('general', 'study', 'research', 'writing', 'coding', 'creative', 'presentation', 'analysis')),
  system_prompt text,
  enabled_tools jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- =========================
-- TRIGGERS
-- =========================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Temporarily disable RLS for this function
  set local role to postgres;
  
  -- Create profile
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = new.email,
    full_name = coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    display_name = coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    avatar_url = new.raw_user_meta_data->>'avatar_url',
    updated_at = now();
  
  -- Create default free subscription if not exists
  insert into public.subscriptions (user_id, plan, status, provider)
  values (new.id, 'free', 'active', 'internal')
  on conflict (user_id, status) do nothing;
  
  -- Create user stats if not exists
  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do update set
    last_active = now(),
    updated_at = now();
  
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Function to manually create profile for existing users
create function public.create_user_profile(p_user_id uuid, p_email text, p_metadata jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Temporarily disable RLS for this function
  set local role to postgres;
  
  -- Create profile
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    p_user_id,
    p_email,
    coalesce(p_metadata->>'full_name', p_metadata->>'name'),
    coalesce(p_metadata->>'display_name', p_metadata->>'name', split_part(p_email, '@', 1)),
    p_metadata->>'avatar_url'
  )
  on conflict (id) do update set
    email = p_email,
    full_name = coalesce(p_metadata->>'full_name', p_metadata->>'name'),
    display_name = coalesce(p_metadata->>'display_name', p_metadata->>'name', split_part(p_email, '@', 1)),
    avatar_url = p_metadata->>'avatar_url',
    updated_at = now();
  
  -- Create default free subscription if not exists
  insert into public.subscriptions (user_id, plan, status, provider)
  values (p_user_id, 'free', 'active', 'internal')
  on conflict (user_id, status) do nothing;
  
  -- Create user stats if not exists
  insert into public.user_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do update set
    last_active = now(),
    updated_at = now();
  
  return true;
end;
$$;

create function public.is_chat_owner(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.chats where id = p_chat_id and user_id = auth.uid());
$$;

-- Function to ensure user has all required records
create function public.ensure_user_records(p_user_id uuid, p_email text, p_metadata jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Temporarily disable RLS for this function
  set local role to postgres;
  
  -- Ensure profile exists
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    p_user_id,
    p_email,
    coalesce(p_metadata->>'full_name', p_metadata->>'name'),
    coalesce(p_metadata->>'display_name', p_metadata->>'name', split_part(p_email, '@', 1)),
    p_metadata->>'avatar_url'
  )
  on conflict (id) do update set
    email = p_email,
    full_name = coalesce(p_metadata->>'full_name', p_metadata->>'name'),
    display_name = coalesce(p_metadata->>'display_name', p_metadata->>'name', split_part(p_email, '@', 1)),
    avatar_url = p_metadata->>'avatar_url',
    updated_at = now();
  
  -- Ensure subscription exists
  insert into public.subscriptions (user_id, plan, status, provider)
  values (p_user_id, 'free', 'active', 'internal')
  on conflict (user_id, status) do nothing;
  
  -- Ensure user_stats exists
  insert into public.user_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do update set
    last_active = now(),
    updated_at = now();
  
  return true;
end;
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
alter table public.subscriptions     enable row level security;
alter table public.usage             enable row level security;
alter table public.payments          enable row level security;
alter table public.user_stats        enable row level security;
alter table public.activity_log      enable row level security;
alter table public.files             enable row level security;

-- =========================
-- RLS POLICIES (explicit per table)
-- =========================

-- profiles (keyed by id = auth.uid())
create policy "profile_own_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile_bypass_rls" on public.profiles
  for all to postgres using (true) with check (true);

-- chats
create policy "chats_own_all" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages (keyed by chat ownership)
create policy "messages_select_own_chat" on public.messages
  for select using (public.is_chat_owner(chat_id));
create policy "messages_insert_own_chat" on public.messages
  for insert with check (public.is_chat_owner(chat_id) and (user_id is null or auth.uid() = user_id));
create policy "messages_delete_own_chat" on public.messages
  for delete using (public.is_chat_owner(chat_id));

-- study_packs
create policy "study_packs_own_all" on public.study_packs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- atlas_sessions
create policy "atlas_sessions_own_all" on public.atlas_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- folders
create policy "folders_own_all" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
create policy "notes_own_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- research_reports
create policy "research_reports_own_all" on public.research_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- presentations
create policy "presentations_own_all" on public.presentations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- calendar_events
create policy "calendar_events_own_all" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- flashcard_sets
create policy "flashcard_sets_own_all" on public.flashcard_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quiz_sets
create policy "quiz_sets_own_all" on public.quiz_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- practice_tests
create policy "practice_tests_own_all" on public.practice_tests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions
create policy "subscriptions_own_all" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage
create policy "usage_own_all" on public.usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- payments
create policy "payments_own_all" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_stats
create policy "user_stats_own_all" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activity_log
create policy "activity_log_own_all" on public.activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- files
create policy "files_own_all" on public.files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "files_bypass_rls" on public.files
  for all to postgres using (true) with check (true);

-- chat_uploads
create policy "chat_uploads_own_all" on public.chat_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_context
create policy "chat_context_own_all" on public.chat_context
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_memories
create policy "chat_memories_own_all" on public.chat_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_images
create policy "chat_images_own_all" on public.chat_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_web_results
create policy "chat_web_results_own_all" on public.chat_web_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_tools
create policy "chat_tools_own_all" on public.chat_tools
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_modes
create policy "chat_modes_own_all" on public.chat_modes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- INDEXES
-- =========================
create index idx_chats_user            on public.chats(user_id, updated_at desc);
create index idx_messages_chat         on public.messages(chat_id, created_at asc);
create index idx_messages_user         on public.messages(user_id, created_at asc);
create index idx_study_packs_user      on public.study_packs(user_id, updated_at desc);
create index idx_atlas_user            on public.atlas_sessions(user_id, updated_at desc);
create index idx_notes_user            on public.notes(user_id, updated_at desc);
create index idx_notes_folder          on public.notes(folder_id);
create index idx_research_user         on public.research_reports(user_id, updated_at desc);
create index idx_presentations_user    on public.presentations(user_id, updated_at desc);
create index idx_calendar_user_date    on public.calendar_events(user_id, event_date);
create index idx_flashcard_sets_user   on public.flashcard_sets(user_id, updated_at desc);
create index idx_quiz_sets_user        on public.quiz_sets(user_id, updated_at desc);
create index idx_practice_tests_user   on public.practice_tests(user_id, created_at desc);
create index idx_subscriptions_user   on public.subscriptions(user_id, status);
create index idx_usage_user_date       on public.usage(user_id, date);
create index idx_payments_user         on public.payments(user_id, created_at desc);
create index idx_payments_subscription on public.payments(subscription_id);
create index idx_activity_log_user     on public.activity_log(user_id, created_at desc);
create index idx_files_user           on public.files(user_id, created_at desc);
create index idx_files_folder         on public.files(folder_id);
create index idx_chat_uploads_chat    on public.chat_uploads(chat_id, created_at desc);
create index idx_chat_uploads_user    on public.chat_uploads(user_id, created_at desc);
create index idx_chat_context_chat     on public.chat_context(chat_id, source_type);
create index idx_chat_context_user     on public.chat_context(user_id, created_at desc);
create index idx_chat_memories_user    on public.chat_memories(user_id, is_active);
create index idx_chat_images_chat      on public.chat_images(chat_id, created_at desc);
create index idx_chat_images_user      on public.chat_images(user_id, created_at desc);
create index idx_chat_web_results_chat on public.chat_web_results(chat_id, created_at desc);
create index idx_chat_tools_chat       on public.chat_tools(chat_id, tool_name);
create index idx_chat_modes_chat       on public.chat_modes(chat_id, mode);
