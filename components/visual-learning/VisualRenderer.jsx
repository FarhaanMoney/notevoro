'use client';

import React, { Suspense } from 'react';
import TemplateRenderer from '@/components/visual-learning/templates/TemplateRenderer';
import VisualLearningErrorBoundary from './VisualLearningErrorBoundary';

function FallbackCard({ message }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-white/10 bg-[#020417]/90 p-8 text-center shadow-2xl shadow-black/40">
      <div className="max-w-xl space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-300/15 text-cyan-200">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-semibold text-white">Visual explanation could not be generated</h2>
        <p className="text-sm leading-6 text-slate-400">{message || 'The AI response was incomplete or malformed. A safe fallback lesson is shown instead.'}</p>
      </div>
    </div>
  );
}

export default function VisualRenderer({ lessonState, status, error, onRetry, topic }) {
  try { console.debug('[visual] VisualRenderer - lessonState', lessonState, 'status', status, 'error', error); } catch(e){}
  const hasValidLessons = lessonState && typeof lessonState.title === 'string';

  // Loading / streaming state
  if (status === 'connecting' || status === 'streaming') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent border-cyan-400" />
          <div className="text-white font-semibold">Generating visual lesson…</div>
          <div className="text-sm text-slate-400">This may take a few moments — the AI is composing cinematic scenes.</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {onRetry && (
              <button className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/90" onClick={() => onRetry(topic)}>Retry</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!lessonState || !hasValidLessons) {
    return (
      <div className="h-full w-full">
        <FallbackCard message={error || 'No lesson content available yet. Please try a different topic.'} />
        <div className="absolute left-6 bottom-6">
          {onRetry && (
            <button className="rounded-full bg-cyan-500 px-4 py-2 text-sm text-black" onClick={() => onRetry(topic)}>Retry</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-slate-400">Loading visual experience…</div>}>
      <VisualLearningErrorBoundary onReset={() => onRetry && onRetry(topic)}>
        <TemplateRenderer lessonState={lessonState} status={status} />
      </VisualLearningErrorBoundary>
    </Suspense>
  );
}
