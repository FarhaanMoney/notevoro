import { NextResponse } from 'next/server';
import { WhatsAppServiceError } from '@/lib/whatsapp/errors';

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(error: unknown, fallback = 'Request failed', status?: number) {
  if (error instanceof WhatsAppServiceError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details ?? null,
      },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  const resolvedStatus =
    status ??
    (message.toLowerCase().includes('unauthorized') ? 401 : 500);

  return NextResponse.json(
    { success: false, error: message, code: resolvedStatus === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR' },
    { status: resolvedStatus }
  );
}
