'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock, BookOpen, Bolt } from 'lucide-react';

export function DashboardRightPanel() {
  return (
    <aside className="hidden xl:flex xl:w-[26rem] flex-col gap-6 py-6 pr-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="sticky top-6 flex flex-col gap-5"
      >
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Learning Companion</p>
              <h2 className="mt-3 text-xl font-bold text-white">AI-powered focus assistant</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_20px_60px_rgba(59,130,246,0.25)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Keep your learning aligned with your current mission. Get quick prompts, review goals, and stay on track without leaving your workflow.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Bolt className="h-4 w-4 text-cyan-300" />
                <span>Focus boost ready</span>
              </div>
              <p className="mt-3 text-white">Use AI to summarize your next study session in 30 seconds.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Clock className="h-4 w-4 text-violet-300" />
                <span>Next review</span>
              </div>
              <p className="mt-3 text-white">Algebra practice at 5:00 PM. Keep the streak alive.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <BookOpen className="h-4 w-4 text-cyan-300" />
                <span>Suggested path</span>
              </div>
              <p className="mt-3 text-white">Review Biology notes, then switch to visual learning for stronger recall.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
