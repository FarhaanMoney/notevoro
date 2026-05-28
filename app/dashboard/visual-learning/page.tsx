'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Play } from 'lucide-react';

export default function VisualLearningPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const topics = [
    {
      id: 'mitosis',
      title: 'Cell Mitosis',
      description: 'Watch the dynamic process of cell division with animated diagrams',
      category: 'Biology',
      isPremium: false,
    },
    {
      id: 'photosynthesis',
      title: 'Photosynthesis Flow',
      description: 'Interactive concept map showing energy conversion in plants',
      category: 'Biology',
      isPremium: false,
    },
    {
      id: 'water-cycle',
      title: 'Water Cycle',
      description: 'Animated illustration of evaporation, condensation, and precipitation',
      category: 'Earth Science',
      isPremium: true,
    },
    {
      id: 'planetary-motion',
      title: 'Planetary Motion',
      description: 'Interactive solar system with orbital mechanics visualization',
      category: 'Physics',
      isPremium: true,
    },
    {
      id: 'molecular-bonds',
      title: 'Molecular Bonds',
      description: 'Visual representation of covalent and ionic bonds',
      category: 'Chemistry',
      isPremium: false,
    },
    {
      id: 'ecosystem-pyramid',
      title: 'Energy Pyramid',
      description: 'Understand energy transfer through ecosystems',
      category: 'Biology',
      isPremium: true,
    },
  ];

  const userPlan = 'pro' as 'free' | 'pro';

  return (
    <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Visual Learning</h1>
          <p className="text-zinc-400">Interactive diagrams and animated concepts to supercharge learning</p>
        </motion.div>

        {/* Preview Section */}
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-96 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/70 to-slate-900/50 overflow-hidden shadow-[0_40px_120px_rgba(15,23,42,0.35)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_60%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 100 }}
                  className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-cyan-500/20 border border-cyan-400/40"
                >
                  <Play className="h-8 w-8 text-cyan-300 ml-1" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">
                  {topics.find((t) => t.id === selectedTopic)?.title}
                </h2>
                <p className="text-zinc-400 max-w-md">
                  {topics.find((t) => t.id === selectedTopic)?.description}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-[0_20px_80px_rgba(34,211,238,0.25)]"
                >
                  Play Visualization
                </motion.button>
              </div>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="absolute top-4 right-4 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white backdrop-blur-xl transition hover:bg-white/10"
            >
              Close
            </button>
          </motion.div>
        )}

        {/* Topics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Available Topics</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => {
              const isLocked = topic.isPremium && userPlan === 'free';

              return (
                <motion.button
                  key={topic.id}
                  onClick={() => !isLocked && setSelectedTopic(topic.id)}
                  disabled={isLocked}
                  whileHover={!isLocked ? { scale: 1.02 } : {}}
                  className={`relative rounded-2xl border p-6 text-left transition overflow-hidden group ${
                    isLocked
                      ? 'border-white/10 bg-white/5 opacity-60 cursor-not-allowed'
                      : 'border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-cyan-500/5 cursor-pointer'
                  }`}
                >
                  {/* Glow effect on hover */}
                  {!isLocked && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.1),_transparent_60%)] opacity-0 group-hover:opacity-100 transition" />
                  )}

                  <div className="relative space-y-4">
                    {/* Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                        {topic.category}
                      </span>
                      {isLocked && <Lock className="h-4 w-4 text-amber-400" />}
                      {!isLocked && (
                        <Play className="h-4 w-4 text-cyan-300 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-white">{topic.title}</h3>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {topic.description}
                    </p>

                    {/* Pro badge */}
                    {topic.isPremium && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                        <Sparkles className="h-3 w-3" />
                        Pro Feature
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Upgrade CTA for Free Users */}
        {userPlan === 'free' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Unlock Visual Learning</h2>
                <p className="text-zinc-300 max-w-2xl">
                  Premium members get access to advanced visual learning tools, interactive diagrams, and animated concept maps. Upgrade to Pro to see how concepts come alive.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 font-semibold text-white shadow-[0_20px_80px_rgba(139,92,246,0.25)] transition hover:brightness-110 flex-shrink-0"
              >
                Upgrade Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
  );
}
