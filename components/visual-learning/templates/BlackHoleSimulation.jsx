'use client';

import React from 'react';
import { motion } from 'framer-motion';

const orbiters = [
  { radius: 110, size: 12, delay: 0 },
  { radius: 148, size: 8, delay: 0.35 },
  { radius: 186, size: 10, delay: 0.7 },
];

export default function BlackHoleSimulation({ lesson, step, currentStepIndex }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(15,23,42,0.92),rgba(7,10,28,0.98)_45%)]" />
      <div className="absolute inset-x-0 top-12 mx-auto h-28 w-[88%] max-w-4xl rounded-[2rem] bg-white/5 blur-2xl" />
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.2),transparent_70%)] blur-3xl" />
          <motion.div
            className="relative flex h-[240px] w-[240px] items-center justify-center rounded-full bg-[#0f172a]/80 shadow-[0_0_120px_rgba(79,70,229,0.25)]"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/40 via-sky-400/20 to-slate-950/0 blur-2xl" />
            <div className="absolute inset-0 rounded-full bg-black/80 border border-white/10" />
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-slate-900 to-black shadow-[0_0_80px_rgba(79,70,229,0.28)]" />
            <div className="absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm" />
          </motion.div>

          {orbiters.map((orb, index) => (
            <motion.div
              key={index}
              className="absolute rounded-full bg-gradient-to-br from-cyan-300 to-violet-500 shadow-[0_0_24px_rgba(99,102,241,0.35)]"
              style={{ width: orb.size, height: orb.size, top: `calc(50% - ${orb.radius}px)`, left: '50%' }}
              initial={{ rotate: 0, x: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 12 + index * 2, repeat: Infinity, ease: 'linear', delay: orb.delay }}
            />
          ))}

          <motion.div
            className="absolute h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.08),transparent_60%)]"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="mt-10 max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Black hole lesson</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">{lesson.title || 'Black Hole Simulation'}</h2>
          <p className="mt-3 text-base leading-7 text-slate-300">{step?.description || lesson.description || 'Experience gravity, accretion, and particle flow in a cinematic night-sky simulation.'}</p>
          {step?.visualCues ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {step.visualCues.slice(0, 2).map((cue, index) => (
                <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-300">
                  <div className="text-xs uppercase tracking-[0.32em] text-sky-300">Cue {index + 1}</div>
                  <p className="mt-2">{cue}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
