-- Add phone_number column to users table for WhatsApp integration
-- This column stores the user's WhatsApp phone number

alter table public.users add column if not exists phone_number text;

-- Create index for faster lookups by phone number
create index if not exists idx_users_phone_number on public.users(phone_number) where phone_number is not null;

-- Add comment
comment on column public.users.phone_number is 'WhatsApp phone number for the user';
