'use client';

import { useCallback, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { safeStringify } from '@/lib/utils/safeJson';
import { toast } from 'sonner';

export function useVisualLearning(initialEnergy = 0) {
  const [token, setToken] = useState(null);
  const [energy, setEnergy] = useState(initialEnergy);
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('beginner');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');

  const initSession = useCallback(async () => {
    const { data: { session } } = await supabaseBrowser().auth.getSession();
    if (session?.access_token) {
      setToken(session.access_token);
      return session.access_token;
    }
    return null;
  }, []);

  const generate = useCallback(async () => {
    setError(null);
    setExperience(null);
    setLoading(true);
    setProgress(8);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 6, 92));
    }, 400);

    try {
      let accessToken = token;
      if (!accessToken) {
        accessToken = await initSession();
      }
      if (!accessToken) {
        throw new Error('Please sign in to continue');
      }

      const body = safeStringify({
        topic: topic.trim(),
        context: context.trim(),
        mode,
      });

      const res = await fetch('/api/visual-explanation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Generation failed');
      }

      setExperience(data.data);
      if (typeof data.remainingEnergy === 'number' || data.remainingEnergy === null) {
        setEnergy(data.remainingEnergy ?? energy);
      }
      setProgress(100);
      toast.success('Visual lesson ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error(message);
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }, [token, topic, context, mode, energy, initSession]);

  return {
    token,
    energy,
    experience,
    loading,
    progress,
    error,
    mode,
    setMode,
    topic,
    setTopic,
    context,
    setContext,
    generate,
    initSession,
    setExperience,
    setError,
  };
}
