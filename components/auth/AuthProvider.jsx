'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const sb = supabaseBrowser();

    async function loadUserFromSession(currentSession) {
      if (!currentSession?.access_token) {
        setUser(null);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });

        if (!mounted) return;
        if (!response.ok) {
          console.warn('AuthProvider: failed to load user from session', response.status);
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user || null);
      } catch (error) {
        console.error('AuthProvider: error loading user', error);
        if (!mounted) return;
        setUser(null);
      }
    }

    async function initializeAuth() {
      try {
        const { data } = await sb.auth.getSession();
        console.log('AuthProvider initialize session', data?.session);
        if (!mounted) return;
        setSession(data?.session || null);
        if (data?.session) {
          await loadUserFromSession(data.session);
        }
      } catch (error) {
        console.error('AuthProvider init error', error);
        if (!mounted) return;
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, newSession) => {
      console.log('AuthProvider onAuthStateChange', event, newSession);
      if (!mounted) return;
      setSession(newSession || null);
      setLoading(true);
      if (newSession) {
        await loadUserFromSession(newSession);
      } else {
        setUser(null);
      }
      if (!mounted) return;
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(session);
    const isOnboardingComplete = Boolean(
      user?.personalization?.onboarding_completed ||
      user?.onboardingStep === 'completed' ||
      user?.onboardingCompletedAt
    );

    return {
      session,
      user,
      loading,
      isAuthenticated,
      isOnboardingComplete,
    };
  }, [session, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
