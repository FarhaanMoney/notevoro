'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
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
  const [token, setToken] = useState<string | null>(null);

  const authHeaders = useCallback(
    (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` }),
    []
  );

  const loadStatus = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/whatsapp/status', { headers: authHeaders(accessToken) });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Unable to load WhatsApp status');
    }
    setStatus(data.status);
    setVerified(Boolean(data.verified));
    setError(null);
  }, [authHeaders]);

  const loadMessages = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/whatsapp/messages', { headers: authHeaders(accessToken) });
    const data = await res.json();
    if (res.ok && data?.messages) {
      setMessages(data.messages);
    }
  }, [authHeaders]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      await loadStatus(token);
      await loadMessages(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
      toast.error(message);
    }
  }, [token, loadStatus, loadMessages]);

  useWhatsAppRealtime((user?.id as string) || null, {
    onConnectionChange: refresh,
    onMessageChange: refresh,
    onStatus: setRealtimeStatus,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const sb = supabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.access_token) {
          router.replace('/auth');
          return;
        }

        if (cancelled) return;
        setToken(session.access_token);

        const profileRes = await fetch('/api/auth/me', {
          headers: authHeaders(session.access_token),
        });
        const profileJson = await profileRes.json();
        if (!profileJson?.user) {
          router.replace('/auth');
          return;
        }

        if (cancelled) return;
        setUser(profileJson.user);
        await loadStatus(session.access_token);
        await loadMessages(session.access_token);
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
  }, [router, authHeaders, loadStatus, loadMessages]);

  const connect = useCallback(async () => {
    if (!token) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
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
  }, [token, authHeaders, refresh]);

  const disconnect = useCallback(async () => {
    if (!token) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: authHeaders(token),
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
  }, [token, authHeaders, refresh]);

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
