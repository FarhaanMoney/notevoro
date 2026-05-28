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
        if (error) throw new Error(error);

        const redirectParam = url.searchParams.get('redirect');
        const safeRedirect = normalizeRedirect(redirectParam || '/dashboard');

        let session = null;

        if (code) {
          const { data, error: exErr } = await sb.auth.exchangeCodeForSession(code);
          if (exErr) {
            console.warn('exchangeCodeForSession failed:', exErr.message || exErr);
          } else {
            session = data?.session || null;
          }
        }

        if (!session) {
          const { data, error: urlErr } = await sb.auth.getSessionFromUrl({ storeSession: true });
          if (urlErr) {
            console.warn('getSessionFromUrl failed:', urlErr.message || urlErr);
          }
          session = session || data?.session || null;
        }

        if (!session) {
          const { data } = await sb.auth.getSession();
          session = data?.session || null;
        }

        if (!session) {
          console.warn('No session found after auth callback, redirecting to auth page');
          return router.replace(`/auth?redirect=${encodeURIComponent(safeRedirect)}`);
        }

        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (response.status === 401) {
          await sb.auth.signOut();
          return router.replace(`/auth?redirect=${encodeURIComponent(safeRedirect)}`);
        }

        if (!response.ok) {
          console.warn('Auth/me response not ok:', response.status);
          return router.replace(`/auth?redirect=${encodeURIComponent(safeRedirect)}`);
        }

        const userData = await response.json();
        const isOnboardingComplete = userData.user?.personalization?.onboarding_completed || userData.user?.onboardingStep === 'completed' || Boolean(userData.user?.onboardingCompletedAt);
        return router.replace(isOnboardingComplete ? safeRedirect : '/onboarding');
      } catch (error) {
        console.error('Auth callback failed:', error);
        const fallbackRedirect = normalizeRedirect(url.searchParams.get('redirect') || '/dashboard');
        return router.replace(`/auth?redirect=${encodeURIComponent(fallbackRedirect)}`);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-zinc-100">
      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
    </div>
  );
}

