'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bolt, CircleDot } from 'lucide-react';

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

export default function StreamingWhiteboard({ visualState, status, error }) {
  const { nodes = [], edges = [], highlights = [], pulses = [], focusTarget, quiz } = visualState || {};

  const focusNode = useMemo(() => nodes.find((node) => node.id === focusTarget), [nodes, focusTarget]);
  const focusStyle = useMemo(() => {
    if (!focusNode) return {};
    return {
      transform: `translate(calc(50vw - ${focusNode.x + focusNode.w / 2}px), calc(50vh - ${focusNode.y + focusNode.h / 2}px)) scale(1.02)`,
      transition: 'transform 0.5s ease',
    };
  }, [focusNode]);

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-[#040714] shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),transparent_30%)]" />
      <div className="absolute left-4 top-4 rounded-3xl bg-black/40 p-3 text-xs text-zinc-200 ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          <span>{status === 'streaming' ? 'Live teaching in progress' : status === 'completed' ? 'Lesson complete' : 'Ready to teach'}</span>
        </div>
      </div>

      <div className="absolute right-4 top-4 rounded-3xl bg-white/5 p-3 text-xs text-zinc-300 ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center gap-2">
          <Bolt className="h-3.5 w-3.5 text-amber-300" />
          <span>{highlights.length ? `Focus: ${highlights[0]}` : 'Awaiting next step'}</span>
        </div>
      </div>

      <div className="relative h-full w-full" style={focusStyle}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 920 560" preserveAspectRatio="xMidYMid slice">
          {edges.map((edge) => {
            const source = nodes.find((node) => node.id === edge.from);
            const target = nodes.find((node) => node.id === edge.to);
            if (!source || !target || !source.visible || !target.visible) return null;
            const x1 = source.x + (source.w || 160) / 2;
            const y1 = source.y + (source.h || 56) / 2;
            const x2 = target.x + (target.w || 160) / 2;
            const y2 = target.y + (target.h || 56) / 2;
            return (
              <motion.path
                key={edge.id || `${edge.from}-${edge.to}`}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: edge.animated ? 0.9 : 0.5, ease: 'easeOut' }}
                strokeDasharray={edge.animated ? '8 8' : '0'}
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const visible = node.visible !== false;
          const isHighlighted = highlights.includes(node.id);
          const isPulsing = pulses.includes(node.id);
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.75 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className={`absolute rounded-3xl border p-4 text-left backdrop-blur ${visible ? 'shadow-[0_18px_60px_rgba(79,70,229,0.21)]' : ''}`}
              style={{
                left: clampValue(node.x, 20, 840),
                top: clampValue(node.y, 20, 500),
                width: node.w || 180,
                minHeight: node.h || 58,
                background: isHighlighted ? 'linear-gradient(135deg,#4338ca,#9333ea)' : 'rgba(11,14,29,0.94)',
                borderColor: isHighlighted ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)',
                boxShadow: isPulsing ? '0 0 0 8px rgba(99,102,241,0.16)' : undefined,
              }}
            >
              <div className="text-sm font-semibold text-white">{node.label}</div>
              {node.metadata?.note ? <div className="mt-2 text-[13px] text-zinc-300">{node.metadata.note}</div> : null}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {quiz?.visible ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 z-20 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-3xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-cyan-300">
              <CircleDot className="h-4 w-4" /> Live quiz checkpoint
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">{quiz.question}</h2>
            <div className="mt-4 grid gap-3">
              {quiz.choices.map((choice, index) => (
                <button key={index} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-cyan-300 hover:bg-cyan-500/10">
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {choice}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <div className="absolute inset-x-0 bottom-0 mx-6 mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100 shadow-lg">
          <strong>Stream issue:</strong> {error}
        </div>
      ) : null}
    </div>
  );
}
