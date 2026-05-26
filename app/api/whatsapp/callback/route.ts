import { NextRequest, NextResponse } from 'next/server';
import { completeWhatsAppOAuth } from '@/lib/whatsapp/service';
import { whatsappLog } from '@/lib/whatsapp/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const redirectBase = `${appUrl.replace(/\/$/, '')}/dashboard/whatsapp`;

  if (oauthError) {
    whatsappLog.warn('OAuth callback error from Meta', { oauthError });
    return NextResponse.redirect(`${redirectBase}?oauth=error&message=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?oauth=error&message=${encodeURIComponent('Missing OAuth parameters')}`);
  }

  try {
    await completeWhatsAppOAuth(code, state);
    return NextResponse.redirect(`${redirectBase}?oauth=success`);
  } catch (error) {
    whatsappLog.error('OAuth callback failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : 'OAuth failed';
    return NextResponse.redirect(`${redirectBase}?oauth=error&message=${encodeURIComponent(message)}`);
  }
}
