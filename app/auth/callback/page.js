'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession()
      .then(({ data }) => {
        if (data?.session) router.replace('/dashboard');
        else router.replace('/');
      })
      .catch(() => router.replace('/'));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-zinc-100">
      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
    </div>
  );
}

