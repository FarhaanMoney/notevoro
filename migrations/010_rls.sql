-- Migration 010: Row Level Security (RLS)
-- Helper functions and security policies
-- Server-side only - never trust client

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Check if user is owner of resource
create or replace function public.is_owner(p_user_id uuid, p_resource_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select p_user_id = p_resource_user_id;
$$;

-- Check if user is admin
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  -- Check if user has admin role in user metadata
  select (raw_user_meta_data->>'is_admin')::boolean into v_is_admin
  from auth.users
  where id = p_user_id;
  
  return coalesce(v_is_admin, false);
end;
$$;

-- Check if user is premium
create or replace function public.is_premium(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select plan into v_plan
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  limit 1;
  
  return coalesce(v_plan in ('pro', 'premium'), false);
end;
$$;

-- Check if user is teacher (for future educator workspace)
create or replace function public.is_teacher(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_teacher boolean;
begin
  -- Check if user has teacher role in user metadata
  select (raw_user_meta_data->>'is_teacher')::boolean into v_is_teacher
  from auth.users
  where id = p_user_id;
  
  return coalesce(v_is_teacher, false);
end;
$$;

-- Check if user is employee (for future organization workspace)
create or replace function public.is_employee(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_employee boolean;
begin
  -- Check if user has employee role in user metadata
  select (raw_user_meta_data->>'is_employee')::boolean into v_is_employee
  from auth.users
  where id = p_user_id;
  
  return coalesce(v_is_employee, false);
end;
$$;

-- Check if user is member of organization (for future org support)
create or replace function public.is_org_member(p_user_id uuid, p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select false; -- Placeholder for future organization support
$$;

-- Get current user ID from auth
create or replace function public.current_user_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- =========================
-- ENABLE RLS ON ALL TABLES
-- =========================

-- Auth tables
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_stats enable row level security;
alter table public.activity_log enable row level security;

-- Billing tables
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;
alter table public.subscription_history enable row level security;
alter table public.usage_limits enable row level security;

-- Usage tables
alter table public.usage_events enable row level security;
alter table public.daily_usage_cache enable row level security;
alter table public.monthly_usage_cache enable row level security;

-- AI Workspace tables
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.artifacts enable row level security;
alter table public.tool_calls enable row level security;
alter table public.sources enable row level security;
alter table public.citations enable row level security;
alter table public.memories enable row level security;
alter table public.generated_images enable row level security;
alter table public.web_results enable row level security;
alter table public.youtube_results enable row level security;

-- Notes tables
alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;
alter table public.note_tags enable row level security;
alter table public.note_tag_relations enable row level security;
alter table public.note_files enable row level security;

-- Learning tables
alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.practice_tests enable row level security;
alter table public.test_results enable row level security;
alter table public.atlas_sessions enable row level security;
alter table public.atlas_steps enable row level security;
alter table public.atlas_progress enable row level security;
alter table public.presentations enable row level security;
alter table public.research_reports enable row level security;
alter table public.study_guides enable row level security;

-- Storage tables
alter table public.files enable row level security;
alter table public.storage_usage enable row level security;
alter table public.storage_logs enable row level security;

-- Calendar tables
alter table public.events enable row level security;
alter table public.reminders enable row level security;
alter table public.recurring_events enable row level security;

-- =========================
-- PROFILES POLICIES
-- =========================

-- Users can read their own profile
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);

-- Users can insert their own profile (via trigger)
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
on public.profiles for select
using (public.is_admin(auth.uid()));

-- =========================
-- USER SETTINGS POLICIES
-- =========================

-- Users can read their own settings
create policy "Users can view own settings"
on public.user_settings for select
using (auth.uid() = user_id);

-- Users can update their own settings
create policy "Users can update own settings"
on public.user_settings for update
using (auth.uid() = user_id);

-- Users can insert their own settings
create policy "Users can insert own settings"
on public.user_settings for insert
with check (auth.uid() = user_id);

-- =========================
-- USER PREFERENCES POLICIES
-- =========================

-- Users can read their own preferences
create policy "Users can view own preferences"
on public.user_preferences for select
using (auth.uid() = user_id);

-- Users can update their own preferences
create policy "Users can update own preferences"
on public.user_preferences for update
using (auth.uid() = user_id);

-- Users can insert their own preferences
create policy "Users can insert own preferences"
on public.user_preferences for insert
with check (auth.uid() = user_id);

-- =========================
-- USER STATS POLICIES
-- =========================

-- Users can read their own stats
create policy "Users can view own stats"
on public.user_stats for select
using (auth.uid() = user_id);

-- System can update stats (via functions)
create policy "System can update stats"
on public.user_stats for update
using (true);

-- =========================
-- ACTIVITY LOG POLICIES
-- =========================

-- Users can read their own activity log
create policy "Users can view own activity log"
on public.activity_log for select
using (auth.uid() = user_id);

-- System can insert activity log
create policy "System can insert activity log"
on public.activity_log for insert
with check (true);

-- =========================
-- SUBSCRIPTIONS POLICIES
-- =========================

-- Users can read their own subscriptions
create policy "Users can view own subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

-- System can manage subscriptions
create policy "System can manage subscriptions"
on public.subscriptions for all
using (true);

-- =========================
-- PAYMENTS POLICIES
-- =========================

-- Users can read their own payments
create policy "Users can view own payments"
on public.payments for select
using (auth.uid() = user_id);

-- System can insert payments
create policy "System can insert payments"
on public.payments for insert
with check (true);

-- System can update payment status
create policy "System can update payment status"
on public.payments for update
using (true);

-- =========================
-- USAGE LIMITS POLICIES
-- =========================

-- Authenticated users can read usage limits
create policy "Users can view usage limits"
on public.usage_limits for select
using (auth.uid() is not null);

-- =========================
-- USAGE EVENTS POLICIES
-- =========================

-- Users can read their own usage events
create policy "Users can view own usage events"
on public.usage_events for select
using (auth.uid() = user_id);

-- System can insert usage events
create policy "System can insert usage events"
on public.usage_events for insert
with check (true);

-- =========================
-- USAGE CACHE POLICIES
-- =========================

-- Users can read their own usage cache
create policy "Users can view own daily usage cache"
on public.daily_usage_cache for select
using (auth.uid() = user_id);

create policy "Users can view own monthly usage cache"
on public.monthly_usage_cache for select
using (auth.uid() = user_id);

-- System can update usage cache
create policy "System can update daily usage cache"
on public.daily_usage_cache for all
using (true);

create policy "System can update monthly usage cache"
on public.monthly_usage_cache for all
using (true);

-- =========================
-- CONVERSATIONS POLICIES
-- =========================

-- Users can read their own conversations
create policy "Users can view own conversations"
on public.conversations for select
using (auth.uid() = user_id);

-- Users can insert their own conversations
create policy "Users can insert own conversations"
on public.conversations for insert
with check (auth.uid() = user_id);

-- Users can update their own conversations
create policy "Users can update own conversations"
on public.conversations for update
using (auth.uid() = user_id);

-- Users can delete their own conversations
create policy "Users can delete own conversations"
on public.conversations for delete
using (auth.uid() = user_id);

-- =========================
-- MESSAGES POLICIES
-- =========================

-- Users can read messages in their conversations
create policy "Users can view own conversation messages"
on public.messages for select
using (
  auth.uid() = user_id or
  exists (
    select 1 from public.conversations
    where id = conversation_id
      and user_id = auth.uid()
  )
);

-- System can insert messages
create policy "System can insert messages"
on public.messages for insert
with check (true);

-- =========================
-- ATTACHMENTS POLICIES
-- =========================

-- Users can read attachments in their messages
create policy "Users can view own message attachments"
on public.attachments for select
using (auth.uid() = user_id);

-- =========================
-- ARTIFACTS POLICIES
-- =========================

-- Users can read artifacts in their messages
create policy "Users can view own message artifacts"
on public.artifacts for select
using (auth.uid() = user_id);

-- =========================
-- MEMORIES POLICIES
-- =========================

-- Users can read their own memories
create policy "Users can view own memories"
on public.memories for select
using (auth.uid() = user_id);

-- Users can insert their own memories
create policy "Users can insert own memories"
on public.memories for insert
with check (auth.uid() = user_id);

-- Users can update their own memories
create policy "Users can update own memories"
on public.memories for update
using (auth.uid() = user_id);

-- =========================
-- FOLDERS POLICIES
-- =========================

-- Users can read their own folders
create policy "Users can view own folders"
on public.folders for select
using (auth.uid() = user_id);

-- Users can insert their own folders
create policy "Users can insert own folders"
on public.folders for insert
with check (auth.uid() = user_id);

-- Users can update their own folders
create policy "Users can update own folders"
on public.folders for update
using (auth.uid() = user_id);

-- Users can delete their own folders
create policy "Users can delete own folders"
on public.folders for delete
using (auth.uid() = user_id);

-- =========================
-- NOTES POLICIES
-- =========================

-- Users can read their own notes
create policy "Users can view own notes"
on public.notes for select
using (auth.uid() = user_id);

-- Users can insert their own notes
create policy "Users can insert own notes"
on public.notes for insert
with check (auth.uid() = user_id);

-- Users can update their own notes
create policy "Users can update own notes"
on public.notes for update
using (auth.uid() = user_id);

-- Users can delete their own notes
create policy "Users can delete own notes"
on public.notes for delete
using (auth.uid() = user_id);

-- =========================
-- NOTE VERSIONS POLICIES
-- =========================

-- Users can read versions of their notes
create policy "Users can view own note versions"
on public.note_versions for select
using (auth.uid() = user_id);

-- System can insert note versions
create policy "System can insert note versions"
on public.note_versions for insert
with check (true);

-- =========================
-- NOTE TAGS POLICIES
-- =========================

-- Users can read their own tags
create policy "Users can view own tags"
on public.note_tags for select
using (auth.uid() = user_id);

-- Users can insert their own tags
create policy "Users can insert own tags"
on public.note_tags for insert
with check (auth.uid() = user_id);

-- Users can update their own tags
create policy "Users can update own tags"
on public.note_tags for update
using (auth.uid() = user_id);

-- =========================
-- NOTE TAG RELATIONS POLICIES
-- =========================

-- Users can read their own tag relations
create policy "Users can view own tag relations"
on public.note_tag_relations for select
using (auth.uid() = user_id);

-- Users can insert their own tag relations
create policy "Users can insert own tag relations"
on public.note_tag_relations for insert
with check (auth.uid() = user_id);

-- Users can delete their own tag relations
create policy "Users can delete own tag relations"
on public.note_tag_relations for delete
using (auth.uid() = user_id);

-- =========================
-- NOTE FILES POLICIES
-- =========================

-- Users can read files in their notes
create policy "Users can view own note files"
on public.note_files for select
using (auth.uid() = user_id);

-- =========================
-- FLASHCARD SETS POLICIES
-- =========================

-- Users can read their own flashcard sets
create policy "Users can view own flashcard sets"
on public.flashcard_sets for select
using (auth.uid() = user_id);

-- Users can read public flashcard sets
create policy "Users can view public flashcard sets"
on public.flashcard_sets for select
using (is_public = true);

-- Users can insert their own flashcard sets
create policy "Users can insert own flashcard sets"
on public.flashcard_sets for insert
with check (auth.uid() = user_id);

-- Users can update their own flashcard sets
create policy "Users can update own flashcard sets"
on public.flashcard_sets for update
using (auth.uid() = user_id);

-- =========================
-- FLASHCARDS POLICIES
-- =========================

-- Users can read flashcards in their sets
create policy "Users can view own flashcards"
on public.flashcards for select
using (
  auth.uid() = user_id or
  exists (
    select 1 from public.flashcard_sets
    where id = flashcard_set_id
      and user_id = auth.uid()
  )
);

-- System can insert flashcards
create policy "System can insert flashcards"
on public.flashcards for insert
with check (true);

-- =========================
-- QUIZ SETS POLICIES
-- =========================

-- Users can read their own quiz sets
create policy "Users can view own quiz sets"
on public.quiz_sets for select
using (auth.uid() = user_id);

-- Users can read public quiz sets
create policy "Users can view public quiz sets"
on public.quiz_sets for select
using (is_public = true);

-- Users can insert their own quiz sets
create policy "Users can insert own quiz sets"
on public.quiz_sets for insert
with check (auth.uid() = user_id);

-- =========================
-- QUIZ QUESTIONS POLICIES
-- =========================

-- Users can read questions in their quiz sets
create policy "Users can view own quiz questions"
on public.quiz_questions for select
using (
  auth.uid() = user_id or
  exists (
    select 1 from public.quiz_sets
    where id = quiz_set_id
      and user_id = auth.uid()
  )
);

-- =========================
-- PRACTICE TESTS POLICIES
-- =========================

-- Users can read their own practice tests
create policy "Users can view own practice tests"
on public.practice_tests for select
using (auth.uid() = user_id);

-- Users can insert their own practice tests
create policy "Users can insert own practice tests"
on public.practice_tests for insert
with check (auth.uid() = user_id);

-- =========================
-- TEST RESULTS POLICIES
-- =========================

-- Users can read their own test results
create policy "Users can view own test results"
on public.test_results for select
using (auth.uid() = user_id);

-- System can insert test results
create policy "System can insert test results"
on public.test_results for insert
with check (true);

-- =========================
-- ATLAS SESSIONS POLICIES
-- =========================

-- Users can read their own atlas sessions
create policy "Users can view own atlas sessions"
on public.atlas_sessions for select
using (auth.uid() = user_id);

-- Users can insert their own atlas sessions
create policy "Users can insert own atlas sessions"
on public.atlas_sessions for insert
with check (auth.uid() = user_id);

-- =========================
-- ATLAS STEPS POLICIES
-- =========================

-- Users can read steps in their atlas sessions
create policy "Users can view own atlas steps"
on public.atlas_steps for select
using (
  auth.uid() = user_id or
  exists (
    select 1 from public.atlas_sessions
    where id = atlas_session_id
      and user_id = auth.uid()
  )
);

-- =========================
-- PRESENTATIONS POLICIES
-- =========================

-- Users can read their own presentations
create policy "Users can view own presentations"
on public.presentations for select
using (auth.uid() = user_id);

-- Users can insert their own presentations
create policy "Users can insert own presentations"
on public.presentations for insert
with check (auth.uid() = user_id);

-- =========================
-- RESEARCH REPORTS POLICIES
-- =========================

-- Users can read their own research reports
create policy "Users can view own research reports"
on public.research_reports for select
using (auth.uid() = user_id);

-- Users can insert their own research reports
create policy "Users can insert own research reports"
on public.research_reports for insert
with check (auth.uid() = user_id);

-- =========================
-- STUDY GUIDES POLICIES
-- =========================

-- Users can read their own study guides
create policy "Users can view own study guides"
on public.study_guides for select
using (auth.uid() = user_id);

-- Users can insert their own study guides
create policy "Users can insert own study guides"
on public.study_guides for insert
with check (auth.uid() = user_id);

-- =========================
-- FILES POLICIES
-- =========================

-- Users can read their own files
create policy "Users can view own files"
on public.files for select
using (auth.uid() = user_id);

-- Users can read public files
create policy "Users can view public files"
on public.files for select
using (is_public = true);

-- System can insert files
create policy "System can insert files"
on public.files for insert
with check (true);

-- =========================
-- STORAGE USAGE POLICIES
-- =========================

-- Users can read their own storage usage
create policy "Users can view own storage usage"
on public.storage_usage for select
using (auth.uid() = user_id);

-- System can update storage usage
create policy "System can update storage usage"
on public.storage_usage for all
using (true);

-- =========================
-- STORAGE LOGS POLICIES
-- =========================

-- Users can read their own storage logs
create policy "Users can view own storage logs"
on public.storage_logs for select
using (auth.uid() = user_id);

-- System can insert storage logs
create policy "System can insert storage logs"
on public.storage_logs for insert
with check (true);

-- =========================
-- EVENTS POLICIES
-- =========================

-- Users can read their own events
create policy "Users can view own events"
on public.events for select
using (auth.uid() = user_id);

-- Users can insert their own events
create policy "Users can insert own events"
on public.events for insert
with check (auth.uid() = user_id);

-- Users can update their own events
create policy "Users can update own events"
on public.events for update
using (auth.uid() = user_id);

-- =========================
-- REMINDERS POLICIES
-- =========================

-- Users can read their own reminders
create policy "Users can view own reminders"
on public.reminders for select
using (auth.uid() = user_id);

-- Users can insert their own reminders
create policy "Users can insert own reminders"
on public.reminders for insert
with check (auth.uid() = user_id);

-- Users can update their own reminders
create policy "Users can update own reminders"
on public.reminders for update
using (auth.uid() = user_id);

-- =========================
-- RECURRING EVENTS POLICIES
-- =========================

-- Users can read their own recurring events
create policy "Users can view own recurring events"
on public.recurring_events for select
using (auth.uid() = user_id);

-- Users can insert their own recurring events
create policy "Users can insert own recurring events"
on public.recurring_events for insert
with check (auth.uid() = user_id);

-- Users can update their own recurring events
create policy "Users can update own recurring events"
on public.recurring_events for update
using (auth.uid() = user_id);
