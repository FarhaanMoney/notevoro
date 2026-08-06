-- Migration 001: Authentication & User Management
-- This migration sets up the core user authentication and profile system
-- Compatible with Supabase Auth

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================
-- PROFILES
-- =========================
-- User profiles linked to Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  email_verified boolean default false,
  
  -- Identity
  full_name text,
  display_name text not null,
  avatar_url text,
  
  -- Academic info (for students)
  grade text,
  curriculum text,
  institution text,
  
  -- Location (for future localization)
  country text,
  timezone text default 'UTC',
  language text default 'en',
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login_at timestamptz,
  
  -- Constraints
  constraint profiles_email_unique unique (email),
  constraint profiles_display_name_not_empty check (length(trim(display_name)) > 0)
);

-- =========================
-- USER SETTINGS
-- =========================
-- User-configurable application settings
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Theme & UI
  theme text default 'system', -- 'light', 'dark', 'system'
  accent_color text default 'violet',
  
  -- Notifications
  email_notifications boolean default true,
  push_notifications boolean default false,
  marketing_emails boolean default false,
  
  -- Privacy
  profile_visibility text default 'private', -- 'private', 'public'
  activity_visibility text default 'private',
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- USER PREFERENCES
-- =========================
-- AI and learning preferences
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- AI Preferences (Voro)
  preferred_explanation_style text default 'balanced', -- 'concise', 'balanced', 'detailed'
  difficulty_preference text default 'medium', -- 'beginner', 'medium', 'advanced'
  learning_pace text default 'moderate', -- 'slow', 'moderate', 'fast'
  
  -- Learning Style
  learning_style jsonb default '[]'::jsonb, -- Array of learning style tags
  subjects_of_interest jsonb default '[]'::jsonb,
  
  -- Workspace Preferences
  default_workspace text default 'student', -- 'student', 'educator', 'work'
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- USER STATS
-- =========================
-- User activity and engagement statistics
create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Activity
  total_study_hours decimal(10,2) default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_at timestamptz,
  
  -- Content Counts
  notes_created integer default 0,
  flashcard_sets_created integer default 0,
  quizzes_created integer default 0,
  tests_completed integer default 0,
  presentations_created integer default 0,
  research_reports_created integer default 0,
  
  -- AI Usage
  ai_chat_count integer default 0,
  ai_messages_sent integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint user_stats_non_negative check (
    total_study_hours >= 0 and
    current_streak >= 0 and
    longest_streak >= 0 and
    notes_created >= 0 and
    flashcard_sets_created >= 0 and
    quizzes_created >= 0 and
    tests_completed >= 0 and
    presentations_created >= 0 and
    research_reports_created >= 0 and
    ai_chat_count >= 0 and
    ai_messages_sent >= 0
  )
);

-- =========================
-- ACTIVITY LOG
-- =========================
-- Comprehensive activity tracking for analytics and security
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  
  -- Event Details
  action text not null, -- 'login', 'signup', 'create_note', 'delete_note', etc.
  entity_type text, -- 'note', 'flashcard', 'quiz', etc.
  entity_id uuid,
  
  -- Context
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now()
);

-- =========================
-- INDEXES
-- =========================
-- Profiles
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_display_name on public.profiles(display_name);
create index idx_profiles_country on public.profiles(country);
create index idx_profiles_created_at on public.profiles(created_at);

-- User Settings
create index idx_user_settings_theme on public.user_settings(theme);

-- User Preferences
create index idx_user_preferences_workspace on public.user_preferences(default_workspace);

-- User Stats
create index idx_user_stats_last_active on public.user_stats(last_active_at);
create index idx_user_stats_streak on public.user_stats(current_streak);

-- Activity Log
create index idx_activity_log_user_id on public.activity_log(user_id);
create index idx_activity_log_action on public.activity_log(action);
create index idx_activity_log_entity on public.activity_log(entity_type, entity_id);
create index idx_activity_log_created_at on public.activity_log(created_at);
create index idx_activity_log_user_created on public.activity_log(user_id, created_at desc);

-- =========================
-- FUNCTIONS
-- =========================

-- Create profile for new user
create or replace function public.create_profile(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    timezone,
    language,
    metadata
  )
  values (
    p_user_id,
    p_email,
    p_metadata->>'full_name',
    coalesce(p_metadata->>'display_name', split_part(p_email, '@', 1)),
    p_metadata->>'avatar_url',
    coalesce(p_metadata->>'timezone', 'UTC'),
    coalesce(p_metadata->>'language', 'en'),
    p_metadata
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    timezone = excluded.timezone,
    language = excluded.language,
    metadata = excluded.metadata,
    updated_at = now();

  return true;
end;
$$;

-- Initialize user records (profile, settings, preferences, stats)
create or replace function public.initialize_user_records(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile
  perform public.create_profile(p_user_id, p_email, p_metadata);

  -- Create default settings
  insert into public.user_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  
  -- Create default preferences
  insert into public.user_preferences (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  
  -- Create user stats
  insert into public.user_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  
  return true;
end;
$$;

-- Log user activity
create or replace function public.log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  insert into public.activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- Update user stats
create or replace function public.update_user_stats(
  p_user_id uuid,
  p_updates jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_stats
  set
    total_study_hours = coalesce(total_study_hours, 0) + coalesce((p_updates->>'study_hours')::decimal, 0),
    current_streak = coalesce(p_updates->>'current_streak', current_streak),
    longest_streak = greatest(longest_streak, coalesce(p_updates->>'current_streak', current_streak)),
    notes_created = notes_created + coalesce((p_updates->>'notes_created')::int, 0),
    flashcard_sets_created = flashcard_sets_created + coalesce((p_updates->>'flashcard_sets_created')::int, 0),
    quizzes_created = quizzes_created + coalesce((p_updates->>'quizzes_created')::int, 0),
    tests_completed = tests_completed + coalesce((p_updates->>'tests_completed')::int, 0),
    presentations_created = presentations_created + coalesce((p_updates->>'presentations_created')::int, 0),
    research_reports_created = research_reports_created + coalesce((p_updates->>'research_reports_created')::int, 0),
    ai_chat_count = ai_chat_count + coalesce((p_updates->>'ai_chat_count')::int, 0),
    ai_messages_sent = ai_messages_sent + coalesce((p_updates->>'ai_messages_sent')::int, 0),
    last_active_at = coalesce(p_updates->>'last_active_at', now()),
    updated_at = now()
  where user_id = p_user_id;
  
  return true;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-create user records on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Initialize all user records
  perform public.initialize_user_records(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );

  return new;
exception when others then
    -- Log error but don't fail the signup
    raise log 'handle_new_user error: %', SQLERRM;
    return new;
end;
$$;

-- Create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Auto-update updated_at timestamp (generic function for all tables)
create or replace function public.update_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profile_updated_at
before update on public.profiles
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on user_settings
create trigger update_user_settings_updated_at
before update on public.user_settings
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on user_preferences
create trigger update_user_preferences_updated_at
before update on public.user_preferences
for each row
execute procedure public.update_timestamp();
