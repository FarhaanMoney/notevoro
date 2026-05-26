-- Patch: add columns missing from migration_whatsapp_dashboard.sql
-- Run this in Supabase SQL Editor if you see:
-- "Could not find the 'connect_mode' column of 'whatsapp_connections' in the schema cache"

-- whatsapp_connections
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS oauth_state TEXT,
  ADD COLUMN IF NOT EXISTS connect_mode TEXT DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill connect_mode for existing rows
UPDATE public.whatsapp_connections
SET connect_mode = 'link'
WHERE connect_mode IS NULL;

-- Optional: allow 'error' status (production migration)
ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_status_check;

ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_status_check
  CHECK (status IN ('pending', 'connected', 'disconnected', 'error'));

ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_connect_mode_check;

ALTER TABLE public.whatsapp_connections
  ADD CONSTRAINT whatsapp_connections_connect_mode_check
  CHECK (connect_mode IN ('oauth', 'link'));

-- whatsapp_sessions (if table exists from old migration)
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Replace global UNIQUE(phone_number) with partial unique (allows multiple NULLs)
ALTER TABLE public.whatsapp_connections
  DROP CONSTRAINT IF EXISTS whatsapp_connections_phone_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_unique
  ON public.whatsapp_connections(phone_number)
  WHERE phone_number IS NOT NULL;

-- Notify PostgREST to reload schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
