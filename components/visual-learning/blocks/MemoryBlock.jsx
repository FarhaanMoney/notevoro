'use client';

import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export default function MemoryBlock({ block }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5"
    >
      <div className="flex items-center gap-2 text-indigo-200 mb-2">
        <Brain className="h-5 w-5" />
        <h3 className="font-semibold text-white">{block.title}</h3>
      </div>
      <p className="text-zinc-200">{block.trick}</p>
      {block.recallCue ? <p className="mt-2 text-xs text-indigo-300/80">Recall cue: {block.recallCue}</p> : null}
    </motion.div>
  );
}
