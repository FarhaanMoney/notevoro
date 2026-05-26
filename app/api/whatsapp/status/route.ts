import { NextRequest } from 'next/server';
import { fetchWhatsAppStatus } from '@/lib/whatsapp/service';
import { apiError, apiSuccess } from '@/lib/api/response';
import { whatsappLog } from '@/lib/whatsapp/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const payload = await fetchWhatsAppStatus(req);
    if (!payload) {
      return apiError(new Error('Unauthorized'), 'Unauthorized');
    }

    return apiSuccess({
      status: payload.connection,
      verified: payload.verified,
      phone: payload.phone,
    });
  } catch (error) {
    whatsappLog.error('WhatsApp status failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return apiError(error, 'Unable to fetch WhatsApp status');
  }
}
