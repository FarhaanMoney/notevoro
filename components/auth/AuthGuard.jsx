'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthState } from '@/hooks/useAuthState';
import { normalizeRedirect } from '@/lib/auth-utils';

export function AuthGuard({ children }) {
  const { isAuthenticated, isOnboardingComplete, loading, userError } = useAuthState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const redirect = normalizeRedirect(pathname);
      router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (userError && isAuthenticated) {
      const redirect = normalizeRedirect(pathname);
      router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (isAuthenticated && !isOnboardingComplete) {
      router.replace('/onboarding');
    }
  }, [loading, isAuthenticated, isOnboardingComplete, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07070f] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAuthenticated || !isOnboardingComplete) {
    return null;
  }

  return children;
}
