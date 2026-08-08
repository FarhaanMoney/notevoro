-- Migration 011: Add workspace_type to profiles
-- This migration adds a workspace_type field to distinguish between student, educator, and professional workspaces

-- Add workspace_type column to profiles
alter table public.profiles
add column if not exists workspace_type text default 'student'
check (workspace_type in ('student', 'educator', 'professional'));

-- Update existing profiles to have 'student' as default
update public.profiles
set workspace_type = 'student'
where workspace_type is null;

-- Add index for faster queries
create index if not exists idx_profiles_workspace_type on public.profiles(workspace_type);
