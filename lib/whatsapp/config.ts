export type WhatsAppConnectMode = 'oauth' | 'link';

export function getWhatsAppConfig() {
  const appId = process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.WHATSAPP_REDIRECT_URI;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const businessNumber =
    process.env.WHATSAPP_BUSINESS_NUMBER ||
    process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;

  const oauthEnabled = Boolean(appId && redirectUri && appSecret);

  return {
    appId,
    redirectUri,
    appSecret,
    verifyToken,
    businessNumber,
    oauthEnabled,
    graphApiVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v21.0',
  };
}

export function assertServiceRoleConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role is not configured on the server');
  }
}
