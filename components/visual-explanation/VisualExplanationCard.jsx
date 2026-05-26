'use client';

export default function VisualExplanationCard({ title, subtitle, children, badge, accent }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#09090d] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
        {badge ? <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${accent || 'bg-violet-500/15 text-violet-300'}`}>{badge}</span> : null}
      </div>
      <div className="space-y-4 text-zinc-300 text-sm">{children}</div>
    </div>
  );
}
