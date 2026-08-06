-- Migration 003: Event-Based Usage Engine
-- Server-side usage tracking system
-- Every AI feature records a usage event
-- Usage limits are calculated from events

-- =========================
-- USAGE EVENTS
-- =========================
-- Individual usage events for all AI features
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Event Type
  event_type text not null, -- 'AI_CHAT', 'FLASHCARDS', 'QUIZ', 'TEST', 'PRESENTATION', 'RESEARCH', 'IMAGE', 'UPLOAD', 'WEB_SEARCH', 'YOUTUBE_SEARCH', 'ATLAS_SESSION', 'NOTE_CREATE', etc.
  
  -- Context
  entity_type text, -- 'conversation', 'flashcard_set', 'quiz', etc.
  entity_id uuid,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb, -- Additional context (tokens used, file size, etc.)
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint usage_events_event_type_valid check (event_type in (
    'AI_CHAT', 'AI_MESSAGE', 'FLASHCARDS', 'QUIZ', 'TEST', 'PRESENTATION', 
    'RESEARCH', 'IMAGE', 'UPLOAD', 'WEB_SEARCH', 'YOUTUBE_SEARCH', 
    'ATLAS_SESSION', 'NOTE_CREATE', 'NOTE_EDIT', 'EXPORT', 'API_CALL'
  ))
);

-- =========================
-- DAILY USAGE CACHE
-- =========================
-- Cached daily usage counts per user per feature
-- Updated by triggers on usage_events
create table public.daily_usage_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Date
  date date not null,
  
  -- Event Type
  event_type text not null,
  
  -- Count
  count integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint daily_usage_cache_unique unique (user_id, date, event_type),
  constraint daily_usage_cache_non_negative check (count >= 0)
);

-- =========================
-- MONTHLY USAGE CACHE
-- =========================
-- Cached monthly usage counts per user per feature
-- Updated by scheduled jobs
create table public.monthly_usage_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Month/Year
  year integer not null,
  month integer not null,
  
  -- Event Type
  event_type text not null,
  
  -- Count
  count integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint monthly_usage_cache_unique unique (user_id, year, month, event_type),
  constraint monthly_usage_cache_non_negative check (count >= 0),
  constraint monthly_usage_cache_valid_month check (month >= 1 and month <= 12)
);

-- =========================
-- INDEXES
-- =========================
-- Usage Events
create index idx_usage_events_user_id on public.usage_events(user_id);
create index idx_usage_events_event_type on public.usage_events(event_type);
create index idx_usage_events_entity on public.usage_events(entity_type, entity_id);
create index idx_usage_events_created_at on public.usage_events(created_at);
create index idx_usage_events_user_type_created on public.usage_events(user_id, event_type, created_at);
create index idx_usage_events_user_date on public.usage_events(user_id, created_at);

-- Daily Usage Cache
create index idx_daily_usage_cache_user_id on public.daily_usage_cache(user_id);
create index idx_daily_usage_cache_date on public.daily_usage_cache(date);
create index idx_daily_usage_cache_event_type on public.daily_usage_cache(event_type);
create index idx_daily_usage_cache_user_date on public.daily_usage_cache(user_id, date);
create index idx_daily_usage_cache_user_date_type on public.daily_usage_cache(user_id, date, event_type);

-- Monthly Usage Cache
create index idx_monthly_usage_cache_user_id on public.monthly_usage_cache(user_id);
create index idx_monthly_usage_cache_year_month on public.monthly_usage_cache(year, month);
create index idx_monthly_usage_cache_event_type on public.monthly_usage_cache(event_type);
create index idx_monthly_usage_cache_user_year_month on public.monthly_usage_cache(user_id, year, month);
create index idx_monthly_usage_cache_user_year_month_type on public.monthly_usage_cache(user_id, year, month, event_type);

-- =========================
-- FUNCTIONS
-- =========================

-- Record a usage event
create or replace function public.record_usage_event(
  p_user_id uuid,
  p_event_type text,
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
  v_event_id uuid;
  v_date date;
begin
  -- Record the event
  insert into public.usage_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_metadata
  )
  returning id into v_event_id;
  
  -- Update daily cache
  v_date := current_date;
  
  insert into public.daily_usage_cache (
    user_id,
    date,
    event_type,
    count
  )
  values (
    p_user_id,
    v_date,
    p_event_type,
    1
  )
  on conflict (user_id, date, event_type)
  do update set
    count = daily_usage_cache.count + 1,
    updated_at = now();
  
  return v_event_id;
end;
$$;

