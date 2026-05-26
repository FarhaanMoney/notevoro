'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function QuizBlock({ block }) {
  const [selected, setSelected] = useState(null);
  const answered = selected !== null;
  const correct = selected === block.correctAnswer;

  return (
    <motion.div className="rounded-3xl border border-orange-500/25 bg-orange-500/5 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Quick check</h3>
      <p className="text-zinc-200 mb-4">{block.question}</p>
      <div className="space-y-2">
        {block.options.map((option) => {
          let style = 'border-white/10 bg-zinc-950 hover:border-orange-500/40';
          if (answered) {
            if (option === block.correctAnswer) style = 'border-emerald-500/40 bg-emerald-500/15';
            else if (option === selected) style = 'border-red-500/40 bg-red-500/15';
            else style = 'border-white/5 opacity-60';
          }
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => setSelected(option)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex gap-2 items-start text-sm"
        >
          {correct ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
          <p className="text-zinc-300">{block.explanation}</p>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
