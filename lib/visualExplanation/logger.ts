import { safeStringify } from '@/lib/utils/safeJson';

export const visualLog = {
  info: (message: string, meta?: Record<string, unknown>) =>
    console.log(safeStringify({ scope: 'visual-learning', level: 'info', message, meta })),
  error: (message: string, meta?: Record<string, unknown>) =>
    console.error(safeStringify({ scope: 'visual-learning', level: 'error', message, meta })),
};
