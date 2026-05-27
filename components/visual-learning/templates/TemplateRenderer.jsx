'use client';

import React from 'react';
import BlackHoleSimulation from './BlackHoleSimulation';
import PhotosynthesisSimulation from './PhotosynthesisSimulation';
import GravityVisualizer from './GravityVisualizer';
import APIFlowVisualizer from './APIFlowVisualizer';
import GraphAnimator from './GraphAnimator';

const TEMPLATE_MAP = {
  'astronomy.black_hole': BlackHoleSimulation,
  'astronomy.solar_system': BlackHoleSimulation,
  'biology.photosynthesis': PhotosynthesisSimulation,
  'physics.gravity': GravityVisualizer,
  'programming.api_flow': APIFlowVisualizer,
  'math.graphs': GraphAnimator,
  'math.geometry': GraphAnimator,
  'black_hole': BlackHoleSimulation,
  'solar_system': BlackHoleSimulation,
  'photosynthesis': PhotosynthesisSimulation,
  'gravity': GravityVisualizer,
  'api_flow': APIFlowVisualizer,
  'graphs': GraphAnimator,
  'geometry': GraphAnimator,
};

function DefaultLessonShell({ lessonState }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="mb-4 inline-flex rounded-full bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Interactive lesson</div>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">{lessonState.title || 'Cinematic visual lesson'}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{lessonState.description || 'A dedicated visual module will render the concept in motion and animation.'}</p>
      <div className="mt-8 grid w-full max-w-xl gap-3 text-left text-sm text-slate-400 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Lesson type: <span className="font-semibold text-white">{lessonState.lessonType || 'general'}</span></div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Template: <span className="font-semibold text-white">{lessonState.template || 'default'}</span></div>
      </div>
    </div>
  );
}

export default function TemplateRenderer({ lessonState, status }) {
  const templateKey = (lessonState.template || 'default').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const typeKey = (lessonState.lessonType || 'general').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const key = `${typeKey}.${templateKey}`;
  const TemplateComponent = TEMPLATE_MAP[key] || TEMPLATE_MAP[templateKey] || DefaultLessonShell;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#030519] text-white shadow-2xl shadow-black/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),transparent_28%)] pointer-events-none" />
      <div className="absolute left-6 top-6 z-10 rounded-[2rem] border border-white/10 bg-black/40 p-4 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="space-y-2 text-left text-sm text-slate-300">
          <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">{status === 'streaming' ? 'Live visual module' : status === 'completed' ? 'Lesson complete' : 'Waiting for AI'}</div>
          <div className="text-lg font-semibold text-white">{lessonState.title || 'Visual learning module'}</div>
          <p className="max-w-md text-sm leading-6 text-slate-300">{lessonState.subtitle || lessonState.description || 'The AI selects an immersive visual package for this topic.'}</p>
        </div>
      </div>

      <TemplateComponent lesson={lessonState} step={lessonState.steps?.[lessonState.currentStepIndex]} currentStepIndex={lessonState.currentStepIndex} />
    </div>
  );
}
