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
  workspace_type text default 'student' check (workspace_type in ('student', 'educator', 'professional')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for workspace_type
create index if not exists idx_profiles_workspace_type on public.profiles(workspace_type);

-- Simple trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'workspace_type', 'student')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    workspace_type = coalesce(excluded.workspace_type, public.profiles.workspace_type, 'student'),
    updated_at = now();
  return new;
exception when others then
  return new;
end;
$$;

-- Create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
