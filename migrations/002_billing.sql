-- Complete billing system with support for Razorpay, Stripe, PayPal
-- Tracks all payment history permanently

-- =========================
-- USAGE LIMITS (Plan Definitions)
-- =========================
-- Defines limits for each subscription plan
create table public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  plan text not null, -- 'free', 'pro', 'premium'
  
  -- AI Features
  ai_chat_per_day integer default 10,
  ai_messages_per_day integer default 100,
  ai_images_per_day integer default 5,
  web_search_per_day integer default 20,
  youtube_search_per_day integer default 10,
  
  -- Content Creation
  notes_per_day integer default 50,
  flashcard_sets_per_day integer default 10,
  quizzes_per_day integer default 10,
  tests_per_day integer default 5,
  presentations_per_day integer default 3,
  research_reports_per_day integer default 5,
  
  -- Storage
  storage_mb integer default 500,
  
  -- Advanced Features
  atlas_sessions_per_day integer default 3,
  export_enabled boolean default false,
  api_access boolean default false,
  priority_support boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint usage_limits_plan_unique unique (plan),
  constraint usage_limits_non_negative check (
    ai_chat_per_day >= -1 and
    ai_messages_per_day >= -1 and
    ai_images_per_day >= -1 and
    web_search_per_day >= -1 and
    youtube_search_per_day >= -1 and
    notes_per_day >= -1 and
    flashcard_sets_per_day >= -1 and
    quizzes_per_day >= -1 and
    tests_per_day >= -1 and
    presentations_per_day >= -1 and
    research_reports_per_day >= -1 and
    storage_mb >= -1 and
    atlas_sessions_per_day >= -1
  )
);

-- Insert default plan limits
insert into public.usage_limits (plan, ai_chat_per_day, ai_messages_per_day, ai_images_per_day, web_search_per_day, youtube_search_per_day, notes_per_day, flashcard_sets_per_day, quizzes_per_day, tests_per_day, presentations_per_day, research_reports_per_day, storage_mb, atlas_sessions_per_day, export_enabled, api_access, priority_support)
values
  ('free', 10, 100, 5, 20, 10, 50, 10, 10, 5, 3, 5, 500, 3, false, false, false),
  ('pro', 50, 500, 20, 100, 50, 200, 50, 50, 20, 10, 20, 5000, 10, true, false, true),
  ('premium', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, true, true, true)
on conflict (plan) do nothing;

-- =========================
-- SUBSCRIPTIONS
-- =========================
-- Active user subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Plan Details
  plan text not null default 'free',
  status text not null default 'active', -- 'active', 'past_due', 'cancelled', 'expired', 'trialing'
  
  -- Provider
  provider text not null default 'internal', -- 'internal', 'razorpay', 'stripe', 'paypal'
  provider_subscription_id text, -- External subscription ID
  
  -- Billing Cycle
  billing_interval text default 'month', -- 'month', 'year'
  current_period_start timestamptz,
  current_period_end timestamptz,
  
  -- Trial
  trial_start timestamptz,
  trial_end timestamptz,
  
  -- Cancellation
  cancel_at_period_end boolean default false,
  cancelled_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint subscriptions_user_active unique (user_id, status)
);

-- =========================
-- PAYMENTS
-- =========================
-- Permanent payment records (never delete)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  
  -- Amount
  amount integer not null, -- in smallest currency unit (cents for USD, paise for INR)
  currency text not null default 'USD',
  
  -- Status
  status text not null default 'pending', -- 'pending', 'completed', 'failed', 'refunded', 'partial_refund'
  
  -- Provider
  provider text not null, -- 'razorpay', 'stripe', 'paypal'
  provider_payment_id text,
  
  -- Payment Method
  payment_method jsonb, -- Store payment method details (card, upi, etc.)
  
  -- Description
  description text,
  metadata jsonb default '{}'::jsonb,
  
  -- Refund Info
  refund_amount integer default 0,
  refund_reason text,
  refunded_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  
  -- Constraints
  constraint payments_amount_positive check (amount > 0),
  constraint payments_refund_valid check (refund_amount >= 0 and refund_amount <= amount)
);

-- =========================
-- PAYMENT ATTEMPTS
-- =========================
-- Track every payment attempt (including failures)
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  
  -- Provider
  provider text not null,
  provider_attempt_id text,
  
  -- Status
  status text not null, -- 'initiated', 'processing', 'succeeded', 'failed', 'cancelled'
  
  -- Error Details
  error_code text,
  error_message text,
  
  -- Request/Response
  request_data jsonb,
  response_data jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- =========================
