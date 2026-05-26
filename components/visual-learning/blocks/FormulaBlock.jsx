'use client';

import { motion } from 'framer-motion';

export default function FormulaBlock({ block }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-6"
    >
      <div className="rounded-2xl bg-black/50 border border-fuchsia-500/30 px-5 py-4 font-mono text-lg text-fuchsia-100 text-center">
        {block.expression}
      </div>
      <p className="mt-4 text-sm text-zinc-300">{block.explanation}</p>
      {block.variables?.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {block.variables.map((v) => (
            <div key={v.symbol} className="rounded-xl bg-zinc-950/80 px-3 py-2 text-sm">
              <span className="text-fuchsia-300 font-mono">{v.symbol}</span>
              <span className="text-zinc-500 mx-2">→</span>
              <span className="text-zinc-400">{v.meaning}</span>
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
