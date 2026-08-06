-- Migration 008: Calendar System
-- Events, reminders, and recurring events
-- Designed for future calendar syncing

-- =========================
-- EVENTS
-- =========================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Event details
  title text not null,
  description text,
  
  -- Timing
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean default false,
  
  -- Location
  location text,
  location_lat decimal(9,6),
  location_lng decimal(9,6),
  
  -- Event type
  event_type text default 'study', -- 'study', 'exam', 'deadline', 'meeting', 'personal', 'other'
  color text default 'blue',
  
  -- Related entities
  related_entity_type text, -- 'note', 'flashcard_set', 'quiz', 'test', etc.
  related_entity_id uuid,
  
  -- Status
  status text default 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'postponed'
  
  -- Notifications
  reminder_minutes_before integer default null, -- null for no reminder
  reminder_sent boolean default false,
  
  -- External sync
  external_id text, -- For Google Calendar, etc.
  external_provider text,
  external_synced_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint events_title_not_empty check (length(trim(title)) > 0),
  constraint events_end_after_start check (end_at is null or end_at >= start_at),
  constraint events_type_valid check (event_type in ('study', 'exam', 'deadline', 'meeting', 'personal', 'other')),
  constraint events_status_valid check (status in ('scheduled', 'completed', 'cancelled', 'postponed')),
  constraint events_reminder_non_negative check (reminder_minutes_before is null or reminder_minutes_before >= 0)
);

-- =========================
-- REMINDERS
-- =========================
-- Separate reminders table for more complex reminder logic
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  
  -- Reminder details
  title text not null,
  description text,
  
  -- Timing
  remind_at timestamptz not null,
  
  -- Status
  is_sent boolean default false,
  sent_at timestamptz,
  is_dismissed boolean default false,
  dismissed_at timestamptz,
  
  -- Method
  method text default 'in_app', -- 'in_app', 'email', 'push', 'sms'
  
  -- Recurrence
  recurring boolean default false,
  recurring_pattern text, -- 'daily', 'weekly', 'monthly', 'yearly'
  recurring_until timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint reminders_title_not_empty check (length(trim(title)) > 0),
  constraint reminders_method_valid check (method in ('in_app', 'email', 'push', 'sms')),
  constraint reminders_pattern_valid check (not recurring or recurring_pattern in ('daily', 'weekly', 'monthly', 'yearly'))
);

-- =========================
-- RECURRING EVENTS
-- =========================
-- Template for recurring events
create table public.recurring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Event template
  title text not null,
  description text,
  
  -- Recurrence pattern
  recurrence_type text not null, -- 'daily', 'weekly', 'monthly', 'yearly', 'custom'
  recurrence_interval integer default 1, -- e.g., every 2 weeks
  recurrence_days jsonb default '[]'::jsonb, -- For weekly: [0, 2, 4] (Mon, Wed, Fri)
  recurrence_month_day integer, -- For monthly: day of month
  recurrence_month_weekday integer, -- For monthly: nth weekday of month
  recurrence_month_weekday_value integer, -- 1=first, 2=second, etc.
  
  -- Duration
  duration_minutes integer,
  all_day boolean default false,
  
  -- Time
  start_time time,
  end_time time,
  
  -- Event type
  event_type text default 'study',
  color text default 'blue',
  
  -- Date range
  start_date date not null,
  end_date date, -- null for infinite
  
  -- Exclusions
  excluded_dates jsonb default '[]'::jsonb, -- Dates to skip
  
  -- Status
  is_active boolean default true,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint recurring_events_title_not_empty check (length(trim(title)) > 0),
  constraint recurring_events_type_valid check (recurrence_type in ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  constraint recurring_events_interval_positive check (recurrence_interval > 0),
  constraint recurring_events_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint recurring_events_event_type_valid check (event_type in ('study', 'exam', 'deadline', 'meeting', 'personal', 'other')),
  constraint recurring_events_end_after_start check (end_date is null or end_date >= start_date),
  constraint recurring_events_month_day_valid check (recurrence_month_day is null or (recurrence_month_day >= 1 and recurrence_month_day <= 31)),
  constraint recurring_events_month_weekday_valid check (recurrence_month_weekday is null or (recurrence_month_weekday >= 0 and recurrence_month_weekday <= 6)),
  constraint recurring_events_month_weekday_value_valid check (recurrence_month_weekday_value is null or (recurrence_month_weekday_value >= 1 and recurrence_month_weekday_value <= 5))
);

