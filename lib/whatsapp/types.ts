import { z } from 'zod';

export const whatsappConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'connected', 'disconnected', 'error']),
  whatsapp_id: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  oauth_state: z.string().nullable().optional(),
  connect_mode: z.enum(['oauth', 'link']).nullable().optional(),
  connected_at: z.string().nullable().optional(),
  disconnected_at: z.string().nullable().optional(),
  last_activity: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const whatsappMessageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  connection_id: z.string().uuid(),
  direction: z.enum(['incoming', 'outgoing']),
  text: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export const whatsappSettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  webhook_enabled: z.boolean(),
  allowed_features: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type WhatsAppConnection = z.infer<typeof whatsappConnectionSchema>;
export type WhatsAppMessage = z.infer<typeof whatsappMessageSchema>;
export type WhatsAppSettings = z.infer<typeof whatsappSettingsSchema>;

export const connectRequestSchema = z.object({
  mode: z.enum(['oauth', 'link', 'auto']).optional().default('auto'),
});
