'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function GravityVisualizer({ lesson, step }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#020615] px-6 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.12),transparent_32%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.14),transparent_24%)] pointer-events-none" />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-8">
        <div className="relative h-[300px] w-[280px] rounded-[3rem] border border-white/10 bg-[#0f172a]/80 shadow-[0_0_120px_rgba(236,72,153,0.14)]">
          <div className="absolute inset-x-10 top-10 h-12 rounded-full bg-gradient-to-r from-slate-500/30 via-slate-700/20 to-slate-500/30" />
          <motion.div
            className="absolute left-1/2 h-14 w-14 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_30px_rgba(124,58,237,0.35)]"
            animate={{ y: [0, 120, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute left-1/2 top-[78%] h-24 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.18),transparent)]"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Gravity force</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{step?.title || 'Falling body'}</h3>
            <p className="mt-3 text-sm leading-6">{step?.description || 'Watch the object accelerate under gravity as the simulation animates velocity and pull.'}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Vector view</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 text-center leading-12 text-cyan-200">g</div>
              <div>
                <p className="text-sm text-slate-300">Gravity pulls every object toward the ground.</p>
                <p className="mt-2 text-3xl font-semibold text-white">9.8 m/s²</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
