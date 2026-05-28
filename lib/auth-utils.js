'use client';

export function isSafeRedirect(redirect) {
  if (!redirect || typeof redirect !== 'string') return false;
  if (redirect.startsWith('//')) return false;
  if (!redirect.startsWith('/')) return false;
  if (redirect.includes('..')) return false;
  if (redirect.startsWith('/auth')) return false;
  if (redirect.startsWith('/auth/callback')) return false;
  if (redirect.startsWith('/onboarding') && redirect !== '/onboarding') return false;
  return true;
}

export function normalizeRedirect(redirect) {
  return isSafeRedirect(redirect) ? redirect : '/dashboard';
}
