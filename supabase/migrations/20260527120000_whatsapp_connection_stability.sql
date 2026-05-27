-- Add durable connection health fields for WhatsApp
ALTER TABLE IF EXISTS public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'pending';

ALTER TABLE IF EXISTS public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'unknown';

ALTER TABLE IF EXISTS public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS realtime_enabled boolean DEFAULT true;

ALTER TABLE IF EXISTS public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NULL;

ALTER TABLE IF EXISTS public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS last_activity timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_connections_connection_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_connections
      ADD CONSTRAINT whatsapp_connections_connection_status_check
      CHECK (connection_status IN ('pending', 'connected', 'disconnected', 'error'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_connections_sync_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_connections
      ADD CONSTRAINT whatsapp_connections_sync_status_check
      CHECK (sync_status IN ('unknown', 'healthy', 'stale', 'error'));
  END IF;
END$$;

COMMENT ON COLUMN public.whatsapp_connections.connection_status IS 'Derived connection intent state for dashboard health and reconnection logic';
COMMENT ON COLUMN public.whatsapp_connections.sync_status IS 'Calculated sync health state for webhook/realtime activity';
COMMENT ON COLUMN public.whatsapp_connections.realtime_enabled IS 'Whether realtime subscriptions are expected to be active for this connection';
