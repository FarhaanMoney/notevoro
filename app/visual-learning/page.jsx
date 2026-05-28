'use client';

import Link from 'next/link';
import { Sparkles, BookOpen, ClipboardList, ArrowRight } from 'lucide-react';

const visualFeatures = [
  { title: 'Scene-based lessons', description: 'Structured visual worlds with steps, nodes, and key story beats.' },
  { title: 'Dynamic canvas', description: 'Zoomable, interactive concept maps that feel alive.' },
  { title: 'Narration flow', description: 'AI-guided explanations that move with the visuals.' },
];

const sampleLessons = [
  { title: 'Black Holes', description: 'Gravity wells, event horizons, and spacetime arcs.' },
  { title: 'Photosynthesis', description: 'Light capture, energy flow, and cellular structure.' },
  { title: 'APIs in motion', description: 'Request, response, endpoints, and authorization.' },
];

export default function VisualLearningHome() {
  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-white/10 bg-[#0f172a]/90 p-8 shadow-2xl shadow-black/20">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Visual learning world</p>
            <h1 className="text-5xl font-semibold text-white">Enter the interactive study studio.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">Generate cinematic visual lessons with live scene building, linked concepts, and a rich animation-first learning experience.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/visual-learning/whiteboard" className="rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-black">Open Whiteboard</Link>
              <Link href="/" className="inline-flex items-center rounded-2xl border border-white/10 px-6 py-3 text-sm text-white transition hover:bg-white/10">Back Home</Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#09131f]/90 p-6 shadow-inner shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Classroom essentials</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl bg-[#0b1424] p-5">
                <p className="text-sm text-slate-400">Roadmap</p>
                <p className="mt-2 text-xl font-semibold text-white">Step-by-step visual journey</p>
              </div>
              <div className="rounded-3xl bg-[#0b1424] p-5">
                <p className="text-sm text-slate-400">Canvas</p>
                <p className="mt-2 text-xl font-semibold text-white">Zoom, drag, and explore ideas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {visualFeatures.map((feature) => (
          <div key={feature.title} className="rounded-[2rem] border border-white/10 bg-[#08131f]/90 p-6 shadow-lg shadow-black/20">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">{feature.title}</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">{feature.title}</h2>
            <p className="mt-3 text-slate-400">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#09131f]/90 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Lesson samples</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Choose a visual study path</h2>
          </div>
          <Link href="/visual-learning/whiteboard" className="rounded-2xl bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Generate lesson</Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {sampleLessons.map((lesson) => (
            <div key={lesson.title} className="rounded-3xl border border-white/10 bg-[#0b1424] p-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">{lesson.title}</h3>
              <p className="mt-2 text-slate-400">{lesson.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
                <ArrowRight className="h-4 w-4" />
                Start lesson
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
