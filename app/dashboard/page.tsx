'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, BarChart3, Sparkles, Zap, MessageCircle } from 'lucide-react';

const recentWork = [
  {
    label: 'Genetics Quiz',
    value: '2 questions left',
    href: '/dashboard/quizzes',
    icon: BarChart3,
    tone: 'from-cyan-500 to-blue-500',
  },
  {
    label: 'Physics Notes',
    value: 'Summary draft',
    href: '/dashboard/notes',
    icon: BookOpen,
    tone: 'from-violet-500 to-indigo-500',
  },
  {
    label: 'Chemistry Flashcards',
    value: '24 cards ready',
    href: '/dashboard/flashcards',
    icon: Zap,
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'Visual Map',
    value: 'Concept nodes',
    href: '/dashboard/visual-learning',
    icon: Sparkles,
    tone: 'from-slate-600 to-cyan-500',
  },
];

const suggestions = [
  'Generate flashcards for your Biology notes',
  'Continue the Physics quiz',
  'Summarize your Chemistry chapter',
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="space-y-3">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Welcome back</p>
          <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))] sm:text-4xl">
            Your study workspace, simplified.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--text-secondary))]">
            Pick up where you left off, jump into your next task, or ask the AI assistant to build your next session.
          </p>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {recentWork.map((work) => {
          const Icon = work.icon;
          return (
            <Link key={work.label} href={work.href} className="group">
              <div className="rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-5 transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
                <div className="flex items-center justify-between gap-3">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${work.tone} text-white shadow-lg shadow-slate-900/10`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{work.label}</p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{work.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">AI Suggestions</p>
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">What should I do next?</h2>
          </div>
          <Link href="/dashboard/chat" className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] px-4 py-2 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
            Open AI chat <BarChart3 className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {suggestions.map((suggestion) => (
            <button key={suggestion} className="text-left rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-4 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
              {suggestion}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.18 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Start with the AI assistant</p>
            <p className="max-w-2xl text-sm text-[rgb(var(--text-secondary))]">
              Your floating command bar is the fastest way to ask for summaries, flashcards, quizzes, or study plans.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-3 text-xs font-medium text-[rgb(var(--text-secondary))]">
            <Zap className="h-4 w-4 text-cyan-400" />
            Use the AI input below
          </div>
        </div>
      </motion.section>
    </div>
  );
}
