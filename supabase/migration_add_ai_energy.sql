-- Add AI Energy persistence fields and ledger support

alter table if exists public.users
  add column if not exists ai_energy integer not null default 15,
  add column if not exists ai_energy_max integer not null default 15,
  add column if not exists last_energy_regeneration timestamptz not null default now();

update public.users
set
  ai_energy = coalesce(ai_energy, credits),
  ai_energy_max = coalesce(ai_energy_max,
    case
      when plan = 'pro' then 250
      when plan = 'premium' then 0
      else 15
    end
  ),
  last_energy_regeneration = coalesce(last_energy_regeneration, now())
where true;

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
    perform public.reset_energy(
      p_user,
      coalesce(v_max_energy, case when v_plan = 'pro' then 250 else 15 end),
      'Daily energy reset',
      case when p_idempotency is null then null else p_idempotency || '_reset' end
    );
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

alter table if exists public.energy_transactions enable row level security;

drop policy if exists energy_tx_select_own on public.energy_transactions;
create policy energy_tx_select_own on public.energy_transactions for select using (auth.uid() = user_id);
