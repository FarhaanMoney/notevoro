'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function TakeawayBlock({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-emerald-300" />
        <h3 className="font-semibold text-white">Key takeaways</h3>
      </div>
      <ul className="space-y-2">
        {block.points.map((point, i) => (
          <motion.li
            key={point}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-2 text-sm text-zinc-200"
          >
            <span className="text-emerald-400">✓</span>
            {point}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
