'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import QuestionCard from '@/components/onboarding/QuestionCard';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';

const QUESTIONS = [
  {
    id: 'goal',
    question: 'What do you want help with?',
    options: ['Studying','Productivity','Notes','Exams','Writing','Research','General AI Chat']
  },
  {
    id: 'level',
    question: 'Education level',
    options: ['Middle School','High School','College','University','Professional']
  },
  {
    id: 'preference',
    question: 'How do you prefer to study?',
    options: ['Visual (diagrams, charts)','Textual (notes, essays)','Interactive (quizzes, practice)','Mixed (all of the above)']
  },
  {
    id: 'trial',
    question: 'Ready to unlock Pro features?',
    options: ['Start 7-day free trial','Continue with free plan']
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session) return router.replace('/auth');
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (r.status === 401) return router.replace('/auth');
      const d = await r.json();
      const done = d.user?.personalization?.onboarding_completed || d.user?.onboardingStep === 'completed' || Boolean(d.user?.onboardingCompletedAt);
      if (done) router.replace('/dashboard');
    })();
  }, [router]);

  const handleSelect = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  };

  const completeOnboarding = async (startTrial = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      let personalizationData = { 
        ...answers, 
        onboarding_completed: true, 
        onboarding_completed_at: new Date().toISOString() 
      };

      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ personalization: personalizationData })
      });
      if (!res.ok) throw new Error('Failed to save');

      if (startTrial) {
        try {
          const trialRes = await fetch('/api/subscription/start-trial', {
            method: 'POST',
            headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ trial_days: 7 })
          });
          const trialData = await trialRes.json();
          if (trialRes.ok && trialData.ok) {
            toast.success('🎉 7-day trial started! Enjoy Pro features');
          } else {
            console.error('Trial start failed:', trialData);
            toast.error(trialData.error || 'Unable to start trial. Please try again.');
            return;
          }
        } catch (e) {
          console.error('Trial start error:', e);
          toast.error('Unable to start trial. Please try again.');
          return;
        }
      }

      toast.success('Welcome to Notevoro — opening your dashboard');
      router.replace('/dashboard');
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleNext = async () => {
    if (step < QUESTIONS.length) return setStep(s => s+1);
    const wantsTrial = answers.trial === 'Start 7-day free trial';
    completeOnboarding(wantsTrial);
  };

  const q = QUESTIONS[step-1];
  const isTrialQuestion = q.id === 'trial';

  return (
    <OnboardingShell 
      title={isTrialQuestion ? "Unlock Pro for 7 days" : "Welcome to Notevoro"} 
      subtitle={isTrialQuestion ? "Start your premium trial and access every Pro feature instantly." : "A smarter way to learn with AI-powered study tools."} 
      step={step} 
      total={QUESTIONS.length} 
      onBack={() => step>1 && setStep(step-1)}
    >
      {isTrialQuestion ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 p-6 shadow-[0_40px_120px_-80px_rgba(124,58,237,0.7)]">
            <h3 className="text-xl font-semibold text-white mb-3">7-Day Pro Trial</h3>
            <ul className="space-y-2 text-sm text-zinc-300 mb-4">
              <li>✨ 250 AI Energy every day</li>
              <li>🚀 Unlock WhatsApp, Notes, Mock Tests, and Study Plans</li>
              <li>📈 Faster priorities, advanced analytics, premium tools</li>
              <li>🔒 No credit card required to begin</li>
            </ul>
            <p className="text-xs text-zinc-400">The trial lasts 7 days, then you return to Free unless you upgrade.</p>
          </div>
          <QuestionCard question={q.question} options={q.options} selected={answers[q.id]} onSelect={(v)=>handleSelect(q.id,v)} />
          <div className="flex flex-col gap-3 sm:flex-row justify-end">
            <Button variant="ghost" onClick={() => setStep(step-1)} disabled={loading}>Back</Button>
            <Button onClick={handleNext} disabled={loading || !answers[q.id]}>{step < QUESTIONS.length ? 'Continue' : 'Start trial'}</Button>
          </div>
        </div>
      ) : (
        <>
          <QuestionCard question={q.question} options={q.options} selected={answers[q.id]} onSelect={(v)=>handleSelect(q.id,v)} />
          <div className="flex justify-end">
            <Button onClick={handleNext} disabled={loading || !answers[q.id]}>{step < QUESTIONS.length ? 'Next' : 'Get started'}</Button>
          </div>
        </>
      )}
    </OnboardingShell>
  );
}
