'use client';

import { motion } from 'framer-motion';

export default function ConceptBlock({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-zinc-950 to-zinc-950 p-6"
    >
      <div className="flex gap-4">
        <span className="text-3xl shrink-0">{block.icon || '💡'}</span>
        <div>
          <h3 className="text-xl font-semibold text-white">{block.title}</h3>
          <p className="mt-2 text-zinc-300 leading-relaxed">{block.summary}</p>
          {block.highlight ? (
            <p className="mt-3 rounded-2xl bg-violet-500/15 border border-violet-500/20 px-4 py-2 text-sm text-violet-100">
              {block.highlight}
            </p>
          ) : null}
          {block.keywords?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {block.keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-zinc-300">
                  {kw}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
