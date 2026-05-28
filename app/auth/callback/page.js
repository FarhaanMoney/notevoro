'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Loader2 } from 'lucide-react';

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

        let session = null;

        if (code) {
          const { data, error: exErr } = await sb.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
          session = data?.session || null;
        }

        if (!session) {
          const { data } = await sb.auth.getSession();
          session = data?.session || null;
        }

        if (session?.access_token) {
          try {
            const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });

            if (response.status === 401) {
              await sb.auth.signOut();
              return router.replace('/');
            }

            if (!response.ok) {
              return router.replace('/dashboard');
            }

            const userData = await response.json();
            const isOnboardingComplete = userData.user?.personalization?.onboarding_completed || userData.user?.onboardingStep === 'completed' || Boolean(userData.user?.onboardingCompletedAt);
            if (!isOnboardingComplete) {
              return router.replace('/onboarding');
            }

            return router.replace('/dashboard');
          } catch (error) {
            console.error('Error checking user data:', error);
            return router.replace('/dashboard');
          }
        }

        const { data } = await sb.auth.getSession();
        if (data?.session?.access_token) {
          try {
            const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${data.session.access_token}` } });
            if (response.status === 401) {
              await sb.auth.signOut();
              router.replace('/');
              return;
            }
            if (response.ok) {
              const userData = await response.json();
              const isOnboardingComplete = userData.user?.personalization?.onboarding_completed || userData.user?.onboardingStep === 'completed' || Boolean(userData.user?.onboardingCompletedAt);
              if (!isOnboardingComplete) {
                router.replace('/onboarding');
                return;
              }
            }
          } catch (error) {
            console.error('Error checking auth:', error);
          }
          router.replace('/dashboard');
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-zinc-100">
      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
    </div>
  );
}

