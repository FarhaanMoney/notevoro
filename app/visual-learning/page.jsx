'use client';

import React from 'react';
import Link from 'next/link';
import LessonCard from '@/components/visual-learning/LessonCard';

const recommended = [
  { id: 'photosynthesis', title: 'Photosynthesis', desc: 'How plants convert light to energy' },
  { id: 'black-holes', title: 'Black Holes', desc: 'Spacetime, gravity wells, and event horizons' },
  { id: 'api-flow', title: 'How APIs Work', desc: 'Request/response, endpoints, and auth' },
];

export default function VisualLearningHome() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Visual Learning</h1>
        <p className="text-zinc-400 mt-2 max-w-2xl">Immersive AI-powered visual lessons: interactive diagrams, animated whiteboards, and progressive tutoring.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg bg-gradient-to-br from-[#071028] to-[#07102a] p-6 shadow-lg border border-white/6">
          <h2 className="text-xl font-semibold mb-3">AI Whiteboard</h2>
          <p className="text-zinc-400 mb-4">Ask the AI to teach any concept visually and get an interactive lesson you can play, explore, and save.</p>
          <div className="flex gap-3">
            <Link href="/visual-learning/whiteboard">
              <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow">Open Whiteboard</a>
            </Link>
            <Link href="/visual-explanation/demo">
              <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white">Try Demo</a>
            </Link>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg p-4 bg-[#071024] border border-white/6">
            <h3 className="font-semibold">Continue Learning</h3>
            <p className="text-sm text-zinc-400">Pick up where you left off or review saved lessons.</p>
            <div className="mt-3 grid gap-2">
              <LessonCard title="Photosynthesis (Chapter 1)" meta="3 steps · 8 min" />
              <LessonCard title="Intro to APIs" meta="5 steps · 12 min" />
            </div>
          </div>

          <div className="rounded-lg p-4 bg-[#071024] border border-white/6">
            <h3 className="font-semibold">Recommended Topics</h3>
            <div className="mt-3 grid gap-2">
              {recommended.map(r => <LessonCard key={r.id} title={r.title} desc={r.desc} />)}
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Recent Visual Lessons</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <LessonCard title="Black Holes: Visualized" desc="Spacetime explained" />
          <LessonCard title="Cell Structure" desc="Organelles and their roles" />
          <LessonCard title="Sorting Algorithms" desc="Step-by-step execution" />
        </div>
      </section>
    </div>
  );
}
