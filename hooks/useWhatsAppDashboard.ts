'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWhatsAppRealtime } from './useWhatsAppRealtime';
import { toast } from 'sonner';

export type WhatsAppDashboardStatus = {
  id: string;
  user_id: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  phone_number?: string | null;
  connect_mode?: string | null;
  connected_at?: string | null;
  disconnected_at?: string | null;
  last_activity?: string | null;
  last_error?: string | null;
};

export type WhatsAppDashboardMessage = {
  id: string;
  direction: 'incoming' | 'outgoing';
  text: string | null;
  created_at: string;
};

export function useWhatsAppDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<WhatsAppDashboardStatus | null>(null);
  const [verified, setVerified] = useState(false);
  const [messages, setMessages] = useState<WhatsAppDashboardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Unable to load WhatsApp status');
    }
    setStatus(data.status);
    setVerified(Boolean(data.verified));
    setError(null);
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/whatsapp/messages');
    const data = await res.json();
    if (res.ok && data?.messages) {
      setMessages(data.messages);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await loadStatus();
      await loadMessages();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
      toast.error(message);
    }
  }, [loadStatus, loadMessages]);

  useWhatsAppRealtime((user?.id as string) || null, {
    onConnectionChange: refresh,
    onMessageChange: refresh,
    onStatus: setRealtimeStatus,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }

        if (cancelled) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (cancelled) return;
        setUser({ ...session.user, ...profile });
        await loadStatus();
        await loadMessages();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize dashboard';
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router, loadStatus, loadMessages]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Connect failed');
      }

      if (data.alreadyConnected) {
        toast.success('WhatsApp is already connected');
        await refresh();
        return;
      }

      if (data.connectUrl) {
        if (data.mode === 'link') {
          window.open(data.connectUrl, '_blank', 'noopener,noreferrer');
          toast.success('Open WhatsApp and send the connect message');
        } else {
          window.open(data.connectUrl, '_blank', 'noopener,noreferrer');
          toast.success('Complete Meta authorization in the new window');
        }
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
      setError(message);
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Disconnect failed');
      }
      toast.success('WhatsApp disconnected');
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      toast.error(message);
    } finally {
      setDisconnecting(false);
    }
  }, [refresh]);

  return {
    user,
    status,
    verified,
    messages,
    loading,
    connecting,
    disconnecting,
    realtimeStatus,
    error,
    connect,
    disconnect,
    refresh,
  };
}
