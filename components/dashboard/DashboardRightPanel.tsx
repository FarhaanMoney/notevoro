'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock, BookOpen, Bolt } from 'lucide-react';

export function DashboardRightPanel() {
  return (
    <aside className="hidden xl:flex xl:w-72 flex-col gap-4 py-6 pr-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-6 flex flex-col gap-4"
      >
        <div className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.6)] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))]">Learning Companion</p>
              <h2 className="mt-1 text-base font-semibold text-[rgb(var(--text-primary))]">AI focus guide</h2>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[rgb(var(--text-secondary))]">
            Stay focused. Get quick prompts and AI insights to keep your learning on track.
          </p>

          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary),0.3)] p-3">
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                <Bolt className="h-3.5 w-3.5 text-cyan-500" />
                <span className="font-medium">Focus boost ready</span>
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--text-primary))]">Summarize your next session in 30 seconds.</p>
            </div>

            <div className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary),0.3)] p-3">
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span className="font-medium">Next review</span>
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--text-primary))]">Algebra at 5:00 PM. Keep streak alive.</p>
            </div>

            <div className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary),0.3)] p-3">
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium">Suggested path</span>
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--text-primary))]">Review Biology, then visual learning.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
