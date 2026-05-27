'use client';

import React from 'react';
import { motion } from 'framer-motion';

const sunlight = Array.from({ length: 8 }, (_, index) => ({ id: `sun-${index}`, x: 32 + index * 20, delay: index * 0.08 }));
const oxygenBubbles = Array.from({ length: 6 }, (_, index) => ({ id: `bubble-${index}`, left: 32 + index * 28, delay: index * 0.2 }));

export default function PhotosynthesisSimulation({ lesson, step }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#06111f] px-6 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,245,84,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.12),transparent_28%)]" />
      <div className="absolute left-8 top-8 flex gap-2">
        {sunlight.map((ray) => (
          <motion.div
            key={ray.id}
            className="h-12 w-2 rounded-full bg-yellow-300/90"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: [0, 1, 0.6], y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: ray.delay }}
          />
        ))}
      </div>
      <div className="absolute right-8 top-16 rounded-[2rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200 backdrop-blur-md">
        <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Photosynthesis flow</div>
        <p className="mt-2 max-w-xs">Sunlight, water, and carbon dioxide convert into energy inside chloroplasts.</p>
      </div>

      <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-center">
        <div className="relative mx-auto h-[320px] w-[420px] rounded-[3rem] border border-white/10 bg-[#0f172a]/80 shadow-[0_0_120px_rgba(16,185,129,0.14)]">
          <div className="absolute inset-x-8 top-8 h-16 rounded-full bg-emerald-400/10" />
          <motion.div
            className="absolute left-1/2 top-16 h-20 w-20 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400/80 shadow-[0_0_40px_rgba(52,211,153,0.35)]"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-x-10 top-40 flex justify-between gap-8">
            <div className="h-24 w-24 rounded-[2rem] bg-white/5 p-3 text-center text-sm text-slate-200">
              <div className="text-xs uppercase tracking-[0.28em] text-sky-300">Water</div>
              <div className="mt-3 text-3xl font-semibold text-cyan-200">H₂O</div>
            </div>
            <div className="h-24 w-24 rounded-[2rem] bg-white/5 p-3 text-center text-sm text-slate-200">
              <div className="text-xs uppercase tracking-[0.28em] text-amber-300">CO₂</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-200">CO₂</div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Chloroplast</p>
            <h3 className="mt-3 text-xl font-semibold text-white">Energy conversion</h3>
            <p className="mt-3 text-sm leading-6">{step?.description || 'The plant captures light and turns it into chemical energy inside chloroplasts.'}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Oxygen release</p>
            <div className="mt-4 space-y-2">
              {oxygenBubbles.map((bubble) => (
                <motion.div
                  key={bubble.id}
                  className="relative h-5 w-5 rounded-full bg-cyan-300/40"
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: [0, -42, -86], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: bubble.delay, ease: 'easeOut' }}
                />
              ))}
            </div>
            <p className="mt-2 text-sm leading-6">{step?.visualCues?.[0] || 'Oxygen bubbles float away as the plant breathes out clean air.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
