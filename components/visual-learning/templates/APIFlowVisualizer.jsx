'use client';

import React from 'react';
import { motion } from 'framer-motion';

const nodes = [
  { id: 'client', label: 'Client', x: 24, y: 24, color: '#0ea5e9' },
  { id: 'api', label: 'API Gateway', x: 260, y: 24, color: '#8b5cf6' },
  { id: 'server', label: 'Server', x: 24, y: 180, color: '#22c55e' },
  { id: 'db', label: 'Database', x: 260, y: 180, color: '#f97316' },
];

export default function APIFlowVisualizer({ lesson, step }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#020a1f] px-6 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),transparent_28%)]" />
      <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-10">
        <div className="relative h-[330px] w-full max-w-2xl rounded-[3rem] border border-white/10 bg-[#0f172a]/80 p-6 shadow-[0_0_120px_rgba(59,130,246,0.12)]">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              className="absolute flex h-20 w-36 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/5 text-center text-sm font-semibold text-white"
              style={{ left: node.x, top: node.y, background: node.color ? `${node.color}20` : undefined }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {node.label}
            </motion.div>
          ))}

          <motion.div
            className="absolute left-[132px] top-[46px] h-2 w-72 rounded-full bg-cyan-300/20"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute left-[132px] top-[196px] h-2 w-72 rounded-full bg-emerald-300/20"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute left-[290px] top-[95px] h-2 w-16 rounded-full bg-violet-300/20"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
          />

          <motion.div
            className="absolute left-[148px] top-[28px] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(56,189,248,0.45)]"
            animate={{ x: [0, 10, 0], y: [0, 2, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute left-[148px] top-[176px] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(34,197,94,0.45)]"
            animate={{ x: [0, -10, 0], y: [0, -2, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Request flow</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{step?.title || 'API conversation'}</h3>
            <p className="mt-3 text-sm leading-6">{step?.description || 'A request leaves the client, passes through the API gateway, and reaches the server for processing.'}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Server answer</p>
            <p className="mt-3 text-sm leading-6">{step?.visualCues?.[0] || 'Responses travel back along the same channel while the system stays connected in real time.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
