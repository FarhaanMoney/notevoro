'use client';

import { motion } from 'framer-motion';

export default function ComparisonBlock({ block }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-semibold text-white">{block.title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300 mb-3">{block.leftLabel}</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            {block.leftPoints.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-rose-300 mb-3">{block.rightLabel}</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            {block.rightPoints.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
      </div>
      {block.verdict ? <p className="text-sm text-zinc-400 italic">{block.verdict}</p> : null}
    </motion.div>
  );
}
