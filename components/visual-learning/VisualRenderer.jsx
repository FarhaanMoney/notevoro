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

export default function VisualRenderer({ lessonState, status, error }) {
  const hasValidLessons = lessonState && typeof lessonState.title === 'string';

  if (!lessonState || !hasValidLessons) {
    return <FallbackCard message={error || 'No lesson content available yet. Please try a different topic.'} />;
  }

  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-slate-400">Loading visual experience…</div>}>
      <VisualLearningErrorBoundary>
        <TemplateRenderer lessonState={lessonState} status={status} />
      </VisualLearningErrorBoundary>
    </Suspense>
  );
}