-- REFUNDS
-- =========================
-- Detailed refund tracking
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Amount
  amount integer not null,
  currency text not null,
  
  -- Status
  status text not null default 'pending', -- 'pending', 'processed', 'failed'
  
  -- Provider
  provider text not null,
  provider_refund_id text,
  
  -- Reason
  reason text,
  reason_code text,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  processed_at timestamptz,
  
  -- Constraints
  constraint refunds_amount_positive check (amount > 0)
);

-- =========================
-- WEBHOOK EVENTS
-- =========================
-- Log all webhook events from payment providers
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  
  -- Provider
  provider text not null,
  event_type text not null,
  event_id text, -- Provider's event ID
  
  -- Data
  payload jsonb not null,
  
  -- Processing
  processed boolean default false,
  processed_at timestamptz,
  error_message text,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint webhook_events_provider_event_unique unique (provider, event_id)
);

-- =========================
-- SUBSCRIPTION HISTORY
-- =========================
-- Track all subscription changes (plan changes, cancellations, renewals)
create table public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  
  -- Change Details
  action text not null, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'resumed'
  from_plan text,
  to_plan text,
  from_status text,
  to_status text,
  
  -- Provider
  provider text,
  provider_event_id text,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now()
);

-- =========================
-- INDEXES
-- =========================
-- Usage Limits
create index idx_usage_limits_plan on public.usage_limits(plan);

-- Subscriptions
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_plan on public.subscriptions(plan);
create index idx_subscriptions_provider on public.subscriptions(provider);
create index idx_subscriptions_period_end on public.subscriptions(current_period_end);
create index idx_subscriptions_user_status on public.subscriptions(user_id, status);

