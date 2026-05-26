export class WhatsAppServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'WhatsAppServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function mapSupabaseError(error: { code?: string; message?: string; details?: string }) {
  if (error.code === '42P01') {
    return new WhatsAppServiceError(
      'SCHEMA_MISSING',
      'WhatsApp tables are not installed. Run supabase/migrations/20250524120000_whatsapp_production.sql',
      503,
      error
    );
  }

  if (error.code === '23505') {
    return new WhatsAppServiceError('DUPLICATE', 'A conflicting WhatsApp connection already exists', 409, error);
  }

  return new WhatsAppServiceError('DATABASE_ERROR', error.message || 'Database operation failed', 500, error);
}
