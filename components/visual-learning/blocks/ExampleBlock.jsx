'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export default function ExampleBlock({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5"
    >
      <div className="flex items-center gap-2 text-amber-200 mb-3">
        <Globe className="h-4 w-4" />
        <h3 className="font-semibold text-white">{block.title}</h3>
      </div>
      <p className="text-sm text-zinc-300">{block.scenario}</p>
      <p className="mt-3 text-sm text-amber-100/90 border-t border-amber-500/10 pt-3">{block.insight}</p>
    </motion.div>
  );
}