-- Payments
create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_subscription_id on public.payments(subscription_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_provider on public.payments(provider);
create index idx_payments_created_at on public.payments(created_at);
create index idx_payments_user_created on public.payments(user_id, created_at desc);

-- Payment Attempts
create index idx_payment_attempts_user_id on public.payment_attempts(user_id);
create index idx_payment_attempts_payment_id on public.payment_attempts(payment_id);
create index idx_payment_attempts_status on public.payment_attempts(status);
create index idx_payment_attempts_created_at on public.payment_attempts(created_at);

-- Refunds
create index idx_refunds_payment_id on public.refunds(payment_id);
create index idx_refunds_user_id on public.refunds(user_id);
create index idx_refunds_status on public.refunds(status);
create index idx_refunds_created_at on public.refunds(created_at);

-- Webhook Events
create index idx_webhook_events_provider on public.webhook_events(provider);
create index idx_webhook_events_event_type on public.webhook_events(event_type);
create index idx_webhook_events_processed on public.webhook_events(processed);
create index idx_webhook_events_created_at on public.webhook_events(created_at);

-- Subscription History
create index idx_subscription_history_user_id on public.subscription_history(user_id);
create index idx_subscription_history_subscription_id on public.subscription_history(subscription_id);
create index idx_subscription_history_action on public.subscription_history(action);
create index idx_subscription_history_created_at on public.subscription_history(created_at);

-- =========================
-- FUNCTIONS
-- =========================

-- Get current subscription for user
create or replace function public.get_user_subscription(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription jsonb;
  v_limits jsonb;
begin
  -- Get active subscription
  select row_to_json(s) into v_subscription
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status = 'active'
  limit 1;
  
  if v_subscription is null then
    -- Return default free subscription
    select row_to_json(l) into v_limits
    from public.usage_limits l
    where l.plan = 'free'
    limit 1;
    
    return jsonb_build_object(
      'plan', 'free',
      'status', 'active',
      'limits', v_limits,
      'is_trial', false
    );
  end if;
  
  -- Get limits for the plan
  select row_to_json(l) into v_limits
  from public.usage_limits l
  where l.plan = (v_subscription->>'plan')::text
  limit 1;
  
  return v_subscription || jsonb_build_object(
    'limits', v_limits,
    'is_trial', (v_subscription->>'trial_start') is not null
  );
end;
$$;

-- Create or update subscription
create or replace function public.create_or_update_subscription(
  p_user_id uuid,
  p_plan text,
  p_provider text,
  p_provider_subscription_id text,
  p_billing_interval text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
  v_status text;
begin
  -- Check if user has existing subscription
  select id, status into v_subscription_id, v_status
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing')
  limit 1;

  if v_subscription_id is not null then
    -- Update existing subscription
    update public.subscriptions
    set
      plan = p_plan,
      provider = p_provider,
      provider_subscription_id = p_provider_subscription_id,
      billing_interval = p_billing_interval,
      current_period_start = coalesce(p_current_period_start, current_period_start),
      current_period_end = coalesce(p_current_period_end, current_period_end),
      updated_at = now()
    where id = v_subscription_id;

    return v_subscription_id;
  else
    -- Create new subscription
    insert into public.subscriptions (
      user_id,
      plan,
      provider,
      provider_subscription_id,
      billing_interval,
      current_period_start,
      current_period_end
    )
    values (
      p_user_id,
      p_plan,
      p_provider,
      p_provider_subscription_id,
      p_billing_interval,
      p_current_period_start,
      p_current_period_end
    )
    returning id into v_subscription_id;
    
    -- Log creation
    insert into public.subscription_history (
      user_id,
      subscription_id,
      action,
      to_plan,
      to_status,
      provider
    )
    values (
      p_user_id,
      v_subscription_id,
      'created',
      p_plan,
      'active',
      p_provider
    );
    
    return v_subscription_id;
  end if;
end;
$$;

-- Cancel subscription
create or replace function public.cancel_subscription(
  p_user_id uuid,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  select id into v_subscription_id
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  limit 1;

  if not found then
    return false;
  end if;

  if p_cancel_at_period_end then
    -- Mark for cancellation at period end
    update public.subscriptions
    set
      cancel_at_period_end = true,
      updated_at = now()
    where id = v_subscription_id;
  else
    -- Cancel immediately
    update public.subscriptions
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancel_at_period_end = false,
      updated_at = now()
    where id = v_subscription_id;
  end if;

  return true;
end;
$$;

-- Create payment record
create or replace function public.create_payment(
  p_user_id uuid,
  p_subscription_id uuid,
  p_amount integer,
  p_currency text,
  p_provider text,
  p_provider_payment_id text,
  p_payment_method jsonb,
  p_description text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
begin
  insert into public.payments (
    user_id,
    subscription_id,
    amount,
    currency,
    provider,
    provider_payment_id,
    payment_method,
    description,
    metadata
  )
  values (
    p_user_id,
    p_subscription_id,
    p_amount,
    p_currency,
    p_provider,
    p_provider_payment_id,
    p_payment_method,
    p_description,
    p_metadata
  )
  returning id into v_payment_id;
  
  return v_payment_id;
end;
$$;

-- Update payment status
create or replace function public.update_payment_status(
  p_payment_id uuid,
  p_status text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  select status into v_old_status
  from public.payments
  where id = p_payment_id;

  if not found then
    return false;
  end if;

  update public.payments
  set
    status = p_status,
    error_code = p_error_code,
    error_message = p_error_message,
    updated_at = now()
  where id = p_payment_id;

  return true;
end;
$$;

-- Process refund
create or replace function public.create_refund(
  p_payment_id uuid,
  p_amount integer,
  p_reason text,
  p_reason_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund_id uuid;
  v_payment public.payments;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id;
  
  if v_payment is null then
    return null;
  end if;
  
  insert into public.refunds (
    payment_id,
    user_id,
    amount,
    currency,
    provider,
    reason,
    reason_code
  )
  values (
    p_payment_id,
    v_payment.user_id,
    p_amount,
    v_payment.currency,
    v_payment.provider,
    p_reason,
    p_reason_code
  )
  returning id into v_refund_id;
  
  -- Update payment record
  update public.payments
  set
    refund_amount = refund_amount + p_amount,
    refunded_at = now(),
    status = case
      when (v_payment.amount - v_payment.refund_amount - p_amount) = 0 then 'refunded'
      else 'partial_refund'
    end
  where id = p_payment_id;
  
  return v_refund_id;
end;
$$;

-- Log webhook event
create or replace function public.log_webhook_event(
  p_provider text,
  p_event_type text,
  p_event_id text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.webhook_events (
    provider,
    event_type,
    event_id,
    payload
  )
  values (
    p_provider,
    p_event_type,
    p_event_id,
    p_payload
  )
  on conflict (provider, event_id) do nothing
  returning id into v_event_id;
  
  return v_event_id;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on subscriptions
create trigger update_subscription_updated_at
before update on public.subscriptions
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on usage_limits
create trigger update_usage_limits_updated_at
before update on public.usage_limits
for each row
execute procedure public.update_profile_timestamp();
