// @ts-ignore - Node types may not be installed in this workspace CI/editor
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { generateLinkingToken, generateWhatsAppLinkURL } from '@/lib/auth/whatsappLinking';
import { getWhatsAppConfig, assertServiceRoleConfigured, type WhatsAppConnectMode } from './config';
import { whatsappLog } from './logger';
import { mapSupabaseError, WhatsAppServiceError } from './errors';
import { whatsappConnectionSchema, type WhatsAppConnection } from './types';

const GRAPH_BASE = 'https://graph.facebook.com';

// Provide minimal ambient names to satisfy TypeScript when `@types/node` is not present
declare const Buffer: any;

async function bootstrapLegacyUserForLinking(userId: string) {
  try {
    const { getUserById, createUser } = await import('@/lib/auth/userManager');
    if (getUserById(userId)) return;

    const sb = supabaseAdmin();
    const { data: userRecord } = await sb
      .from('users')
      .select('email, phone_number, name')
      .eq('id', userId)
      .single();

    await createUser({
      id: userId,
      name: userRecord?.name || userRecord?.email || 'User',
      email: userRecord?.email || undefined,
      phone: userRecord?.phone_number || undefined,
    });
  } catch (error) {
    whatsappLog.warn('Legacy user bootstrap skipped', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}

async function ensureUserSettings(userId: string) {
  const sb = supabaseAdmin();
  await sb.from('whatsapp_settings').upsert({ user_id: userId }, { onConflict: 'user_id' });
}

export async function getWhatsAppConnection(userId: string) {
  const sb = supabaseAdmin();
  const response = await sb.from('whatsapp_connections').select('*').eq('user_id', userId).maybeSingle();
  if (response.error) throw mapSupabaseError(response.error);
  return response.data ? whatsappConnectionSchema.parse(response.data) : null;
}

export async function upsertWhatsAppConnectionPending(userId: string, mode: WhatsAppConnectMode = 'link') {
  assertServiceRoleConfigured();
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const upsert = await sb
    .from('whatsapp_connections')
    .upsert(
      {
        user_id: userId,
        status: 'pending',
        connect_mode: mode,
        last_error: null,
        connection_status: 'pending',
        sync_status: 'unknown',
        realtime_enabled: true,
        metadata: { pending_started_at: now },
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (upsert.error) throw mapSupabaseError(upsert.error);
  await ensureUserSettings(userId);
  return whatsappConnectionSchema.parse(upsert.data);
}

export async function ensureWhatsAppConnection(userId: string, mode: WhatsAppConnectMode = 'link') {
  const existing = await getWhatsAppConnection(userId);
  if (existing) return existing;
  return upsertWhatsAppConnectionPending(userId, mode);
}

export async function syncConnectionFromUserProfile(userId: string) {
  const sb = supabaseAdmin();
  const { data: userRow, error } = await sb
    .from('users')
    .select('id, phone_number, personalization')
    .eq('id', userId)
    .single();

  if (error || !userRow) return null;

  const personalization = (userRow.personalization || {}) as Record<string, unknown>;
  const verified = personalization.whatsapp_verified === true;
  if (!verified) return null;

  const phone = normalizePhone(
    (personalization.whatsapp_phone as string) || (userRow.phone_number as string)
  );

  const now = new Date().toISOString();
  const upsert = await sb
    .from('whatsapp_connections')
    .upsert(
      {
        user_id: userId,
        status: 'connected',
        phone_number: phone,
        connected_at: now,
        last_seen: now,
        last_activity: now,
        connect_mode: 'link',
        connection_status: 'connected',
        sync_status: 'healthy',
        realtime_enabled: true,
        last_error: null,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (upsert.error) throw mapSupabaseError(upsert.error);
  await ensureUserSettings(userId);
  return whatsappConnectionSchema.parse(upsert.data);
}

function buildOAuthState(userId: string) {
  return crypto.randomBytes(24).toString('hex') + '.' + userId;
}

function parseOAuthState(state: string) {
  const parts = state.split('.');
  if (parts.length < 2) return null;
  const userId = parts[parts.length - 1];
  if (!userId || userId.length < 8) return null;
  return { userId, state };
}

export async function buildWhatsAppOAuthUrl(userId: string, connectionId: string) {
  const config = getWhatsAppConfig();
  if (!config.oauthEnabled || !config.appId || !config.redirectUri) {
    throw new WhatsAppServiceError(
      'OAUTH_NOT_CONFIGURED',
      'Meta OAuth is not configured. Set WHATSAPP_APP_ID and WHATSAPP_REDIRECT_URI.',
      503
    );
  }

  const state = buildOAuthState(userId);
  const sb = supabaseAdmin();
  await sb
    .from('whatsapp_connections')
    .update({ oauth_state: state, connect_mode: 'oauth', status: 'pending' })
    .eq('id', connectionId);

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth?${params.toString()}`;
}

export async function startWhatsAppConnect(userId: string, preferredMode: 'oauth' | 'link' | 'auto' = 'auto') {
  const config = getWhatsAppConfig();

  const existing = await getWhatsAppConnection(userId);
  if (existing?.status === 'connected') {
    return {
      alreadyConnected: true,
      mode: 'link' as const,
    };
  }

  if (!config.businessNumber) {
    throw new WhatsAppServiceError(
      'LINK_NOT_CONFIGURED',
      'WhatsApp business number is not configured. Set WHATSAPP_BUSINESS_NUMBER.',
      503
    );
  }

  const tokenData = (await generateLinkingToken(userId)) as {
    token: string;
    expiresAt: string;
  };

  await upsertWhatsAppConnectionPending(userId, 'link');

  const connectUrl = generateWhatsAppLinkURL(tokenData.token, config.businessNumber);

  return {
    alreadyConnected: false,
    mode: 'link' as const,
    connectUrl,
    linkToken: tokenData.token,
    expiresAt: tokenData.expiresAt,
  };
}

export async function completeWhatsAppOAuth(code: string, state: string) {
  const config = getWhatsAppConfig();
  if (!config.oauthEnabled || !config.appId || !config.appSecret || !config.redirectUri) {
    throw new WhatsAppServiceError('OAUTH_NOT_CONFIGURED', 'OAuth is not configured', 503);
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    throw new WhatsAppServiceError('INVALID_STATE', 'Invalid OAuth state', 400);
  }

  const sb = supabaseAdmin();
  const connectionRes = await sb
    .from('whatsapp_connections')
    .select('*')
    .eq('user_id', parsed.userId)
    .eq('oauth_state', state)
    .maybeSingle();

  if (connectionRes.error) throw mapSupabaseError(connectionRes.error);
  if (!connectionRes.data) {
    throw new WhatsAppServiceError('INVALID_STATE', 'OAuth session expired or not found', 400);
  }

  const tokenUrl = new URL(`${GRAPH_BASE}/${config.graphApiVersion}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', config.appId);
  tokenUrl.searchParams.set('client_secret', config.appSecret);
  tokenUrl.searchParams.set('redirect_uri', config.redirectUri);
  tokenUrl.searchParams.set('code', code);

  const tokenResponse = await fetch(tokenUrl.toString());
  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) {
    whatsappLog.error('OAuth token exchange failed', { tokenJson });
    throw new WhatsAppServiceError('OAUTH_EXCHANGE_FAILED', 'Failed to exchange OAuth code', 502, tokenJson);
  }

  const accessToken = tokenJson.access_token as string;

  const phoneRes = await fetch(
    `${GRAPH_BASE}/${config.graphApiVersion}/me/phone_numbers?access_token=${encodeURIComponent(accessToken)}`
  );
  const phoneJson = await phoneRes.json();
  const phoneNumber = normalizePhone(phoneJson?.data?.[0]?.display_phone_number);

  const now = new Date().toISOString();
  const update = await sb
    .from('whatsapp_connections')
    .update({
      status: 'connected',
      phone_number: phoneNumber,
      whatsapp_id: phoneJson?.data?.[0]?.id || null,
      connected_at: now,
      last_activity: now,
      oauth_state: null,
      last_error: null,
      metadata: { oauth_completed_at: now },
    })
    .eq('id', connectionRes.data.id)
    .select()
    .single();

  if (update.error) throw mapSupabaseError(update.error);

  const userRes = await sb.from('users').select('personalization').eq('id', parsed.userId).single();
  const existingPersonalization = (userRes.data?.personalization || {}) as Record<string, unknown>;

  await sb
    .from('users')
    .update({
      personalization: {
        ...existingPersonalization,
        whatsapp_verified: true,
        whatsapp_phone: phoneNumber,
        whatsapp_linked_at: now,
      },
      phone_number: phoneNumber,
    })
    .eq('id', parsed.userId);

  await sb.from('whatsapp_sessions').insert({
    user_id: parsed.userId,
    connection_id: connectionRes.data.id,
    provider: 'meta',
    status: 'active',
    last_sync: now,
  });

  return whatsappConnectionSchema.parse(update.data);
}

export async function fetchWhatsAppStatus(req: Request) {
  const user = await requireUser(req);
  if (!user) return null;

  const synced = await syncConnectionFromUserProfile(user.id);
  const connection = synced || (await getWhatsAppConnection(user.id));

  const personalization = (user.personalization || {}) as Record<string, unknown>;
  return {
    connection,
    verified: personalization.whatsapp_verified === true || connection?.status === 'connected',
    phone: connection?.phone_number || (personalization.whatsapp_phone as string) || user.phone_number || null,
  };
}

export async function disconnectWhatsApp(req: Request) {
  const user = await requireUser(req);
  if (!user) return null;

  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from('whatsapp_connections')
    .update({
      status: 'disconnected',
      disconnected_at: now,
      connection_status: 'disconnected',
      sync_status: 'stale',
      realtime_enabled: false,
      oauth_state: null,
      last_error: null,
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);

  const personalization = { ...(user.personalization || {}) } as Record<string, unknown>;
  delete personalization.whatsapp_verified;
  delete personalization.whatsapp_phone;
  delete personalization.whatsapp_linked_at;

  await sb.from('users').update({ personalization }).eq('id', user.id);
  await sb.from('whatsapp_sessions').update({ status: 'inactive' }).eq('user_id', user.id);

  return whatsappConnectionSchema.parse(data);
}

export async function listWhatsAppMessages(userId: string, limit = 20) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('whatsapp_messages')
    .select('id,direction,text,created_at,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw mapSupabaseError(error);
  return data || [];
}

export async function recordInboundMessage(params: {
  phone: string;
  text: string;
  metadata?: Record<string, unknown>;
}) {
  const phone = normalizePhone(params.phone);
  if (!phone) return null;

  const sb = supabaseAdmin();
  const connectionRes = await sb
    .from('whatsapp_connections')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle();

  if (connectionRes.error) throw mapSupabaseError(connectionRes.error);
  if (!connectionRes.data) return null;

  const connection = whatsappConnectionSchema.parse(connectionRes.data);
  const now = new Date().toISOString();

  await sb.from('whatsapp_messages').insert({
    user_id: connection.user_id,
    connection_id: connection.id,
    direction: 'incoming',
    text: params.text,
    metadata: params.metadata || {},
  });

  await sb
    .from('whatsapp_connections')
    .update({
      status: 'connected',
      last_seen: now,
      last_activity: now,
      connection_status: 'connected',
      sync_status: 'healthy',
      last_error: null,
    })
    .eq('id', connection.id);

  return connection;
}

export async function handleWhatsAppWebhook(req: Request) {
  const config = getWhatsAppConfig();
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === config.verifyToken) {
      return { success: true, challenge };
    }

    return { success: false, challenge: null };
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyWebhookSignature(rawBody, config.appSecret, signature)) {
    throw new WhatsAppServiceError('INVALID_SIGNATURE', 'Invalid webhook signature', 403);
  }

  const payload = JSON.parse(rawBody);
  await processWhatsAppEvents(payload);
  return { success: true };
}

function verifyWebhookSignature(
  payload: string,
  secret: string | null | undefined,
  signature: string | null | undefined
) {
  if (!secret || !signature) return false;
  const normalized = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(normalized, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function processWhatsAppEvents(payload: Record<string, unknown>) {
  const entries = (payload.entry as Array<Record<string, unknown>>) || [];
  const messages = entries
    .flatMap((entry) => (entry.changes as Array<Record<string, unknown>>) || [])
    .flatMap((change) => {
      const value = change.value as Record<string, unknown> | undefined;
      return (value?.messages as Array<Record<string, unknown>>) || [];
    });

  if (!messages.length) return;

  for (const message of messages) {
    const phone = normalizePhone(message.from as string);
    const text = String((message.text as { body?: string })?.body || message.body || '');
    if (!phone) continue;

    await recordInboundMessage({ phone, text, metadata: message as Record<string, unknown> });
  }
}

export type { WhatsAppConnection };
