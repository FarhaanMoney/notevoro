'use client';

import { motion } from 'framer-motion';
import MermaidDiagram from '../MermaidDiagram';

export default function DiagramBlock({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{block.title}</h3>
        <span className="text-[10px] uppercase tracking-widest text-cyan-300/80">{block.diagramKind}</span>
      </div>
      <MermaidDiagram chart={block.mermaid} caption={block.caption} />
    </motion.div>
  );
}
