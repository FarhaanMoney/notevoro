'use client';

import { LEARNING_MODES, ENERGY_COST_BY_MODE } from '@/lib/visualExplanation/constants';

export default function ModeSelector({ mode, onChange, disabled }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {LEARNING_MODES.map((m) => {
        const active = mode === m.id;
        const cost = ENERGY_COST_BY_MODE[m.id];
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              active
                ? 'border-violet-400/50 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.15)]'
                : 'border-white/10 bg-zinc-950/50 hover:border-white/20'
            }`}
          >
            <p className="text-sm font-medium text-white">{m.label}</p>
            <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{m.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-violet-300/80">{cost} energy</p>
          </button>
        );
      })}
    </div>
  );
}
