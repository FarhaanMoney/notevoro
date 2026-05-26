import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listWhatsAppMessages } from '@/lib/whatsapp/service';
import { apiError, apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return apiError(new Error('Unauthorized'), 'Unauthorized');
    }

    const messages = await listWhatsAppMessages(user.id, 25);
    return apiSuccess({ messages });
  } catch (error) {
    return apiError(error, 'Unable to fetch messages');
  }
}
