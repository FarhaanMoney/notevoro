'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';

export default function LeftPanel({ topic, setTopic, onGenerate, loading, steps = [], narration, isStreaming, status, progress, onCancel }) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 rounded-3xl border border-white/10 bg-[#04051a]/80 p-4 shadow-lg shadow-black/20">
        <label className="text-sm text-zinc-300">Live lesson prompt</label>
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full mt-2 p-3 rounded-2xl border border-white/10 bg-[#020417] text-white focus:border-sky-500 outline-none" rows={4} />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={onGenerate} disabled={loading} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60">
            {loading ? 'Teaching…' : 'Start Live Lesson'}
          </button>
          {isStreaming ? (
            <button onClick={onCancel} className="px-4 py-2 rounded-2xl bg-red-500/15 text-sm font-semibold text-red-200 hover:bg-red-500/20">
              Stop lesson
            </button>
          ) : (
            <button className="px-4 py-2 rounded-2xl bg-white/5 text-sm text-white">Save Lesson</button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-white/10 bg-[#04051a]/80 p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Live narration</h4>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.24em]">{status === 'streaming' ? 'AI tutor active' : status === 'completed' ? 'Lesson complete' : status === 'idle' ? 'Ready' : status}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] ${isStreaming ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-300'}`}>
            {isStreaming ? 'Live' : 'Idle'}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-300 min-h-[96px]">{narration || 'The AI will describe the lesson step-by-step here as it draws the board.'}</p>
      </div>

      <div className="mb-4 rounded-3xl border border-white/10 bg-[#04051a]/80 p-4 shadow-lg shadow-black/20">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Lesson progress</h4>
          <span className="text-xs text-zinc-400">{steps.length} steps</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {steps.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#020417] p-4 text-sm text-zinc-500">Actions will appear here as the lesson unfolds.</div>
        ) : (
          steps.map((step, index) => (
            <div key={`${step.stepId}-${index}`} className="rounded-3xl border border-white/10 bg-[#020417]/90 p-4 shadow-sm shadow-black/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">Step {step.stepId}</span>
                <span className="text-xs text-zinc-400">Action packet</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{step.narration || 'No narration available.'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
