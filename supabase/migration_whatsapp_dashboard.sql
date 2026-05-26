-- WhatsApp dashboard schema for Notevoro

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  whatsapp_id TEXT,
  phone_number TEXT,
  oauth_state TEXT,
  connect_mode TEXT DEFAULT 'link' CHECK (connect_mode IN ('oauth', 'link')),
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_unique
  ON whatsapp_connections(phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  status TEXT NOT NULL DEFAULT 'active',
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  text TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webhook_enabled BOOLEAN DEFAULT true,
  allowed_features JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_number ON whatsapp_connections(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection_id ON whatsapp_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

ALTER TABLE IF EXISTS whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_connections_select_own ON whatsapp_connections;
CREATE POLICY whatsapp_connections_select_own ON whatsapp_connections
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_connections_insert_own ON whatsapp_connections;
CREATE POLICY whatsapp_connections_insert_own ON whatsapp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_connections_update_own ON whatsapp_connections;
CREATE POLICY whatsapp_connections_update_own ON whatsapp_connections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_connections_delete_own ON whatsapp_connections;
CREATE POLICY whatsapp_connections_delete_own ON whatsapp_connections
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_sessions_select_own ON whatsapp_sessions;
CREATE POLICY whatsapp_sessions_select_own ON whatsapp_sessions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_sessions_insert_own ON whatsapp_sessions;
CREATE POLICY whatsapp_sessions_insert_own ON whatsapp_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_sessions_update_own ON whatsapp_sessions;
CREATE POLICY whatsapp_sessions_update_own ON whatsapp_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_sessions_delete_own ON whatsapp_sessions;
CREATE POLICY whatsapp_sessions_delete_own ON whatsapp_sessions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_messages_select_own ON whatsapp_messages;
CREATE POLICY whatsapp_messages_select_own ON whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_messages_insert_own ON whatsapp_messages;
CREATE POLICY whatsapp_messages_insert_own ON whatsapp_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_messages_update_own ON whatsapp_messages;
CREATE POLICY whatsapp_messages_update_own ON whatsapp_messages
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_messages_delete_own ON whatsapp_messages;
CREATE POLICY whatsapp_messages_delete_own ON whatsapp_messages
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS whatsapp_settings_select_own ON whatsapp_settings;
CREATE POLICY whatsapp_settings_select_own ON whatsapp_settings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_settings_insert_own ON whatsapp_settings;
CREATE POLICY whatsapp_settings_insert_own ON whatsapp_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_settings_update_own ON whatsapp_settings;
CREATE POLICY whatsapp_settings_update_own ON whatsapp_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS whatsapp_settings_delete_own ON whatsapp_settings;
CREATE POLICY whatsapp_settings_delete_own ON whatsapp_settings
  FOR DELETE USING (auth.uid() = user_id);
