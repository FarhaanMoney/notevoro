-- Fix profile creation for production
-- Run in Supabase SQL Editor after 001_dev_setup.sql (or on existing production schema)

-- ---------------------------------------------------------------------------
-- 1. Ensure profiles has all columns the app expects
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists preferred_explanation_style text default 'balanced',
  add column if not exists difficulty_preference text default 'medium',
  add column if not exists learning_pace text default 'moderate';

-- ---------------------------------------------------------------------------
-- 2. Helper: normalize workspace_type from metadata
-- ---------------------------------------------------------------------------
create or replace function public.normalize_workspace_type(raw text)
returns text
language plpgsql
immutable
as $$
begin
  if raw in ('student', 'educator', 'professional') then
    return raw;
  end if;
  return 'student';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Robust trigger: profile insert must succeed; optional records isolated
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace text;
begin
  v_workspace := public.normalize_workspace_type(
    coalesce(new.raw_user_meta_data->>'workspace_type', 'student')
  );

  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    workspace_type
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user@local'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    v_workspace
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    workspace_type = coalesce(
      nullif(excluded.workspace_type, ''),
      public.profiles.workspace_type,
      'student'
    ),
    updated_at = now();

  -- Optional: free subscription (must not fail signup)
  begin
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'subscriptions'
    ) then
      insert into public.subscriptions (user_id, plan, status, provider)
      select new.id, 'free', 'active', 'internal'
      where not exists (
        select 1 from public.subscriptions s where s.user_id = new.id
      );
    end if;
  exception when others then
    raise warning 'handle_new_user: subscription insert failed for %: %', new.id, sqlerrm;
  end;

  -- Optional: user stats (must not fail signup)
  begin
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'user_stats'
    ) then
      insert into public.user_stats (user_id)
      select new.id
      where not exists (
        select 1 from public.user_stats s where s.user_id = new.id
      );
    end if;
  exception when others then
    raise warning 'handle_new_user: user_stats insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
exception when others then
  raise warning 'handle_new_user: profile insert failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Server-side recovery RPC (used by OAuth callback, /api/profile, middleware)
-- ---------------------------------------------------------------------------
create or replace function public.initialize_user_records(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace text;
  v_email text;
begin
  select coalesce(p_email, u.email, '')
  into v_email
  from auth.users u
  where u.id = p_user_id;

  v_workspace := public.normalize_workspace_type(
    coalesce(p_metadata->>'workspace_type', 'student')
  );

  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    workspace_type
  )
  values (
    p_user_id,
    coalesce(v_email, ''),
    coalesce(p_metadata->>'full_name', p_metadata->>'name'),
    coalesce(
      p_metadata->>'display_name',
      p_metadata->>'name',
      split_part(coalesce(v_email, 'user@local'), '@', 1)
    ),
    p_metadata->>'avatar_url',
    v_workspace
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    workspace_type = coalesce(
      nullif(excluded.workspace_type, ''),
      public.profiles.workspace_type,
      'student'
    ),
    updated_at = now();

  -- Optional: free subscription (must not fail signup)
  begin
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'subscriptions'
    ) then
      insert into public.subscriptions (user_id, plan, status, provider)
      select p_user_id, 'free', 'active', 'internal'
      where not exists (
        select 1 from public.subscriptions s where s.user_id = p_user_id
      );
    end if;
  exception when others then
    raise warning 'initialize_user_records: subscription insert failed for %: %', p_user_id, sqlerrm;
  end;

  -- Optional: user stats (must not fail signup)
  begin
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'user_stats'
    ) then
      insert into public.user_stats (user_id)
      select p_user_id
      where not exists (
        select 1 from public.user_stats s where s.user_id = p_user_id
      );
    end if;
  exception when others then
    raise warning 'initialize_user_records: user_stats insert failed for %: %', p_user_id, sqlerrm;
  end;
end;
$$;

grant execute on function public.initialize_user_records(uuid, text, jsonb) to authenticated;
grant execute on function public.initialize_user_records(uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Backfill orphaned auth users (safe to re-run)
-- ---------------------------------------------------------------------------
insert into public.profiles (
  id,
  email,
  full_name,
  display_name,
  avatar_url,
  workspace_type
)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'name',
    split_part(coalesce(u.email, 'user@local'), '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  public.normalize_workspace_type(
    coalesce(u.raw_user_meta_data->>'workspace_type', 'student')
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
