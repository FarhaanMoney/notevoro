'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Zap, BookOpen } from 'lucide-react';
import { useVisualLearning } from '@/hooks/useVisualLearning';
import ModeSelector from './ModeSelector';
import GenerationLoader from './GenerationLoader';
import LearningExperience from './LearningExperience';
import VisualLearningErrorBoundary from './VisualLearningErrorBoundary';

export default function VisualLearningStudio({ initialEnergy = 0, user }) {
  const router = useRouter();
  const {
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
  } = useVisualLearning(initialEnergy);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const energyDisplay = energy === Infinity || energy === null ? '∞' : energy;

  return (
    <div className="min-h-screen bg-[#030308] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-600/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-zinc-700 text-white w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2">
            <Zap className="h-4 w-4 text-amber-300" />
            <span className="text-sm text-zinc-400">AI Energy</span>
            <span className="text-xl font-bold">{energyDisplay}</span>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            Visual Learning Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-violet-100 to-cyan-200 bg-clip-text text-transparent">
            Learn visually. Understand deeply.
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto md:mx-0">
            AI-built lessons with diagrams, step flows, quizzes, and memory tricks — designed so concepts finally click.
          </p>
        </motion.div>

        <div className="rounded-[28px] border border-white/10 bg-zinc-950/60 backdrop-blur p-6 md:p-8 space-y-6">
          <div>
            <label className="text-sm font-medium text-zinc-300">What do you want to understand?</label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g. How does photosynthesis convert light into chemical energy?"
              className="mt-2 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Context (optional)</label>
            <Input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Grade 10 biology, JEE prep, quick revision…"
              className="mt-2 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Learning mode</label>
            <ModeSelector mode={mode} onChange={setMode} disabled={loading} />
          </div>

          <Button
            onClick={generate}
            disabled={loading || topic.trim().length < 3}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-base font-semibold hover:opacity-90"
          >
            {loading ? 'Generating visual lesson…' : 'Generate Visual Lesson'}
          </Button>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loader" exit={{ opacity: 0 }}>
              <GenerationLoader progress={progress} />
            </motion.div>
          ) : experience ? (
            <motion.div key="experience" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <VisualLearningErrorBoundary>
                <LearningExperience experience={experience} />
              </VisualLearningErrorBoundary>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-zinc-500"
            >
              <p>Your interactive lesson will appear here — concepts, diagrams, quiz, and more.</p>
              {user?.plan === 'free' && !user?.is_trial_active ? (
                <p className="mt-2 text-amber-400/90 text-sm">Pro, Premium, or trial required.</p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
