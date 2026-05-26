import { NextRequest } from 'next/server';
import { disconnectWhatsApp } from '@/lib/whatsapp/service';
import { apiError, apiSuccess } from '@/lib/api/response';
import { whatsappLog } from '@/lib/whatsapp/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const connection = await disconnectWhatsApp(req);
    if (!connection) {
      return apiError(new Error('Unauthorized'), 'Unauthorized');
    }

    return apiSuccess({ connection });
  } catch (error) {
    whatsappLog.error('WhatsApp disconnect failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return apiError(error, 'Unable to disconnect WhatsApp');
  }
}
