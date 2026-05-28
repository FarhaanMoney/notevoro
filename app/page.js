import Link from 'next/link';
import { Sparkles, BookOpen, ClipboardList, Trophy } from 'lucide-react';

const worldCards = [
  {
    title: 'Visual Learning',
    description: 'Step into the cinematic classroom for interactive concepts and spatial diagrams.',
    href: '/visual-learning',
    icon: Sparkles,
  },
  {
    title: 'Flashcard Lab',
    description: 'Build review decks, swipe with momentum, and strengthen recall.',
    href: '/flashcards',
    icon: BookOpen,
  },
  {
    title: 'AI Notes',
    description: 'Capture smart summaries, connect knowledge, and keep study notes alive.',
    href: '/ai-notes',
    icon: ClipboardList,
  },
  {
    title: 'Mock Test Center',
    description: 'Practice with exam-grade tests, analytics, and AI review.',
    href: '/mock-test',
    icon: Trophy,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/90 p-8 shadow-2xl shadow-black/20 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.14),transparent_28%)] before:opacity-70">
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Home world</p>
            <h1 className="text-5xl font-semibold text-white sm:text-6xl">Welcome to Notevoro V3.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">A futuristic AI learning OS with immersive worlds, smooth flow, and visible study momentum.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/visual-learning" className="rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110">Launch Visual World</Link>
              <Link href="/ai-notes" className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10">Open AI Notes</Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#09131f]/90 p-6 shadow-inner shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Daily learning pulse</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl bg-[#0b1424] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Progress</p>
                <p className="mt-3 text-3xl font-semibold text-white">54% complete</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-cyan-300 to-purple-500" />
                </div>
              </div>
              <div className="rounded-3xl bg-[#0b1424] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">AI Energy</p>
                <p className="mt-3 text-3xl font-semibold text-white">18 / 20</p>
              </div>
              <div className="rounded-3xl bg-[#0b1424] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Streak</p>
                <p className="mt-3 text-3xl font-semibold text-white">7 days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          { title: 'Immersive learning', description: 'A calm world structure with strong direction and no dead ends.' },
          { title: 'Fast navigation', description: 'Visible tools, clear labels, and a persistent path through every workspace.' },
          { title: 'AI intelligence', description: 'Smart recommendations, study prompts, and adaptive next steps.' },
        ].map((item) => (
          <div key={item.title} className="rounded-[2rem] border border-white/10 bg-[#09131f]/90 p-6 shadow-lg shadow-black/20">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">{item.title}</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-slate-400">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {worldCards.map((world) => (
          <Link key={world.title} href={world.href} className="group rounded-[2rem] border border-white/10 bg-[#08131f]/90 p-6 shadow-lg shadow-black/20 transition hover:border-cyan-400/30 hover:bg-white/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-cyan-300 transition group-hover:bg-cyan-500/10">
              <world.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{world.title}</h3>
            <p className="mt-3 text-slate-400">{world.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
