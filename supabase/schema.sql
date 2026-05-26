-- Notevoro AI production schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor (recommended: "Run with RLS").

create extension if not exists "pgcrypto";

-- =========================
-- Users (profile) table
-- =========================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Email can be null for some OAuth flows; enforce uniqueness only when present.
  email text,
  name text not null,
  avatar text,
  google_id text,
  personalization jsonb not null default '{}'::jsonb,

  -- engagement
  xp integer not null default 0,
  streak integer not null default 0,
  last_active timestamptz,

  -- plan + credits
  plan text not null default 'free' check (plan in ('free','pro','premium')),
  credits integer not null default 50,
  ai_energy integer not null default 20,
  ai_energy_max integer not null default 20,
  last_energy_regeneration timestamptz not null default now(),
  credits_reset_at timestamptz,
  last_reset_date date not null default current_date,

  -- trial system
  trial_start timestamptz,
  trial_used boolean not null default false,
  is_trial_active boolean not null default false,

  -- free quiz quota
  quiz_count_month integer not null default 0,
  quiz_count_month_reset_at date not null default current_date,

  -- daily reward (+5 credits) tracking
  daily_reward_date date,
  weekly_reward_claimed boolean not null default false,

  -- subscription (Razorpay)
  razorpay_customer_id text,
  razorpay_subscription_id text,
  subscription_status text not null default 'inactive' check (subscription_status in ('inactive','active','past_due','cancelled')),
  next_billing_date timestamptz,
  last_payment_date timestamptz,

  -- learning stats
  quizzes_taken integer not null default 0,
  correct_answers integer not null default 0,
  total_questions integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_plan on public.users(plan);
create index if not exists idx_users_subscription_status on public.users(subscription_status);
create index if not exists idx_users_razorpay_subscription_id on public.users(razorpay_subscription_id);
create unique index if not exists idx_users_google_id_unique on public.users(google_id) where google_id is not null;
create unique index if not exists idx_users_email_unique on public.users(email) where email is not null;

-- Migration safety for existing DBs created with NOT NULL + UNIQUE(email)
alter table if exists public.users alter column email drop not null;
alter table if exists public.users drop constraint if exists users_email_key;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Table: whatsapp_link_tokens
create table if not exists public.whatsapp_link_tokens (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  phone text,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null,
  used boolean default false not null,
  used_at timestamptz
);

create index if not exists idx_whatsapp_link_tokens_user_id on public.whatsapp_link_tokens(user_id);

-- Function: consume_whatsapp_token
create or replace function public.consume_whatsapp_token(p_token text, p_phone text)
returns json
language plpgsql
as $$
declare
  v_token record;
  v_user record;
begin
  select * into v_token from public.whatsapp_link_tokens where token = p_token for update;
  if not found then
    raise exception 'TOKEN_NOT_FOUND';
  end if;

  if v_token.used then
    raise exception 'TOKEN_ALREADY_USED';
  end if;

  if v_token.expires_at < now() then
    raise exception 'TOKEN_EXPIRED';
  end if;

  -- mark token used
  update public.whatsapp_link_tokens set used = true, used_at = now(), phone = p_phone where token = p_token;

  -- update user personalization and phone_number (set personalization in a single assignment)
  update public.users set
    phone_number = coalesce(p_phone, phone_number),
    personalization = (
      jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(personalization, '{}')::jsonb, '{whatsapp_verified}', 'true'::jsonb, true),
          '{whatsapp_phone}', to_jsonb(coalesce(p_phone, phone_number)::text), true
        ),
        '{whatsapp_linked_at}', to_jsonb(now()::text), true
      )
    )
  where id = v_token.user_id;

  select id, phone_number, personalization into v_user from public.users where id = v_token.user_id;

  return row_to_json(v_user);
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id, email, name, avatar, plan, credits, ai_energy, ai_energy_max, last_energy_regeneration, credits_reset_at, last_reset_date,
    trial_start, is_trial_active, subscription_status, weekly_reward_claimed, personalization, created_at, updated_at
  )
  values (
    new.id,
    lower(nullif(new.email, '')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'free',
    20, -- Start with 20 credits/day for free users
    20, -- Start with 20 AI Energy for free users
    20,
    now(),
    now(),
    current_date,
    NULL, -- trial_start
    false,  -- is_trial_active
    'inactive',
    false,
    '{}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        avatar = excluded.avatar,
        personalization = coalesce(public.users.personalization, '{}'::jsonb),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- =========================
-- App data tables
-- =========================
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_chats_updated_at on public.chats(updated_at);

drop trigger if exists trg_chats_updated_at on public.chats;
create trigger trg_chats_updated_at
before update on public.chats
for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  difficulty text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_quizzes_user_id on public.quizzes(user_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  topic text,
  correct integer not null default 0,
  total integer not null default 0,
  xp_gained integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_created_at on public.quiz_attempts(created_at);

create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_flashcard_decks_user_id on public.flashcard_decks(user_id);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  topic text,
  source_chat_id uuid references public.chats(id) on delete set null,
  public_slug text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_public_slug on public.notes(public_slug);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal text not null,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_study_plans_user_id on public.study_plans(user_id);

-- Pending signup state + OTP (custom email auth)
create table if not exists public.pending_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  personalization jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_otps_email on public.auth_otps(email);
create index if not exists idx_auth_otps_expires on public.auth_otps(expires_at);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  key text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique(user_id, key)
);
create index if not exists idx_achievements_user_id on public.achievements(user_id);

create table if not exists public.campaign_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  level_number integer not null check (level_number > 0),
  completed boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, level_number)
);
create index if not exists idx_campaign_progress_user_id on public.campaign_progress(user_id);
create index if not exists idx_campaign_progress_level on public.campaign_progress(level_number);

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  duration_minutes integer not null default 20,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_mock_tests_user_id on public.mock_tests(user_id);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  topic text,
  correct integer not null default 0,
  total integer not null default 0,
  xp_gained integer not null default 0,
  time_taken_seconds integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_mock_attempts_user_id on public.mock_attempts(user_id);

