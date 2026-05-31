'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import QuestionCard from '@/components/onboarding/QuestionCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setProfile(profile);

      const isOnboardingComplete = profile?.personalization?.onboarding_completed || 
                                   profile?.onboardingStep === 'completed' || 
                                   Boolean(profile?.onboardingCompletedAt);

      if (isOnboardingComplete) {
        router.replace('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  const handleSelect = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  };

  const completeOnboarding = async (startTrial = false) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      let personalizationData = { 
        ...answers, 
        onboarding_completed: true, 
        onboarding_completed_at: new Date().toISOString() 
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ personalization: personalizationData })
        .eq('id', session.user.id);

      if (updateError) throw new Error('Failed to save');

      if (startTrial) {
        try {
          const trialRes = await fetch('/api/subscription/start-trial', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
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
      title={isTrialQuestion ? "Start Your Pro Trial" : "Welcome to Notevoro"} 
      subtitle={isTrialQuestion ? "Unlock all features for 7 days free" : "A smarter way to learn and stay focused"} 
      step={step} 
      total={QUESTIONS.length} 
      onBack={() => step>1 && setStep(step-1)}
    >
      {isTrialQuestion ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-3">7-Day Pro Trial</h3>
            <ul className="space-y-2 text-sm text-zinc-300 mb-4">
              <li>✨ 250 AI Energy per day (vs 20 for Free)</li>
              <li>🚀 Unlimited AI-powered study help</li>
              <li>📊 Advanced study analytics</li>
              <li>🎁 Premium features unlocked</li>
              <li>⏰ Cancel anytime, no credit card required</li>
            </ul>
            <p className="text-xs text-zinc-400">After 7 days, you&apos;ll revert to the Free plan unless you upgrade.</p>
          </div>
          <QuestionCard question={q.question} options={q.options} selected={answers[q.id]} onSelect={(v)=>handleSelect(q.id,v)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(step-1)} disabled={loading}>Back</Button>
            <Button onClick={handleNext} disabled={loading || !answers[q.id]}>Continue</Button>
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
