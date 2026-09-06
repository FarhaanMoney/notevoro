import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Icon } from '../lib/icons';
import { useVoro, VoroComposer, VoroThread } from '../components/VoroPanel';
import { useSpace } from './SpaceShell';

const META = { voro: ['sparkles', 'violet', 'Connective intelligence across your Spaces.'], atlas: ['graduation-cap', 'blue', 'Patient tutor. Explains step by step and checks understanding.'], nova: ['microscope', 'teal', 'Rigorous researcher. Evidence, open questions, next steps.'], astra: ['zap', 'pink', 'Action assistant. Turns intent into tasks, events and plans.'], luna: ['moon', 'violet', 'Friendly explainer. Plain language and analogies.'] };

export default function VoroPage({ inSpace }) {
  const sp = useSpace();
  const spaceId = inSpace ? sp?.spaceId : null;
  const [params, setParams] = useSearchParams();
  const agent = params.get('agent') || 'voro';
  const voro = useVoro(spaceId);
  const ent = useApp((s) => s.entitlements);
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/voro/agents').then((r) => r.data) });
  const a = agents.find((x) => x.key === agent) || { name: 'Voro', role: 'Intelligence' };
  const [ic, tone, desc] = META[agent] || META.voro;
  return (
    <div className="flex" style={{ height: 'calc(100vh - var(--header-h))' }} data-testid="voro-page">
      <aside className="w-[260px] shrink-0 border-r border-[var(--nv-border)] p-4 space-y-1 overflow-auto nv-scroll">
        <div className="nv-eyebrow px-2 mb-2">Voro · Agents</div>
        {agents.map((x) => { const [i, t] = META[x.key] || META.voro; return <button key={x.key} onClick={() => setParams({ agent: x.key })} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${agent === x.key ? 'bg-[#eeebfe]' : 'hover:bg-[#f7f6fd]'}`} data-testid={`voro-agent-${x.key}`}><div className={`stat-icon tone-${t}`} style={{ width: 34, height: 34, borderRadius: 999 }}><Icon name={i} size={15} /></div><div><div className="text-[13px] font-bold">{x.name}</div><div className="text-[11px] nv-muted">{x.role}</div></div></button>; })}
        <div className="mt-6 nv-card p-3 text-[11.5px] nv-muted leading-relaxed" data-testid="voro-usage"><div className="font-bold text-[#16141f] mb-1">Usage this month</div>{ent ? <>{ent.usage.ai_requests}/{ent.limits.ai_requests} AI requests<br />{ent.usage.voro_actions}/{ent.limits.voro_actions} Voro actions<br /><span className="nv-faint">Resets monthly · {ent.plan} plan</span></> : '—'}</div>
        <div className="text-[11px] nv-faint px-2 pt-2 leading-relaxed">Voro only sees what you can see: the current Space, your role, and your plan. Consequential actions always ask for confirmation.</div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-8 pt-6 flex items-center gap-4"><div className={`stat-icon tone-${tone}`} style={{ width: 52, height: 52, borderRadius: 999 }}><Icon name={ic} size={22} /></div><div><h1 className="text-[22px] font-extrabold">{a.name}</h1><div className="text-xs nv-muted">{desc} {spaceId ? `· Scoped to ${sp.space.name}` : '· Global Brain scope'}</div></div></div>
        <div className="flex-1 min-h-0 px-8 py-4"><VoroThread voro={voro} className="h-full pr-2" />{!voro.messages.length && !voro.error && <div className="h-full grid place-items-center text-center"><div><div className="text-[15px] font-bold">Ask {a.name} anything{spaceId ? ` about ${sp.space.name}` : ''}.</div><div className="text-xs nv-muted mt-1 max-w-sm">Try: "What should I focus on today?", "Summarize recent notes", or "Create a task to review the roadmap on Friday".</div></div></div>}</div>
        <div className="px-8 pb-6"><VoroComposer onSend={(m) => voro.ask(m, agent)} busy={voro.busy} large placeholder={`Message ${a.name}…`} testId="voro-page-input" /></div>
      </div>
    </div>
  );
}
