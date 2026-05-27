'use client';

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export default function StepsBlock({ block }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{block.title}</h3>
      {block.steps?.map((step, index) => {
        const safeStep = step || { id: `step-fallback-${index + 1}`, title: `Step ${index + 1}`, description: 'No details available.' };
        return (
          <motion.div
            key={safeStep.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative"
          >
            <div className="flex gap-4 rounded-2xl border border-white/10 bg-zinc-950/90 p-4 hover:border-sky-500/30 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-200 font-bold">
                {index + 1}
              </div>
              <div>
                <h4 className="font-medium text-white">{safeStep.title || `Step ${index + 1}`}</h4>
                <p className="mt-1 text-sm text-zinc-400">{safeStep.description || 'No description available.'}</p>
                {safeStep.tip ? <p className="mt-2 text-xs text-sky-300/90">Tip: {safeStep.tip}</p> : null}
              </div>
            </div>
            {index < (block.steps?.length || 0) - 1 ? (
              <div className="flex justify-center py-1 text-zinc-600">
                <ArrowDown className="h-4 w-4" />
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
