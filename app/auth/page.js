'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new login page
    router.replace('/login');
  }, [router]);

  return null;
}
