-- Cron: Daily AI Energy refill (24-hour reset)
-- This function is called via /api/cron/daily-energy-reset
-- Only premium users bypass reset; free/pro/trial users get daily allowance

create or replace function public.daily_energy_reset()
returns table(users_reset integer, errors text)
language plpgsql
as $$
declare
  v_user record;
  v_new_energy integer;
  v_error text;
  v_reset_count integer := 0;
  v_last_error text := null;
begin
  -- Find all users (except premium) whose last regeneration was > 24h ago
  for v_user in
    select id, plan, ai_energy_max, last_energy_regeneration
    from public.users
    where plan != 'premium' 
      and (last_energy_regeneration is null or last_energy_regeneration < now() - interval '24 hours')
    limit 1000
  loop
    begin
      v_new_energy := coalesce(v_user.ai_energy_max, 
        case 
          when v_user.plan = 'pro' then 250 
          else 20
        end
      );
      
      perform public.reset_energy(
        v_user.id,
        v_new_energy,
        'Daily energy refill',
        'daily_reset:' || v_user.id || ':' || to_char(now(), 'YYYY-MM-DD')
      );
      
      v_reset_count := v_reset_count + 1;
      
    exception when others then
      v_last_error := SQLERRM;
      raise notice 'Daily energy reset error for user %: %', v_user.id, v_last_error;
    end;
  end loop;
  
  return query select v_reset_count, v_last_error;
end;
$$;

-- Cron: Remove trial status from users whose 7-day trial expired
create or replace function public.expire_trials()
returns table(trials_expired integer, errors text)
language plpgsql
as $$
declare
  v_expired_count integer := 0;
  v_last_error text := null;
begin
  -- Find all trial-active users whose trial started > 7 days ago
  update public.users
  set plan = 'free',
      is_trial_active = false,
      ai_energy = 20,
      ai_energy_max = 20,
      last_energy_regeneration = now()
  where is_trial_active = true
    and trial_start is not null
    and trial_start < now() - interval '7 days'
  returning id into v_expired_count;
  
  -- Count affected rows
  v_expired_count := (
    select count(*)
    from public.users
    where is_trial_active = false 
      and plan = 'free'
      and trial_start is not null
      and trial_start < now() - interval '7 days'
  );
  
  return query select v_expired_count, v_last_error;
  
exception when others then
  v_last_error := SQLERRM;
  raise notice 'Expire trials error: %', v_last_error;
  return query select 0, v_last_error;
end;
$$;
