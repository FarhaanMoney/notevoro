'use client';

import React from 'react';
import { motion } from 'framer-motion';

const points = [
  { x: 64, y: 220, label: 'A' },
  { x: 172, y: 160, label: 'B' },
  { x: 280, y: 108, label: 'C' },
  { x: 388, y: 74, label: 'D' },
  { x: 496, y: 46, label: 'E' },
];

export default function GraphAnimator({ lesson, step }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#03081a] px-6 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_28%)] pointer-events-none" />
      <div className="absolute inset-x-6 top-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <div className="text-xs uppercase tracking-[0.32em] text-cyan-300">Graph animation</div>
        <h3 className="mt-2 text-2xl font-semibold text-white">{lesson.title || 'Graph transformation'}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{step?.description || lesson.description || 'A plotted curve builds itself while the AI narrates each transition.'}</p>
      </div>

      <div className="relative mx-auto mt-10 flex h-[340px] w-full max-w-4xl items-center justify-center">
        <svg viewBox="0 0 560 340" className="h-full w-full rounded-[2rem] border border-white/10 bg-[#0b1227]/95 shadow-[0_0_120px_rgba(56,189,248,0.12)]">
          <line x1="40" y1="300" x2="520" y2="300" stroke="rgba(148,163,184,0.25)" strokeWidth="2" />
          <line x1="40" y1="300" x2="40" y2="40" stroke="rgba(148,163,184,0.25)" strokeWidth="2" />
          {points.map((point, index) => {
            const prev = points[index - 1];
            return (
              <g key={point.label}>
                {prev ? (
                  <motion.line
                    x1={prev.x}
                    y1={prev.y}
                    x2={point.x}
                    y2={point.y}
                    stroke="#38bdf8"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 + index * 0.2, ease: 'easeInOut' }}
                  />
                ) : null}
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r="10"
                  fill="#0ea5e9"
                  stroke="#7dd3fc"
                  strokeWidth="3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, ease: 'backOut' }}
                />
                <text x={point.x + 14} y={point.y - 12} fill="#cbd5e1" fontSize="14" fontWeight="600">{point.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
