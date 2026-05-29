'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Globe, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';

const nodes = [
  { id: 'A', top: '16%', left: '12%', title: 'Core concept', color: 'from-cyan-500 to-blue-500' },
  { id: 'B', top: '24%', left: '58%', title: 'Key example', color: 'from-violet-500 to-indigo-500' },
  { id: 'C', top: '62%', left: '26%', title: 'Important formula', color: 'from-emerald-500 to-teal-500' },
  { id: 'D', top: '66%', left: '70%', title: 'Related idea', color: 'from-slate-600 to-cyan-500' },
];

export default function VisualLearningPage() {
  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Visual Learning</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">See concepts connect.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            <Globe className="h-4 w-4 text-cyan-400" /> Canvas mode
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            <Sparkles className="h-4 w-4 text-cyan-400" /> Drag nodes to build connections.
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-3 text-[rgb(var(--text-secondary))] transition hover:border-[rgb(var(--accent-primary))]">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button className="rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-3 text-[rgb(var(--text-secondary))] transition hover:border-[rgb(var(--accent-primary))]">
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-6 h-[540px] overflow-hidden rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] p-6 shadow-[0_40px_120px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.1),transparent_20%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,_rgba(168,85,247,0.08),transparent_20%)]" />
          <div className="absolute left-24 top-20 h-0.5 w-[40%] bg-gradient-to-r from-cyan-400/60 to-transparent" />
          <div className="absolute left-[34%] top-[32%] h-0.5 w-[32%] bg-gradient-to-r from-violet-500/60 to-transparent" />
          <div className="absolute left-[18%] top-[64%] h-0.5 w-[42%] bg-gradient-to-r from-emerald-400/60 to-transparent" />

          {nodes.map((node) => (
            <div key={node.id} style={{ top: node.top, left: node.left }} className="absolute w-48 rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.86)] p-5 shadow-lg shadow-slate-900/5">
              <div className={`inline-flex rounded-full bg-gradient-to-r ${node.color} px-3 py-1 text-xs font-semibold text-white`}>{node.id}</div>
              <h3 className="mt-4 text-lg font-semibold text-[rgb(var(--text-primary))]">{node.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">A quick note to connect the concept with the rest of your study map.</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Concept nodes', description: 'Build ideas with clear info nodes.' },
          { label: 'Visual flow', description: 'See relationships between topics.' },
          { label: 'Focus mode', description: 'Minimal controls for deep learning.' },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-5 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
            <p className="font-semibold">{item.label}</p>
            <p className="mt-2 text-[rgb(var(--text-secondary))]">{item.description}</p>
          </div>
        ))}
      </motion.section>
    </div>
  );
}
