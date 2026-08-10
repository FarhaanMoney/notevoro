-- Development Setup Migration
-- Basic tables for development without complex schema

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles table with workspace_type
create table if not exists public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  display_name text not null,
  avatar_url text,
  grade text,
  curriculum text,
  preferred_explanation_style text default 'balanced',
  difficulty_preference text default 'medium',
  learning_pace text default 'moderate',
  workspace_type text default 'student' check (workspace_type in ('student', 'educator', 'professional')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for workspace_type
create index if not exists idx_profiles_workspace_type on public.profiles(workspace_type);

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

  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
