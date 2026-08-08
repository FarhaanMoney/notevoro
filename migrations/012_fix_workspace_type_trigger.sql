-- Migration 012: Fix workspace_type in profile creation trigger
-- This migration updates the create_profile function to include workspace_type from auth metadata

-- Update create_profile function to include workspace_type
create or replace function public.create_profile(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns boolean
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
    timezone,
    language,
    workspace_type,
    metadata
  )
  values (
    p_user_id,
    p_email,
    p_metadata->>'full_name',
    coalesce(p_metadata->>'display_name', split_part(p_email, '@', 1)),
    p_metadata->>'avatar_url',
    coalesce(p_metadata->>'timezone', 'UTC'),
    coalesce(p_metadata->>'language', 'en'),
    coalesce(p_metadata->>'workspace_type', 'student'),
    p_metadata
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    timezone = excluded.timezone,
    language = excluded.language,
    workspace_type = coalesce(excluded.workspace_type, public.profiles.workspace_type, 'student'),
    metadata = excluded.metadata,
    updated_at = now();

  return true;
end;
$$;
