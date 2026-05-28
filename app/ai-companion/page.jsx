'use client';

import Link from 'next/link';

export default function AICompanionPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-white/10 bg-[#0f172a]/90 p-8 shadow-2xl shadow-black/20">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">AI Companion</p>
            <h1 className="text-4xl font-semibold text-white">A supportive study partner for your next session.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">Get contextual guidance, motivation nudges, and intelligent reminders, all in a calm and friendly workspace.</p>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-black">Ask anything</button>
              <Link href="/" className="inline-flex items-center rounded-2xl border border-white/10 px-6 py-3 text-sm text-white transition hover:bg-white/10">Home world</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#09131f]/90 p-6 shadow-inner shadow-black/30">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Personalized flow</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Motivation</p>
                <p className="mt-2 text-lg font-semibold text-white">Send study boosts and checkpoint goals.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Context cues</p>
                <p className="mt-2 text-lg font-semibold text-white">Keep every lesson connected and active.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { title: 'Guided focus', desc: 'Stay on track with gentle nudges and study timers.' },
          { title: 'Progress commentary', desc: 'Receive feedback and next step suggestions.' },
          { title: 'Context-aware help', desc: 'Ask a question about any lesson instantly.' },
        ].map((item) => (
          <div key={item.title} className="rounded-[2rem] border border-white/10 bg-[#09131f]/90 p-6 shadow-lg shadow-black/20">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Companion</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
