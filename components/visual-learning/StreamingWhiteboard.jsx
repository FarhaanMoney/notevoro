'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bolt, CircleDot, Eye, Star } from 'lucide-react';

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

function renderObject(obj, highlights, pulses, onHover, onLeave, onClick) {
  if (!obj.visible) return null;
  const isHighlighted = highlights.includes(obj.id);
  const isPulsing = pulses.includes(obj.id);
  const baseStyle = {
    position: 'absolute',
    left: obj.x || 0,
    top: obj.y || 0,
    width: obj.w || 160,
    minHeight: obj.h || 56,
    transform: obj.transform || 'none',
    zIndex: obj.zIndex || 10,
  };
  const glow = obj.style?.glow ? '0 0 30px rgba(56,189,248,0.24)' : 'none';
  const background = obj.style?.gradient
    ? `linear-gradient(135deg, ${obj.style.gradient[0]} 0%, ${obj.style.gradient[1]} 100%)`
    : obj.color || 'rgba(15,23,42,0.96)';
  const common = {
    ...baseStyle,
    borderRadius: obj.shape === 'circle' ? '999px' : '24px',
    background: obj.shape === 'circle' ? background : background,
    border: isHighlighted ? '1px solid rgba(56,189,248,0.55)' : '1px solid rgba(255,255,255,0.08)',
    boxShadow: isHighlighted || isPulsing ? `0 0 0 12px rgba(56,189,248,0.08), ${glow}` : glow,
    color: '#fff',
    cursor: obj.metadata ? 'pointer' : 'default',
    overflow: 'hidden',
  };

  const content = (
    <div className="flex h-full flex-col justify-between p-4 text-white">
      <div className="text-sm font-semibold">{obj.label}</div>
      {obj.metadata?.note ? <div className="mt-2 text-[11px] leading-5 text-slate-200/80">{obj.metadata.note}</div> : null}
    </div>
  );

  if (obj.type === 'shape' && obj.shape === 'circle') {
    return (
      <motion.div
        key={obj.id}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute overflow-hidden"
        style={{ ...common, borderRadius: '50%' }}
        onMouseEnter={() => onHover(obj)}
        onMouseLeave={onLeave}
        onClick={() => onClick(obj)}
      >
        <div className="relative h-full w-full">
          <div className="absolute inset-0 blur-2xl" style={{ background }} />
          <div className="relative z-10 flex h-full flex-col justify-center items-center px-4 text-center">
            <span className="text-sm font-semibold">{obj.label}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (obj.type === 'banner') {
    return (
      <motion.div
        key={obj.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'anticipate' }}
        className="absolute rounded-[2rem] border border-white/10 backdrop-blur"
        style={common}
        onMouseEnter={() => onHover(obj)}
        onMouseLeave={onLeave}
        onClick={() => onClick(obj)}
      >
        <div className="flex h-full flex-col justify-center px-5 py-4">
          <div className="text-lg font-semibold text-white tracking-wide">{obj.label}</div>
          {obj.metadata?.note ? <div className="mt-2 text-sm text-slate-200/80">{obj.metadata.note}</div> : null}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={obj.id}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="absolute rounded-3xl border border-white/10 backdrop-blur"
      style={common}
      onMouseEnter={() => onHover(obj)}
      onMouseLeave={onLeave}
      onClick={() => onClick(obj)}
    >
      {content}
    </motion.div>
  );
}

function renderPath(effect, objects) {
  const from = objects.find((item) => item.id === effect.from);
  const to = objects.find((item) => item.id === effect.to);
  if (!from || !to) return null;

  const x1 = (from.x || 0) + (from.w || 160) / 2;
  const y1 = (from.y || 0) + (from.h || 56) / 2;
  const x2 = (to.x || 0) + (to.w || 160) / 2;
  const y2 = (to.y || 0) + (to.h || 56) / 2;
  const controlX = (x1 + x2) / 2;
  const dy = Math.abs(y2 - y1) * 0.35;
  const path = effect.shape === 'curve'
    ? `M ${x1} ${y1} C ${controlX} ${y1 - dy} ${controlX} ${y2 + dy} ${x2} ${y2}`
    : `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <motion.path
      key={effect.id}
      d={path}
      fill="none"
      stroke="#38bdf8"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: effect.animated ? 1.1 : 0.6, ease: 'easeOut' }}
      strokeDasharray={effect.animated ? '8 10' : '0'}
    />
  );
}

function renderEffect(effect) {
  if (effect.type === 'rays') {
    const rays = Array.from({ length: effect.count || 10 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / (effect.count || 10);
      return (
        <motion.div
          key={`${effect.id}-ray-${index}`}
          className="absolute bg-cyan-300/30"
          style={{
            left: effect.x || 0,
            top: effect.y || 0,
            width: 2,
            height: 80,
            transform: `rotate(${angle}rad) translateY(-40px)`,
            borderRadius: 999,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.06 }}
        />
      );
    });
    return <>{rays}</>;
  }

  if (effect.type === 'particles') {
    const particles = Array.from({ length: effect.count || 18 }, (_, index) => {
      const radius = 220 + ((index % 6) * 8);
      const angle = (Math.PI * 2 * index) / (effect.count || 18);
      const x = (effect.x || 0) + Math.cos(angle) * radius;
      const y = (effect.y || 0) + Math.sin(angle) * radius;
      return (
        <motion.div
          key={`${effect.id}-particle-${index}`}
          className="absolute rounded-full bg-cyan-300/40"
          style={{ width: 8, height: 8, left: x, top: y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.05 }}
        />
      );
    });
    return <>{particles}</>;
  }

  return null;
}

export default function StreamingWhiteboard({ visualState, status, error }) {
  const [hovered, setHovered] = useState(null);
  const { scene = {}, objects = [], effects = [], highlights = [], pulses = [], focusTarget, quiz } = visualState || {};

  const focusObject = useMemo(() => objects.find((o) => o.id === focusTarget), [objects, focusTarget]);
  const focusStyle = useMemo(() => {
    if (!focusObject) return {};
    return {
      transform: `translate(calc(50vw - ${focusObject.x + (focusObject.w || 160) / 2}px), calc(50vh - ${focusObject.y + (focusObject.h || 56) / 2}px)) scale(1.02)`,
      transition: 'transform 0.65s ease',
    };
  }, [focusObject]);

  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#040614] shadow-2xl shadow-black/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),transparent_32%)]" />
      <div className="absolute inset-0 opacity-80" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(7,10,28,0.95) 45%, rgba(7,10,28,0.92))' }} />

      <div className="absolute left-6 top-6 rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-xl shadow-black/30 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-300">
          <Sparkles className="h-4 w-4" />
          <span>{status === 'streaming' ? 'AI tutor live' : status === 'completed' ? 'Lesson finished' : 'Ready to teach'}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold text-white leading-snug">{scene.title || 'Visual teaching stage'}</h2>
        <p className="mt-1 max-w-md text-sm text-slate-300">{scene.subtitle || scene.description || 'The AI is preparing the next teaching phase.'}</p>
      </div>

      <div className="absolute right-6 top-6 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20 backdrop-blur-md text-right text-sm text-slate-300">
        <div className="mb-1 flex items-center justify-end gap-2 text-xs uppercase tracking-[0.28em] text-violet-300">
          <Bolt className="h-3.5 w-3.5" /> Live cues
        </div>
        <div>{highlights.length ? `Focus: ${highlights[0]}` : 'Awaiting next cue'}</div>
      </div>

      <div className="relative h-full w-full" style={focusStyle}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 920 560" preserveAspectRatio="xMidYMid slice">
          {effects.filter((e) => e.type === 'path').map((effect) => renderPath(effect, objects))}
        </svg>

        {effects.filter((e) => e.type !== 'path').map((effect) => renderEffect(effect))}

        {objects.map((obj) => renderObject(obj, highlights, pulses, setHovered, () => setHovered(null), () => setHovered(obj)))}
      </div>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute left-6 bottom-6 z-20 w-[min(380px,calc(100%-3rem))] rounded-[2rem] border border-white/10 bg-[#020617]/95 p-4 text-sm text-slate-100 backdrop-blur-md shadow-2xl shadow-black/40"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Eye className="h-4 w-4 text-cyan-300" />
              {hovered.label}
            </div>
            {hovered.metadata?.note ? <p className="mt-2 text-slate-300">{hovered.metadata.note}</p> : <p className="mt-2 text-slate-400">Tap or hover objects to inspect them during the lesson.</p>}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {quiz?.visible ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="absolute inset-x-0 bottom-8 mx-auto w-[min(500px,calc(100%-2rem))] rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-300">
              <CircleDot className="h-4 w-4" /> Live quiz checkpoint
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{quiz.question}</h3>
            <div className="mt-4 grid gap-3">
              {quiz.choices.map((choice, index) => (
                <button key={index} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300 hover:bg-cyan-500/10">
                  <span className="mr-2 inline-block w-5 text-sm font-semibold text-cyan-300">{String.fromCharCode(65 + index)}.</span>
                  {choice}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <div className="absolute inset-x-6 bottom-6 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100 shadow-xl shadow-red-500/10">
          <strong>Stream issue:</strong> {error}
        </div>
      ) : null}
    </div>
  );
}
