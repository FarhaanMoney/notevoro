'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Node({ node, onDrag, isHighlighted, onClick }) {
  const style = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: node.w || 160,
    height: node.h || 48,
    borderRadius: 8,
    background: isHighlighted ? 'linear-gradient(90deg,#6ee7b7,#60a5fa)' : '#0f172a',
    color: 'white',
    padding: 10,
    boxShadow: isHighlighted ? '0 8px 20px rgba(96,165,250,0.18)' : '0 6px 12px rgba(2,6,23,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    userSelect: 'none'
  };

  function handlePointerDown(e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = node.x;
    const origY = node.y;

    function move(ev) {
      onDrag(node.id, origX + (ev.clientX - startX), origY + (ev.clientY - startY));
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <motion.div style={style} onPointerDown={handlePointerDown} onClick={() => onClick(node)} whileTap={{ scale: 0.98 }}>
      {node.label}
    </motion.div>
  );
}

function Edge({ from, to, animated, width, height }) {
  // simple straight line between centers
  const x1 = from.x + (from.w || 160) / 2;
  const y1 = from.y + (from.h || 48) / 2;
  const x2 = to.x + (to.w || 160) / 2;
  const y2 = to.y + (to.h || 48) / 2;

  const path = `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <motion.path d={path} stroke="#60a5fa" strokeWidth={3} fill="none" strokeDasharray={animated ? '8 6' : '0'} animate={animated ? { strokeDashoffset: [0, -14] } : undefined} transition={{ duration: 1.2, repeat: Infinity }} />
    </svg>
  );
}

export default function VisualCanvas({ visual }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState(visual?.nodes || []);
  const [edges, setEdges] = useState(visual?.edges || []);
  const [stepIndex, setStepIndex] = useState(0);
  const [size, setSize] = useState({ width: 800, height: 540 });

  useEffect(() => {
    setNodes(visual?.nodes || []);
    setEdges(visual?.edges || []);
    setStepIndex(0);
  }, [visual]);

  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSize({ width: Math.max(300, Math.floor(r.width)), height: Math.max(240, Math.floor(r.height)) });
    }
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { window.removeEventListener('resize', measure); if (ro && ro.disconnect) ro.disconnect(); };
  }, []);

  function handleDrag(id, x, y) {
    setNodes(n => n.map(nd => nd.id === id ? { ...nd, x, y } : nd));
  }

  function handleNodeClick(node) {
    // simple toggle: show alert with metadata
    if (node.metadata && node.metadata.note) alert(node.metadata.note);
  }

  const step = visual?.steps?.[stepIndex];
  const highlighted = new Set(step?.highlightNodes || []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 540, overflow: 'hidden', background: 'linear-gradient(180deg,#020617,#071033)', borderRadius: 12 }}>
      {/* Edges rendered first */}
      {edges.map(e => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        return <Edge key={e.id} from={from} to={to} animated={e.animated} width={size.width} height={size.height} />;
      })}

      {/* Nodes */}
      {nodes.map(n => (
        <Node key={n.id} node={n} onDrag={handleDrag} isHighlighted={highlighted.has(n.id)} onClick={handleNodeClick} />
      ))}

      {/* Controls */}
      <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => setStepIndex(i => Math.max(0, i - 1))} style={{ padding: '8px 10px' }}>Prev</button>
        <button onClick={() => setStepIndex(i => Math.min((visual?.steps?.length || 1) - 1, i + 1))} style={{ padding: '8px 10px' }}>Next</button>
      </div>
    </div>
  );
}
