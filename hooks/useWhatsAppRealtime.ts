'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeHandlers = {
  onConnectionChange?: () => void;
  onMessageChange?: () => void;
  onStatus?: (status: string) => void;
};

export function useWhatsAppRealtime(userId: string | null, handlers: RealtimeHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const refresh = useCallback(() => {
    handlersRef.current.onConnectionChange?.();
    handlersRef.current.onMessageChange?.();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const sb = createClient();
    let connectionChannel: RealtimeChannel | null = null;
    let messageChannel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const subscribe = () => {
      if (disposed) return;

      connectionChannel = sb
        .channel(`wa-connections:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_connections',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            handlersRef.current.onConnectionChange?.();
          }
        )
        .subscribe((status) => {
          handlersRef.current.onStatus?.(status);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!disposed) {
              reconnectTimer = setTimeout(subscribe, 3000);
            }
          }
        });

      messageChannel = sb
        .channel(`wa-messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            handlersRef.current.onMessageChange?.();
          }
        )
        .subscribe();
    };

    subscribe();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (connectionChannel) sb.removeChannel(connectionChannel);
      if (messageChannel) sb.removeChannel(messageChannel);
    };
  }, [userId]);

  return { refresh };
}
