'use client';

import { useCallback, useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeHandlers = {
  onConnectionChange?: () => void;
  onMessageChange?: () => void;
  onStatus?: (status: string) => void;
};

export function useWhatsAppRealtime(userId: string | null, handlers: RealtimeHandlers) {
  const handlersRef = useRef<RealtimeHandlers>(handlers);
  handlersRef.current = handlers;

  const refresh = useCallback(() => {
    handlersRef.current.onConnectionChange?.();
    handlersRef.current.onMessageChange?.();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const sb = supabaseBrowser();
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let retryCount = 0;

    const cleanupChannel = () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {
          // ignore cleanup errors
        }
        sb.removeChannel(channel);
        channel = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(30000, 2000 * Math.pow(2, retryCount));
      retryCount = Math.min(retryCount + 1, 6);
      reconnectTimer = setTimeout(() => {
        if (!disposed) {
          createChannel();
        }
      }, delay);
    };

    const createChannel = () => {
      if (disposed) return;
      cleanupChannel();

      channel = sb
        .channel(`whatsapp:${userId}`)
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
        .subscribe((status) => {
          handlersRef.current.onStatus?.(status);
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            scheduleReconnect();
          }
        });
    };

    createChannel();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      cleanupChannel();
    };
  }, [userId]);

  return { refresh };
}
