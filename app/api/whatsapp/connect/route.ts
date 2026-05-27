import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { startWhatsAppConnect } from '@/lib/whatsapp/service';
import { connectRequestSchema } from '@/lib/whatsapp/types';
import { apiError, apiSuccess } from '@/lib/api/response';
import { whatsappLog } from '@/lib/whatsapp/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return apiError(new Error('Unauthorized'), 'Unauthorized', 401);
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = connectRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(new Error(parsed.error.flatten().formErrors.join(', ') || 'Invalid request'), 'Invalid request');
    }

    const result = await startWhatsAppConnect(user.id, parsed.data.mode);

    whatsappLog.info('WhatsApp connect started', {
      userId: user.id,
      mode: result.mode,
      alreadyConnected: result.alreadyConnected,
    });

    return apiSuccess({
      mode: result.mode,
      connectUrl: result.connectUrl || null,
      linkToken: result.linkToken || null,
      expiresAt: result.expiresAt || null,
      alreadyConnected: result.alreadyConnected,
    });
  } catch (error) {
    whatsappLog.error('WhatsApp connect failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return apiError(error, 'Unable to create WhatsApp connection');
  }
}
