-- Add missing trial metadata columns and align AI energy defaults with current plan rules
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_used boolean not null default false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_number text;

ALTER TABLE public.users
  ALTER COLUMN ai_energy SET DEFAULT 20,
  ALTER COLUMN ai_energy_max SET DEFAULT 20;

UPDATE public.users
SET ai_energy_max = 20
WHERE plan = 'free' AND ai_energy_max = 15;

UPDATE public.users
SET ai_energy = LEAST(20, COALESCE(ai_energy, 20))
WHERE plan = 'free' AND (ai_energy IS NULL OR ai_energy > 20);

-- Ensure AI energy reset logic uses the correct daily limits for Free and Pro/Trial plans.
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
      coalesce(v_max_energy, case when v_plan in ('pro', 'trial') then 250 else 20 end),
      'Daily energy reset',
      p_idempotency || '_reset'
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