-- =========================
-- INDEXES
-- =========================
-- Events
create index idx_events_user_id on public.events(user_id);
create index idx_events_start_at on public.events(start_at);
create index idx_events_end_at on public.events(end_at);
create index idx_events_event_type on public.events(event_type);
create index idx_events_status on public.events(status);
create index idx_events_related_entity on public.events(related_entity_type, related_entity_id);
create index idx_events_external_id on public.events(external_id);
create index idx_events_user_start on public.events(user_id, start_at);
create index idx_events_user_date on public.events(user_id, start_at);

-- Reminders
create index idx_reminders_user_id on public.reminders(user_id);
create index idx_reminders_event_id on public.reminders(event_id);
create index idx_reminders_remind_at on public.reminders(remind_at);
create index idx_reminders_is_sent on public.reminders(is_sent);
create index idx_reminders_is_dismissed on public.reminders(is_dismissed);
create index idx_reminders_user_remind on public.reminders(user_id, remind_at);

-- Recurring Events
create index idx_recurring_events_user_id on public.recurring_events(user_id);
create index idx_recurring_events_type on public.recurring_events(recurrence_type);
create index idx_recurring_events_is_active on public.recurring_events(is_active);
create index idx_recurring_events_date_range on public.recurring_events(start_date, end_date);

-- =========================
-- FUNCTIONS
-- =========================

