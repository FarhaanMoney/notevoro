-- Notevoro AI production schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor (recommended: "Run with RLS").

create extension if not exists "pgcrypto";

-- =========================
-- Users (profile) table
-- =========================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  avatar text,
  google_id text,

  -- engagement
  xp integer not null default 0,
  streak integer not null default 0,
  last_active timestamptz,

  -- plan + credits
  plan text not null default 'free' check (plan in ('free','pro','premium')),
  credits integer not null default 50,
  credits_reset_at timestamptz,
  last_reset_date date not null default current_date,

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
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
    id, email, name, avatar, plan, credits, credits_reset_at, last_reset_date,
    subscription_status, weekly_reward_claimed, created_at, updated_at
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'free',
    50,
    now(),
    current_date,
    'inactive',
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;

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
alter table public.achievements enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_attempts enable row level security;
alter table public.file_analyses enable row level security;
alter table public.orders enable row level security;
alter table public.credit_transactions enable row level security;
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

drop policy if exists "razorpay_events_block" on public.razorpay_events;
create policy "razorpay_events_block" on public.razorpay_events for select using (false);