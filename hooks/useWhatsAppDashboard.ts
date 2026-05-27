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

type AuthProfile = {
  id: string;
  plan?: string;
  is_trial_active?: boolean;
  personalization?: Record<string, unknown>;
};

export function useWhatsAppDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthProfile | null>(null);
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

  const loadStatus = useCallback(
    async (accessToken: string) => {
      const res = await fetch('/api/whatsapp/status', {
        headers: authHeaders(accessToken),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.replace('/auth');
        throw new Error('Unauthorized');
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to load WhatsApp status');
      }

      setStatus(data.status ?? null);
      setVerified(Boolean(data.verified));
      setError(null);
    },
    [authHeaders, router]
  );

  const loadMessages = useCallback(
    async (accessToken: string) => {
      const res = await fetch('/api/whatsapp/messages', {
        headers: authHeaders(accessToken),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.replace('/auth');
        throw new Error('Unauthorized');
      }

      if (res.ok && data?.messages) {
        setMessages(data.messages);
      }
    },
    [authHeaders, router]
  );

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

  useWhatsAppRealtime(user?.id ?? null, {
    onConnectionChange: refresh,
    onMessageChange: refresh,
    onStatus: setRealtimeStatus,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const sb = supabaseBrowser();
        const {
          data: { session },
        } = await sb.auth.getSession();

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
        if (!cancelled) {
          setLoading(false);
        }
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

      if (res.status === 401) {
        router.replace('/auth');
        throw new Error('Unauthorized');
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Connect failed');
      }

      if (data.alreadyConnected) {
        toast.success('WhatsApp is already connected');
        await refresh();
        return;
      }

      if (data.connectUrl) {
        const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
        try {
          if (isMobile) {
            // On mobile, navigate directly to the link to open WhatsApp reliably
            window.location.href = data.connectUrl;
            toast.success('WhatsApp opened. Send the verification token to connect.');
          } else {
            const newWin = window.open(data.connectUrl, '_blank', 'noopener,noreferrer');
            if (newWin) {
              try {
                newWin.focus();
              } catch {}
              toast.success('WhatsApp opened in a new window. Send the verification token to connect.');
            } else {
              // Popup was likely blocked — fall back to copying the link and advising the user
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(data.connectUrl);
                }
              } catch (copyErr) {
                // ignore copy errors
              }
              toast.error('Popup blocked. The WhatsApp link was copied to your clipboard — please allow popups or paste the link into your browser.');
            }
          }
        } catch (e) {
          console.warn('Failed to open WhatsApp link, falling back to copy/navigation', e);
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(data.connectUrl);
              toast.error('Unable to open link automatically. The WhatsApp link was copied to your clipboard.');
            } else {
              // Last resort: navigate
              window.location.href = data.connectUrl;
            }
          } catch {
            window.location.href = data.connectUrl;
          }
        }
      } else {
        throw new Error('Failed to generate WhatsApp connection link');
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
      setError(message);
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  }, [token, authHeaders, refresh, router]);

  const disconnect = useCallback(async () => {
    if (!token) return;
    setDisconnecting(true);

    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: authHeaders(token),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.replace('/auth');
        throw new Error('Unauthorized');
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Disconnect failed');
      }

      toast.success('WhatsApp disconnected');
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      toast.error(message);
    } finally {
      setDisconnecting(false);
    }
  }, [token, authHeaders, refresh, router]);

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