create table if not exists public.file_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  type text,
  action text not null,
  result text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_file_analyses_user_id on public.file_analyses(user_id);

-- Legacy one-time orders (kept for backwards-compat / audit)
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null,
  amount integer not null,
  status text not null,
  payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_user_id on public.orders(user_id);

-- =========================
-- Credit ledger + idempotency
-- =========================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null, -- negative for deductions, positive for resets/rewards
  kind text not null check (kind in ('deduct','reset','reward')),
  feature text,
  reason text,
  idempotency_key text unique,
  resulting_credits integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_tx_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_tx_created_at on public.credit_transactions(created_at);

create table if not exists public.energy_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('deduct','reset','reward')),
  feature text,
  reason text,
  idempotency_key text unique,
  resulting_energy integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_energy_tx_user_id on public.energy_transactions(user_id);
create index if not exists idx_energy_tx_created_at on public.energy_transactions(created_at);

create or replace function public.deduct_energy(
  p_user uuid,
  p_amount integer,
  p_feature text,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency is not null then
    select resulting_energy into v_new
    from public.energy_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select ai_energy into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_current < p_amount then
    raise exception 'INSUFFICIENT_ENERGY';
  end if;

  v_new := v_current - p_amount;
  update public.users set ai_energy = v_new where id = p_user;

  insert into public.energy_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_energy)
  values (p_user, -p_amount, 'deduct', p_feature, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

create or replace function public.reward_energy(
  p_user uuid,
  p_amount integer,
  p_feature text,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency is not null then
    select resulting_energy into v_new
    from public.energy_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select ai_energy into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  v_new := v_current + p_amount;
  update public.users set ai_energy = v_new where id = p_user;

  insert into public.energy_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_energy)
  values (p_user, p_amount, 'reward', p_feature, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

create or replace function public.reset_energy(
  p_user uuid,
  p_new_energy integer,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
  v_delta integer;
begin
  if p_new_energy is null or p_new_energy < 0 then
    raise exception 'INVALID_ENERGY';
  end if;

  if p_idempotency is not null then
    select resulting_energy into v_new
    from public.energy_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select ai_energy into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  v_new := p_new_energy;
  v_delta := v_new - v_current;

  update public.users
  set ai_energy = v_new,
      ai_energy_max = p_new_energy,
      last_energy_regeneration = now()
  where id = p_user;

  insert into public.energy_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_energy)
  values (p_user, v_delta, 'reset', null, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

create or replace function public.check_and_deduct_energy(
  p_user uuid,
  p_feature text,
  p_reason text default 'Feature usage',
  p_idempotency text default null,
  p_cost integer default 1
)
returns integer
language plpgsql
as $$
declare
  v_plan text;
  v_current_energy integer;
  v_remaining integer;
  v_max_energy integer;
  v_last_regeneration timestamptz;
  v_reset_needed boolean := false;
begin
  select plan, ai_energy, ai_energy_max, last_energy_regeneration
  into v_plan, v_current_energy, v_max_energy, v_last_regeneration
  from public.users
  where id = p_user
  for update;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_plan = 'premium' then
    return 1;
  end if;

  if v_last_regeneration is null or v_last_regeneration < now() - interval '24 hours' then
    perform public.reset_energy(p_user, coalesce(v_max_energy, case when v_plan in ('pro', 'trial') then 250 else 20 end), 'Daily energy reset', p_idempotency || '_reset');
    select ai_energy into v_current_energy from public.users where id = p_user;
  end if;

  if v_current_energy < p_cost then
    raise exception 'INSUFFICIENT_ENERGY';
  end if;

  v_remaining := v_current_energy - p_cost;
  update public.users set ai_energy = v_remaining where id = p_user;

  insert into public.energy_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_energy)
  values (p_user, -p_cost, 'deduct', p_feature, p_reason, p_idempotency, v_remaining);

  return v_remaining;
end;
$$;

create or replace function public.deduct_credits(
  p_user uuid,
  p_amount integer,
  p_feature text,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency is not null then
    select resulting_credits into v_new
    from public.credit_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select credits into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_current < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_new := v_current - p_amount;
  update public.users set credits = v_new where id = p_user;

  insert into public.credit_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_credits)
  values (p_user, -p_amount, 'deduct', p_feature, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

create or replace function public.reset_credits(
  p_user uuid,
  p_new_credits integer,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
  v_delta integer;
begin
  if p_new_credits is null or p_new_credits < 0 then
    raise exception 'INVALID_CREDITS';
  end if;

  if p_idempotency is not null then
    select resulting_credits into v_new
    from public.credit_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select credits into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  v_new := p_new_credits;
  v_delta := v_new - v_current;

  update public.users
  set credits = v_new,
      credits_reset_at = now(),
      last_reset_date = current_date
  where id = p_user;

  insert into public.credit_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_credits)
  values (p_user, v_delta, 'reset', null, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

drop function if exists public.consume_free_quiz(uuid, integer, text);

create or replace function public.reward_credits(
  p_user uuid,
  p_amount integer,
  p_feature text,
  p_reason text,
  p_idempotency text
)
returns integer
language plpgsql
as $$
declare
  v_current integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency is not null then
    select resulting_credits into v_new
    from public.credit_transactions
    where idempotency_key = p_idempotency;
    if found then
      return v_new;
    end if;
  end if;

  select credits into v_current
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  v_new := v_current + p_amount;
  update public.users set credits = v_new where id = p_user;

  insert into public.credit_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_credits)
  values (p_user, p_amount, 'reward', p_feature, p_reason, p_idempotency, v_new);

  return v_new;
end;
$$;

-- =========================
-- Daily credit reset with trial logic
-- =========================
create or replace function public.daily_credit_reset(p_user uuid)
returns integer
language plpgsql
as $$
declare
  v_plan text;
  v_is_trial_active boolean;
  v_trial_start timestamptz;
  v_last_reset_date date;
  v_new_credits integer;
  v_idempotency_key text;
begin
  -- Get user info
  select plan, is_trial_active, trial_start, last_reset_date
  into v_plan, v_is_trial_active, v_trial_start, v_last_reset_date
  from public.users
  where id = p_user
  for update;
  
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  -- Check if reset is needed (only once per day)
  if v_last_reset_date >= current_date then
    -- Already reset today, return current credits
    return (select credits from public.users where id = p_user);
  end if;

  -- Determine credit amount based on trial and plan
  if v_is_trial_active = true and v_trial_start is not null then
    -- Check if trial is still active (7 days)
    if v_trial_start >= (now() - interval '7 days') then
      v_new_credits := 250; -- Trial gets 250 credits/day
    else
      -- Trial expired, deactivate and set to free plan
      update public.users 
      set is_trial_active = false,
          plan = 'free'
      where id = p_user;
      
      v_new_credits := 20; -- Free plan credits
    end if;
  elsif v_plan = 'free' then
    v_new_credits := 20;
  elsif v_plan = 'pro' then
    v_new_credits := 250; -- Pro gets 250 credits/day
  elsif v_plan = 'premium' then
    v_new_credits := 250; -- Premium gets 250 credits/day
  else
    v_new_credits := 20; -- Default to free plan
  end if;

  -- Create idempotency key for today's reset
  v_idempotency_key := 'daily_reset_' || to_char(current_date, 'YYYY_MM_DD') || '_' || p_user::text;

  -- Reset credits using existing function
  return public.reset_credits(p_user, v_new_credits, 'Daily credit reset', v_idempotency_key);
end;
$$;

-- =========================
-- Centralized credit checking function
-- =========================
create or replace function public.check_and_deduct_credits(
  p_user uuid,
  p_feature text,
  p_reason text default 'Feature usage',
  p_idempotency text default null,
  p_cost integer default 1
)
returns integer
language plpgsql
as $$
declare
  v_current_credits integer;
  v_remaining_credits integer;
  v_cost_to_deduct integer;
  v_reset_needed boolean := false;
begin
  -- Check if daily reset is needed
  select last_reset_date < current_date into v_reset_needed
  from public.users
  where id = p_user;
  
  if v_reset_needed then
    -- Perform daily reset first
    perform public.daily_credit_reset(p_user);
  end if;

  -- Get current credits
  select credits into v_current_credits
  from public.users
  where id = p_user;
  
  if v_current_credits < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  -- Use the provided cost parameter
  -- Default to 1 if not specified for backward compatibility
  v_cost_to_deduct := p_cost;
  
  if v_current_credits < v_cost_to_deduct then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_remaining_credits := v_current_credits - v_cost_to_deduct;
  update public.users set credits = v_remaining_credits where id = p_user;

  -- Insert new transaction
  insert into public.credit_transactions(user_id, amount, kind, feature, reason, idempotency_key, resulting_credits)
  values (p_user, -v_cost_to_deduct, 'deduct', p_feature, p_reason, p_idempotency, v_remaining_credits);
  
  return v_remaining_credits;
end;
$$;

-- =========================
-- Razorpay webhook idempotency
-- =========================
create table if not exists public.razorpay_events (
  event_id text primary key,
  created_at timestamptz not null default now()
);

-- =========================
-- RLS
-- =========================
alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.notes enable row level security;
alter table public.study_plans enable row level security;
alter table public.pending_signups enable row level security;
alter table public.auth_otps enable row level security;
alter table public.achievements enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_attempts enable row level security;
alter table public.file_analyses enable row level security;
alter table public.orders enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.energy_transactions enable row level security;
alter table public.razorpay_events enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "chats_all_own" on public.chats;
create policy "chats_all_own" on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages_all_own" on public.messages;
create policy "messages_all_own" on public.messages for all using (
  exists(select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
) with check (
  exists(select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
);

drop policy if exists "quizzes_all_own" on public.quizzes;
create policy "quizzes_all_own" on public.quizzes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "quiz_attempts_all_own" on public.quiz_attempts;
create policy "quiz_attempts_all_own" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "flashcards_all_own" on public.flashcard_decks;
create policy "flashcards_all_own" on public.flashcard_decks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_all_own" on public.notes;
create policy "notes_all_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notes_public_read" on public.notes;
create policy "notes_public_read" on public.notes for select using (is_public = true);

drop policy if exists "study_plans_all_own" on public.study_plans;
create policy "study_plans_all_own" on public.study_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Block client access to pending signup/otp tables (server-only via service role)
drop policy if exists "pending_signups_block" on public.pending_signups;
create policy "pending_signups_block" on public.pending_signups for select using (false);
drop policy if exists "auth_otps_block" on public.auth_otps;
create policy "auth_otps_block" on public.auth_otps for select using (false);

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);

drop policy if exists "campaign_progress_all_own" on public.campaign_progress;
create policy "campaign_progress_all_own" on public.campaign_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mock_tests_all_own" on public.mock_tests;
create policy "mock_tests_all_own" on public.mock_tests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "mock_attempts_all_own" on public.mock_attempts;
create policy "mock_attempts_all_own" on public.mock_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "file_analyses_all_own" on public.file_analyses;
create policy "file_analyses_all_own" on public.file_analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders_all_own" on public.orders;
create policy "orders_all_own" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "credit_tx_select_own" on public.credit_transactions;
create policy "credit_tx_select_own" on public.credit_transactions for select using (auth.uid() = user_id);

drop policy if exists "energy_tx_select_own" on public.energy_transactions;
create policy "energy_tx_select_own" on public.energy_transactions for select using (auth.uid() = user_id);

drop policy if exists "razorpay_events_block" on public.razorpay_events;
create policy "razorpay_events_block" on public.razorpay_events for select using (false);