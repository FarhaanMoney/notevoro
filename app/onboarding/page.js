'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const GOALS = [
  'Exams',
  'School',
  'College',
  'Competitive Exams',
  'Productivity',
  'Skill Learning',
];

const MODES = [
  'Flashcards',
  'AI Chat',
  'Visual Learning',
  'Mock Tests',
  'Smart Notes',
  'Revision',
];

const STYLES = [
  'Fast learner',
  'Visual learner',
  'Deep understanding',
  'Exam-focused',
  'Memory-focused',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState([]);
  const [modes, setModes] = useState([]);
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verifyAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser().auth.getSession();
        if (!session) {
          router.replace(`/auth?redirect=/onboarding`);
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.status === 401) {
          router.replace(`/auth?redirect=/onboarding`);
          return;
        }

        const data = await res.json();
        const done = Boolean(
          data.user?.personalization?.onboarding_completed ||
          data.user?.onboardingStep === 'completed' ||
          data.user?.onboardingCompletedAt
        );

        if (done) {
          router.replace('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Onboarding auth check failed:', error);
        router.replace('/auth?redirect=/onboarding');
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    verifyAuth();
    return () => {
      mounted = false;
    };
  }, [router]);

  const progressTitle = useMemo(() => {
    switch (step) {
      case 1:
        return 'Welcome to Notevoro';
      case 2:
        return 'Choose your learning goals';
      case 3:
        return 'Pick your favorite study modes';
      case 4:
        return 'Select your study style';
      case 5:
        return 'Launch your AI study universe';
      default:
        return 'Onboarding';
    }
  }, [step]);

  const progressSubtitle = useMemo(() => {
    switch (step) {
      case 1:
        return 'A cinematic setup to personalize your intelligent study experience.';
      case 2:
        return 'Tell us what matters most so Notevoro can tailor your next actions.';
      case 3:
        return 'Choose the tools you love and the ones that keep you focused.';
      case 4:
        return 'Find the study rhythm that feels effortless and powerful.';
      case 5:
        return 'Preparing your premium workspace and personal AI study plan.';
      default:
        return '';
    }
  }, [step]);

  const toggleSelection = (value, currentState, setState, single = false) => {
    if (single) {
      setState(value === currentState ? '' : value);
      return;
    }

    if (currentState.includes(value)) {
      setState(currentState.filter((item) => item !== value));
    } else {
      setState([...currentState, value]);
    }
  };

  const canContinue = () => {
    if (step === 2) return goals.length > 0;
    if (step === 3) return modes.length > 0;
    if (step === 4) return Boolean(style);
    return true;
  };

  const handleNext = () => {
    if (step < 5) {
      if (!canContinue()) return;
      setStep((current) => current + 1);
      return;
    }

    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session) throw new Error('Please sign in to continue.');

      const payload = {
        goals,
        modes,
        style,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ personalization: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Unable to save onboarding selections.');
      }

      toast.success('Preparing your AI study universe...');
      router.replace('/dashboard');
    } catch (error) {
      console.error('Onboarding failed:', error);
      toast.error(error.message || 'Something went wrong during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04050b] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingShell
      title={progressTitle}
      subtitle={progressSubtitle}
      step={step}
      total={5}
      onBack={() => step > 1 && setStep(step - 1)}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step <= 1 || loading}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || (step > 1 && !canContinue())}
            className="min-w-[160px]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing...
              </span>
            ) : step < 5 ? 'Continue' : 'Launch universe'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
        {step === 1 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_40px_120px_-80px_rgba(59,130,246,0.45)]">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-200/80 mb-4">Welcome aboard</p>
            <h2 className="text-2xl font-semibold text-white mb-4">Let’s tune your study universe.</h2>
            <p className="text-sm leading-7 text-zinc-300">Answer a few quick questions so Notevoro can personalize every study session, flashcard, quiz, and visual path for you.</p>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleSelection(goal, goals, setGoals)}
                className={`rounded-3xl border p-4 text-left transition ${goals.includes(goal) ? 'border-cyan-400/40 bg-cyan-500/15 text-white shadow-[0_20px_80px_-40px_rgba(34,211,238,0.35)]' : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'}`}>
                <span className="block text-sm font-semibold">{goal}</span>
                <span className="mt-2 block text-xs text-zinc-400">Add this focus to your AI roadmap.</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {MODES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleSelection(option, modes, setModes)}
                className={`rounded-3xl border p-4 text-left transition ${modes.includes(option) ? 'border-violet-400/40 bg-violet-500/15 text-white shadow-[0_20px_80px_-40px_rgba(124,58,237,0.35)]' : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'}`}>
                <span className="block text-sm font-semibold">{option}</span>
                <span className="mt-2 block text-xs text-zinc-400">Prime your workspace with {option}.</span>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {STYLES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleSelection(option, style, setStyle, true)}
                className={`rounded-3xl border p-4 text-left transition ${style === option ? 'border-emerald-400/40 bg-emerald-500/15 text-white shadow-[0_20px_80px_-40px_rgba(16,185,129,0.35)]' : 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'}`}>
                <span className="block text-sm font-semibold">{option}</span>
                <span className="mt-2 block text-xs text-zinc-400">This helps the AI match your pace.</span>
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-[#050812] to-slate-950/80 p-8 text-center shadow-[0_40px_120px_-80px_rgba(59,130,246,0.35)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-200 shadow-[0_0_40px_rgba(59,130,246,0.25)]">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-300" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Preparing your AI study universe...</h2>
            <p className="text-sm leading-7 text-zinc-400">We’re saving your preferences and building a premium dashboard experience just for you.</p>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
