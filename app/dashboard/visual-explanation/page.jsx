'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import VisualLearningStudio from '@/components/visual-learning/VisualLearningStudio';
import { Loader2 } from 'lucide-react';

export default function VisualExplanationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        const session = data?.session;
        if (!session?.access_token) {
          router.replace('/auth');
          return;
        }
        return fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (!json?.user) {
              router.replace('/auth');
              return;
            }
            setUser(json.user);
          });
      })
      .catch(() => router.replace('/auth'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <VisualLearningStudio
      initialEnergy={user?.ai_energy ?? 0}
      user={user}
    />
  );
}
