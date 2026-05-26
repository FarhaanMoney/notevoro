-- WhatsApp production schema (run in Supabase SQL Editor)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Patch existing tables (if created from migration_whatsapp_dashboard.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS oauth_state TEXT,
  ADD COLUMN IF NOT EXISTS connect_mode TEXT DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.whatsapp_connections SET connect_mode = 'link' WHERE connect_mode IS NULL;

ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  whatsapp_id TEXT,
  phone_number TEXT,
  oauth_state TEXT,
  connect_mode TEXT DEFAULT 'link' CHECK (connect_mode IN ('oauth', 'link')),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_unique
  ON public.whatsapp_connections(phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  last_sync TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  text TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  allowed_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON public.whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON public.whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_connection_id ON public.whatsapp_sessions(connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection_id ON public.whatsapp_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER trg_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_sessions_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER trg_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_settings_updated_at ON public.whatsapp_settings;
CREATE TRIGGER trg_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sync whatsapp_connections when link token is consumed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_whatsapp_connection_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_status TEXT;
BEGIN
  IF NEW.personalization IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := COALESCE(NEW.personalization->>'whatsapp_verified', 'false');
  IF v_status <> 'true' THEN
    RETURN NEW;
  END IF;

  v_phone := COALESCE(NEW.personalization->>'whatsapp_phone', NEW.phone_number);

  INSERT INTO public.whatsapp_connections (
    user_id, status, phone_number, connected_at, last_activity, connect_mode, updated_at
  ) VALUES (
    NEW.id, 'connected', v_phone, NOW(), NOW(), 'link', NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'connected',
    phone_number = COALESCE(EXCLUDED.phone_number, whatsapp_connections.phone_number),
    connected_at = COALESCE(whatsapp_connections.connected_at, NOW()),
    last_activity = NOW(),
    connect_mode = 'link',
    last_error = NULL,
    updated_at = NOW();

  INSERT INTO public.whatsapp_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_sync_whatsapp_connection ON public.users;
CREATE TRIGGER trg_users_sync_whatsapp_connection
  AFTER UPDATE OF personalization, phone_number ON public.users
  FOR EACH ROW
  WHEN (NEW.personalization IS DISTINCT FROM OLD.personalization OR NEW.phone_number IS DISTINCT FROM OLD.phone_number)
  EXECUTE FUNCTION public.sync_whatsapp_connection_on_link();

-- Extend consume_whatsapp_token to ensure connection row exists
CREATE OR REPLACE FUNCTION public.consume_whatsapp_token(p_token text, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token record;
  v_user record;
  v_normalized_phone text;
BEGIN
  v_normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  SELECT * INTO v_token FROM public.whatsapp_link_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_NOT_FOUND';
  END IF;

  IF v_token.used THEN
    RAISE EXCEPTION 'TOKEN_ALREADY_USED';
  END IF;

  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;

  UPDATE public.whatsapp_link_tokens
  SET used = true, used_at = now(), phone = v_normalized_phone
  WHERE token = p_token;

  UPDATE public.users SET
    phone_number = coalesce(nullif(v_normalized_phone, ''), phone_number),
    personalization = (
      jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(personalization, '{}')::jsonb, '{whatsapp_verified}', 'true'::jsonb, true),
          '{whatsapp_phone}', to_jsonb(coalesce(nullif(v_normalized_phone, ''), phone_number)::text), true
        ),
        '{whatsapp_linked_at}', to_jsonb(now()::text), true
      )
    )
  WHERE id = v_token.user_id;

  INSERT INTO public.whatsapp_connections (
    user_id, status, phone_number, connected_at, last_activity, connect_mode
  ) VALUES (
    v_token.user_id, 'connected', nullif(v_normalized_phone, ''), now(), now(), 'link'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'connected',
    phone_number = coalesce(nullif(v_normalized_phone, ''), whatsapp_connections.phone_number),
    connected_at = coalesce(whatsapp_connections.connected_at, now()),
    last_activity = now(),
    connect_mode = 'link',
    last_error = null,
    updated_at = now();

  INSERT INTO public.whatsapp_settings (user_id)
  VALUES (v_token.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, phone_number, personalization INTO v_user FROM public.users WHERE id = v_token.user_id;

  RETURN row_to_json(v_user);
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_connections_select_own ON public.whatsapp_connections;
CREATE POLICY whatsapp_connections_select_own ON public.whatsapp_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_connections_insert_own ON public.whatsapp_connections;
CREATE POLICY whatsapp_connections_insert_own ON public.whatsapp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_connections_update_own ON public.whatsapp_connections;
CREATE POLICY whatsapp_connections_update_own ON public.whatsapp_connections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_connections_delete_own ON public.whatsapp_connections;
CREATE POLICY whatsapp_connections_delete_own ON public.whatsapp_connections
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_sessions_select_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_select_own ON public.whatsapp_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_sessions_insert_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_insert_own ON public.whatsapp_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_sessions_update_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_update_own ON public.whatsapp_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_sessions_delete_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_delete_own ON public.whatsapp_sessions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_messages_select_own ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select_own ON public.whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_messages_insert_own ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_insert_own ON public.whatsapp_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_messages_update_own ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_update_own ON public.whatsapp_messages
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_messages_delete_own ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_delete_own ON public.whatsapp_messages
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_settings_select_own ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_select_own ON public.whatsapp_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_settings_insert_own ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_insert_own ON public.whatsapp_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_settings_update_own ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_update_own ON public.whatsapp_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_settings_delete_own ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_delete_own ON public.whatsapp_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;
