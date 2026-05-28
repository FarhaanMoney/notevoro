'use client';

import Link from 'next/link';

export default function MockTestPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-white/10 bg-[#0f172a]/90 p-8 shadow-2xl shadow-black/20">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Mock Test Center</p>
            <h1 className="text-4xl font-semibold text-white">Prepare with exam-grade precision.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">Launch timed drills, analyze your performance, and build confidence with AI review designed for serious learners.</p>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-black">Launch exam</button>
              <Link href="/" className="inline-flex items-center rounded-2xl border border-white/10 px-6 py-3 text-sm text-white transition hover:bg-white/10">Home world</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#09131f]/90 p-6 shadow-inner shadow-black/30">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Performance focus</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Time mode</p>
                <p className="mt-2 text-lg font-semibold text-white">Simulate real exam pressure.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Insight cards</p>
                <p className="mt-2 text-lg font-semibold text-white">See weak topics and mastery signals.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { title: 'Timed exams', desc: 'Full-screen mock sections with countdown focus.' },
          { title: 'Score analysis', desc: 'Instant review on strengths and gaps.' },
          { title: 'AI feedback', desc: 'Actionable suggestions for faster improvement.' },
        ].map((item) => (
          <div key={item.title} className="rounded-[2rem] border border-white/10 bg-[#09131f]/90 p-6 shadow-lg shadow-black/20">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Mock Test</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