-- Create event
create or replace function public.create_event(
  p_user_id uuid,
  p_title text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_all_day boolean,
  p_event_type text,
  p_description text,
  p_location text,
  p_reminder_minutes_before integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.events (
    user_id,
    title,
    start_at,
    end_at,
    all_day,
    event_type,
    description,
    location,
    reminder_minutes_before
  )
  values (
    p_user_id,
    p_title,
    p_start_at,
    p_end_at,
    p_all_day,
    p_event_type,
    p_description,
    p_location,
    p_reminder_minutes_before
  )
  returning id into v_event_id;
  
  return v_event_id;
end;
$$;

-- Create reminder
create or replace function public.create_reminder(
  p_user_id uuid,
  p_title text,
  p_remind_at timestamptz,
  p_event_id uuid,
  p_method text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminder_id uuid;
begin
  insert into public.reminders (
    user_id,
    event_id,
    title,
    remind_at,
    method,
    description
  )
  values (
    p_user_id,
    p_event_id,
    p_title,
    p_remind_at,
    p_method,
    p_description
  )
  returning id into v_reminder_id;
  
  return v_reminder_id;
end;
$$;

-- Create recurring event
create or replace function public.create_recurring_event(
  p_user_id uuid,
  p_title text,
  p_recurrence_type text,
  p_start_date date,
  p_end_date date,
  p_recurrence_interval integer,
  p_recurrence_days jsonb,
  p_start_time time,
  p_duration_minutes integer,
  p_event_type text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recurring_id uuid;
begin
  insert into public.recurring_events (
    user_id,
    title,
    recurrence_type,
    start_date,
    end_date,
    recurrence_interval,
    recurrence_days,
    start_time,
    duration_minutes,
    event_type,
    description
  )
  values (
    p_user_id,
    p_title,
    p_recurrence_type,
    p_start_date,
    p_end_date,
    p_recurrence_interval,
    p_recurrence_days,
    p_start_time,
    p_duration_minutes,
    p_event_type,
    p_description
  )
  returning id into v_recurring_id;
  
  return v_recurring_id;
end;
$$;

-- Generate events from recurring event (run by scheduled job)
create or replace function public.generate_recurring_events(p_recurring_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recurring public.recurring_events;
  v_generated_count integer default 0;
  v_current_date date;
  v_end_date date;
  v_event_start_at timestamptz;
  v_event_end_at timestamptz;
begin
  select * into v_recurring
  from public.recurring_events
  where id = p_recurring_event_id
    and is_active = true;
  
  if not found then
    return 0;
  end if;
  
  v_current_date := greatest(v_recurring.start_date, current_date);
  v_end_date := coalesce(v_recurring.end_date, v_current_date + interval '1 year');
  
  -- Generate events for the next 30 days (or until end_date)
  while v_current_date <= least(v_end_date, current_date + interval '30 days') loop
    -- Check if date is excluded
    if not (v_current_date::text = any(select jsonb_array_elements_text(v_recurring.excluded_dates))) then
      -- Check if date matches recurrence pattern
      if (
        (v_recurring.recurrence_type = 'daily') or
        (v_recurring.recurrence_type = 'weekly' and extract(dow from v_current_date) = any(select jsonb_array_elements_text(v_recurring.recurrence_days)::integer)) or
        (v_recurring.recurrence_type = 'monthly' and extract(day from v_current_date) = v_recurring.recurrence_month_day) or
        (v_recurring.recurrence_type = 'yearly' and extract(month from v_current_date) = extract(month from v_recurring.start_date) and extract(day from v_current_date) = extract(day from v_recurring.start_date))
      ) then
        -- Calculate event times
        if v_recurring.start_time is not null then
          v_event_start_at := v_current_date + v_recurring.start_time;
          if v_recurring.duration_minutes is not null then
            v_event_end_at := v_event_start_at + (v_recurring.duration_minutes || ' minutes')::interval;
          end if;
        else
          v_event_start_at := v_current_date;
          v_event_end_at := v_current_date + interval '1 day';
        end if;
        
        -- Check if event already exists
        if not exists (
          select 1 from public.events
          where external_id = p_recurring_event_id::text
            and date_trunc('day', start_at) = v_current_date
        ) then
          insert into public.events (
            user_id,
            title,
            description,
            start_at,
            end_at,
            all_day,
            event_type,
            external_id,
            external_provider
          )
          values (
            v_recurring.user_id,
            v_recurring.title,
            v_recurring.description,
            v_event_start_at,
            v_event_end_at,
            v_recurring.all_day,
            v_recurring.event_type,
            p_recurring_event_id::text,
            'recurring'
          );
          
          v_generated_count := v_generated_count + 1;
        end if;
      end if;
    end if;
    
    v_current_date := v_current_date + interval '1 day';
  end loop;
  
  return v_generated_count;
end;
$$;

-- Get events for date range
create or replace function public.get_events_for_range(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  title text,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean,
  event_type text,
  location text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    e.id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.all_day,
    e.event_type,
    e.location,
    e.status
  from public.events e
  where e.user_id = p_user_id
    and e.status != 'cancelled'
    and date_trunc('day', e.start_at) >= p_start_date
    and date_trunc('day', e.start_at) <= p_end_date
  order by e.start_at;
end;
$$;

-- Mark reminder as sent
create or replace function public.mark_reminder_sent(p_reminder_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reminders
  set
    is_sent = true,
    sent_at = now()
  where id = p_reminder_id;
  
  return found;
end;
$$;

-- Dismiss reminder
create or replace function public.dismiss_reminder(p_reminder_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reminders
  set
    is_dismissed = true,
    dismissed_at = now()
  where id = p_reminder_id;
  
  return found;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on events
create trigger update_event_updated_at
before update on public.events
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on reminders
create trigger update_reminder_updated_at
before update on public.reminders
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on recurring_events
create trigger update_recurring_event_updated_at
before update on public.recurring_events
for each row
execute procedure public.update_timestamp();
