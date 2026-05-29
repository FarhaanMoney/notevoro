'use client';

import { motion } from 'framer-motion';
import { BarChart3, Clock, Sparkles, Zap } from 'lucide-react';

const stats = [
  { icon: Clock, label: 'Hours studied', value: '48.5h' },
  { icon: Zap, label: 'Flashcards reviewed', value: '124' },
  { icon: BarChart3, label: 'Quiz accuracy', value: '84%' },
];

const subjects = [
  { name: 'Biology', progress: 85 },
  { name: 'Physics', progress: 74 },
  { name: 'Chemistry', progress: 92 },
];

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Progress</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">Learning momentum</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            <Sparkles className="h-4 w-4 text-cyan-400" /> Keep your streak going
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(var(--accent-primary),0.12)] text-[rgb(var(--accent-primary))]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Subject mastery</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">Review your strongest and weakest topics at a glance.</p>
            </div>
          </div>
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.name} className="space-y-2 rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[rgb(var(--text-primary))]">{subject.name}</p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{subject.progress}%</p>
                </div>
                <div className="h-2 rounded-full bg-[rgb(var(--border-color))]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${subject.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
