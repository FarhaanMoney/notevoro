'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export function useAuthState() {
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const sb = supabaseBrowser();

    async function initSession() {
      try {
        const { data } = await sb.auth.getSession();
        console.log('useAuthState initSession', data?.session);
        if (!mounted) return;
        setSession(data?.session || null);
        setStatus(data?.session ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        if (!mounted) return;
        console.error('Error loading auth session:', error);
        setStatus('unauthenticated');
      }
    }

    initSession();

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, sessionPayload) => {
      console.log('useAuthState auth state change', event, sessionPayload);
      if (!mounted) return;
      setSession(sessionPayload || null);
      setStatus(sessionPayload ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const sb = supabaseBrowser();

    const fetchUser = async () => {
      if (!session) {
        setUser(null);
        setUserError(null);
        setUserLoading(false);
        return;
      }

      setUserLoading(true);
      setUserError(null);
      try {
        console.log('useAuthState fetchUser session', session);
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        console.log('useAuthState fetchUser response', response.status);

        if (!mounted) return;
        if (!response.ok) {
          if (response.status === 401) {
            await sb.auth.signOut();
            setSession(null);
            setStatus('unauthenticated');
          }
          setUser(null);
          setUserError(new Error('Unable to load user profile'));
          return;
        }

        const data = await response.json();
        console.log('useAuthState fetched user', data.user);
        setUser(data.user || null);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUser(null);
        setUserError(error);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [session]);

  const isOnboardingComplete = Boolean(
    user?.personalization?.onboarding_completed ||
    user?.onboardingStep === 'completed' ||
    user?.onboardingCompletedAt
  );

  return {
    status,
    session,
    user,
    userLoading,
    userError,
    isAuthenticated: Boolean(session),
    isOnboardingComplete,
    loading: status === 'loading' || userLoading,
  };
}