-- Get daily usage for user
create or replace function public.get_daily_usage(p_user_id uuid, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_object_agg(event_type, count)
  into v_result
  from public.daily_usage_cache
  where user_id = p_user_id
    and date = p_date;
  
  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- Get monthly usage for user
create or replace function public.get_monthly_usage(p_user_id uuid, p_year integer, p_month integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_object_agg(event_type, count)
  into v_result
  from public.monthly_usage_cache
  where user_id = p_user_id
    and year = p_year
    and month = p_month;
  
  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- Check if user has exceeded usage limit
create or replace function public.check_usage_limit(
  p_user_id uuid,
  p_event_type text,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count integer;
  v_remaining integer;
  v_exceeded boolean;
begin
  -- Get today's count
  select coalesce(count, 0) into v_today_count
  from public.daily_usage_cache
  where user_id = p_user_id
    and event_type = p_event_type
    and date = current_date;
  
  -- Calculate remaining
  if p_limit = -1 then
    -- Unlimited
    v_remaining := -1;
    v_exceeded := false;
  else
    v_remaining := p_limit - v_today_count;
    v_exceeded := v_remaining <= 0;
  end if;
  
  return jsonb_build_object(
    'used', v_today_count,
    'limit', p_limit,
    'remaining', v_remaining,
    'exceeded', v_exceeded,
    'unlimited', p_limit = -1
  );
end;
$$;

-- Get all usage limits for user
create or replace function public.get_user_usage_limits(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription jsonb;
  v_limits jsonb;
  v_today_usage jsonb;
  v_result jsonb;
  v_key text;
  v_limit integer;
  v_usage jsonb;
begin
  -- Get subscription with limits
  v_subscription := public.get_user_subscription(p_user_id);
  v_limits := v_subscription->'limits';
  
  -- Get today's usage
  v_today_usage := public.get_daily_usage(p_user_id);
  
  -- Build result
  v_result := '{}'::jsonb;
  
  -- AI Chat
  v_limit := (v_limits->>'ai_chat_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'AI_CHAT')::int, 0) + coalesce((v_today_usage->>'AI_MESSAGE')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'AI_CHAT')::int, 0) - coalesce((v_today_usage->>'AI_MESSAGE')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('ai_chat', v_usage);
  
  -- AI Messages
  v_limit := (v_limits->>'ai_messages_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'AI_MESSAGE')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'AI_MESSAGE')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('ai_messages', v_usage);
  
  -- AI Images
  v_limit := (v_limits->>'ai_images_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'IMAGE')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'IMAGE')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('ai_images', v_usage);
  
  -- Web Search
  v_limit := (v_limits->>'web_search_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'WEB_SEARCH')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'WEB_SEARCH')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('web_search', v_usage);
  
  -- YouTube Search
  v_limit := (v_limits->>'youtube_search_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'YOUTUBE_SEARCH')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'YOUTUBE_SEARCH')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('youtube_search', v_usage);
  
  -- Notes
  v_limit := (v_limits->>'notes_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'NOTE_CREATE')::int, 0) + coalesce((v_today_usage->>'NOTE_EDIT')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'NOTE_CREATE')::int, 0) - coalesce((v_today_usage->>'NOTE_EDIT')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('notes', v_usage);
  
  -- Flashcards
  v_limit := (v_limits->>'flashcard_sets_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'FLASHCARDS')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'FLASHCARDS')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('flashcards', v_usage);
  
  -- Quizzes
  v_limit := (v_limits->>'quizzes_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'QUIZ')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'QUIZ')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('quizzes', v_usage);
  
  -- Tests
  v_limit := (v_limits->>'tests_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'TEST')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'TEST')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('tests', v_usage);
  
  -- Presentations
  v_limit := (v_limits->>'presentations_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'PRESENTATION')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'PRESENTATION')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('presentations', v_usage);
  
  -- Research Reports
  v_limit := (v_limits->>'research_reports_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'RESEARCH')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'RESEARCH')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('research_reports', v_usage);
  
  -- Atlas Sessions
  v_limit := (v_limits->>'atlas_sessions_per_day')::int;
  v_usage := jsonb_build_object(
    'used', coalesce((v_today_usage->>'ATLAS_SESSION')::int, 0),
    'limit', v_limit,
    'remaining', case when v_limit = -1 then -1 else v_limit - coalesce((v_today_usage->>'ATLAS_SESSION')::int, 0) end
  );
  v_result := v_result || jsonb_build_object('atlas_sessions', v_usage);
  
  -- Add subscription info
  v_result := v_result || jsonb_build_object(
    'plan', v_subscription->>'plan',
    'status', v_subscription->>'status'
  );
  
  return v_result;
end;
$$;

-- Aggregate daily usage to monthly (run by scheduled job)
create or replace function public.aggregate_daily_to_monthly(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Aggregate daily usage to monthly
  insert into public.monthly_usage_cache (user_id, year, month, event_type, count)
  select
    user_id,
    extract(year from p_date)::integer,
    extract(month from p_date)::integer,
    event_type,
    sum(count)
  from public.daily_usage_cache
  where date = p_date
  group by user_id, event_type
  on conflict (user_id, year, month, event_type) do update set
    count = excluded.count;
end;
$$;

-- Clean up old usage events (run by scheduled job)
create or replace function public.cleanup_old_usage_events(p_days_to_keep integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  delete from public.usage_events
  where created_at < now() - (p_days_to_keep || ' days')::interval;

  get diagnostics v_deleted_count = row_count;

  return v_deleted_count;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on daily_usage_cache
create trigger update_daily_usage_cache_updated_at
before update on public.daily_usage_cache
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on monthly_usage_cache
create trigger update_monthly_usage_cache_updated_at
before update on public.monthly_usage_cache
for each row
execute procedure public.update_timestamp();
