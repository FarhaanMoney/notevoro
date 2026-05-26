'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function GenerationLoader({ progress = 0 }) {
  const labels = ['Mapping concepts', 'Building diagrams', 'Crafting examples', 'Preparing quiz'];
  const labelIndex = Math.min(labels.length - 1, Math.floor(progress / 25));

  return (
    <div className="rounded-3xl border border-violet-500/20 bg-zinc-950/80 p-10 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20"
      >
        <Sparkles className="h-8 w-8 text-violet-300" />
      </motion.div>
      <p className="text-lg font-semibold text-white">Building your visual lesson</p>
      <p className="mt-2 text-sm text-zinc-400">{labels[labelIndex]}…</p>
      <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(8, progress)}%` }}
          transition={{ ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
