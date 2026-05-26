'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import BlockRenderer from './BlockRenderer';

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  hard: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
};

export default function LearningExperience({ experience }) {
  if (!experience) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-violet-500/10 via-zinc-950 to-cyan-500/5 p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={DIFFICULTY_COLORS[experience.difficulty] || DIFFICULTY_COLORS.medium}>
            {experience.difficulty}
          </Badge>
          {experience.mode ? (
            <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{experience.mode} mode</Badge>
          ) : null}
          {experience.meta?.estimated_read_minutes ? (
            <Badge className="bg-white/5 text-zinc-400 border-white/10">
              ~{experience.meta.estimated_read_minutes} min read
            </Badge>
          ) : null}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{experience.title}</h2>
        <p className="mt-4 text-lg text-zinc-300 max-w-3xl">{experience.short_summary}</p>
        <p className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 py-3 text-violet-100">
          <span className="font-semibold text-violet-200">Core idea: </span>
          {experience.key_idea}
        </p>
      </div>

      <div className="space-y-6">
        {experience.blocks.map((block, index) => (
          <motion.section
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <BlockRenderer block={block} />
          </motion.section>
        ))}
      </div>

      {experience.key_takeaways?.length ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 mb-3">Remember</h3>
          <ul className="space-y-2">
            {experience.key_takeaways.map((t) => (
              <li key={t} className="text-zinc-200 text-sm flex gap-2">
                <span className="text-emerald-400">→</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.div>
  );
}
