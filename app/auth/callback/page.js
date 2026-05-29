'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Loader2 } from 'lucide-react';
import { normalizeRedirect } from '@/lib/auth-utils';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error_description') || url.searchParams.get('error');

    (async () => {
      try {
        console.log('Auth callback started', { code, error });
        if (error) throw new Error(error);

        const redirectParam = url.searchParams.get('redirect');
        const safeRedirect = normalizeRedirect(redirectParam || '/dashboard');
        console.log('Auth callback safeRedirect', safeRedirect);

        let session = null;

        if (code) {
          const { data, error: exErr } = await sb.auth.exchangeCodeForSession(code);
          console.log('exchangeCodeForSession result', { data, exErr });
          if (exErr) {
            console.warn('exchangeCodeForSession failed:', exErr.message || exErr);
          } else {
            session = data?.session || null;
          }
        }

        if (!session) {
          const { data, error: urlErr } = await sb.auth.getSessionFromUrl({ storeSession: true });
          console.log('getSessionFromUrl result', { data, urlErr });
          if (urlErr) {
            console.warn('getSessionFromUrl failed:', urlErr.message || urlErr);
          }
          session = session || data?.session || null;
        }

        if (!session) {
          const { data } = await sb.auth.getSession();
          console.log('getSession fallback current session', data?.session);
          session = data?.session || null;
        }

        if (!session) {
          console.warn('No session found after auth callback, redirecting to auth page');
          window.location.href = `/auth?redirect=${encodeURIComponent(safeRedirect)}`;
          return;
        }

        console.log('Auth callback session', session);
        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
        console.log('/api/auth/me response status', response.status);

        if (response.status === 401) {
          await sb.auth.signOut();
          window.location.href = `/auth?redirect=${encodeURIComponent(safeRedirect)}`;
          return;
        }

        if (!response.ok) {
          console.warn('Auth/me response not ok:', response.status);
          window.location.href = `/auth?redirect=${encodeURIComponent(safeRedirect)}`;
          return;
        }

        const userData = await response.json();
        console.log('Auth callback userData', userData);
        const isOnboardingComplete = userData.user?.personalization?.onboarding_completed || userData.user?.onboardingStep === 'completed' || Boolean(userData.user?.onboardingCompletedAt);
        window.location.href = isOnboardingComplete ? safeRedirect : '/onboarding';
      } catch (error) {
        console.error('Auth callback failed:', error);
        const fallbackRedirect = normalizeRedirect(url.searchParams.get('redirect') || '/dashboard');
        window.location.href = `/auth?redirect=${encodeURIComponent(fallbackRedirect)}`;
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-zinc-100">
      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
    </div>
  );
}

