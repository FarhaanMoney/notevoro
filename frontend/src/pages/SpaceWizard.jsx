import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, uid } from '../lib/api';
import { useApp } from '../lib/store';
import { ACCENTS, Icon, SPACE_ICONS, SpaceIcon } from '../lib/icons';
import { Logo } from './BrainLayout';

const ACCENT_HEX = { violet: '#6e56f5', pink: '#ee4fa3', blue: '#4f7cf7', green: '#22b573', amber: '#f2a531', red: '#ee5a5a', teal: '#12b0a0', slate: '#6b6a80' };

function Chamber({ step, nodes, accent, members }) {
  const color = ACCENT_HEX[accent] || ACCENT_HEX.violet;
  const pts = useMemo(() => nodes.map((_, i) => { const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2; const r = 95 + (i % 3) * 14; return [200 + Math.cos(a) * r, 200 + Math.sin(a) * r]; }), [nodes]);
  const mem = useMemo(() => members.map((_, i) => { const a = (i / Math.max(members.length, 1)) * Math.PI * 2 + 0.6; return [200 + Math.cos(a) * 155, 200 + Math.sin(a) * 155]; }), [members]);
  return (
    <div className="chamber relative w-[400px] h-[400px]" aria-hidden>
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs><radialGradient id="core" cx="50%" cy="50%"><stop offset="0%" stopColor="#fff" stopOpacity=".95" /><stop offset="45%" stopColor={color} stopOpacity=".85" /><stop offset="100%" stopColor={color} stopOpacity="0" /></radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {[150, 120, 90].map((r, i) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={color} strokeOpacity={0.08 + i * 0.05} strokeDasharray={i === 1 ? '3 6' : undefined} style={{ transformOrigin: '200px 200px', animation: `spin ${30 + i * 15}s linear infinite ${i % 2 ? 'reverse' : ''}` }} />)}
        <polygon points="200,110 278,155 278,245 200,290 122,245 122,155" fill="none" stroke={color} strokeOpacity=".25" strokeWidth="1.2" style={{ transformOrigin: '200px 200px', transition: 'transform .8s', transform: step >= 2 ? 'rotate(30deg) scale(1.05)' : 'none' }} />
        {pts.map(([x, y], i) => <line key={`l${i}`} x1="200" y1="200" x2={x} y2={y} stroke={color} strokeOpacity=".35" strokeWidth="1" className="pop" />)}
        {mem.map(([x, y], i) => <line key={`m${i}`} x1="200" y1="200" x2={x} y2={y} stroke="#f05ca8" strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 4" className="pop" />)}
        <circle cx="200" cy="200" r={step >= 3 ? 46 : 38} fill="url(#core)" style={{ transition: 'r .6s' }} filter="url(#glow)" />
        <circle cx="200" cy="200" r="14" fill="#fff" opacity=".9" />
        {pts.map(([x, y], i) => <g key={`n${i}`} className="pop" style={{ animationDelay: `${i * 40}ms` }}><circle cx={x} cy={y} r="11" fill="#fff" stroke={color} strokeWidth="1.5" filter="url(#glow)" /><circle cx={x} cy={y} r="4" fill={color} /></g>)}
        {mem.map(([x, y], i) => <g key={`mn${i}`} className="pop"><circle cx={x} cy={y} r="10" fill="#fff" stroke="#f05ca8" strokeWidth="1.5" /><circle cx={x} cy={y} r="3.5" fill="#f05ca8" /></g>)}
        {[...Array(18)].map((_, i) => <circle key={`p${i}`} cx={40 + ((i * 97) % 320)} cy={30 + ((i * 61) % 340)} r={1 + (i % 3) * 0.6} fill={i % 4 ? color : '#f05ca8'} opacity=".5" className="pulse-dot" style={{ animationDelay: `${i * 130}ms` }} />)}
      </svg>
    </div>
  );
}

const STEPS_P = ['Choose', 'Build', 'Shape', 'Create'];
const STEPS_T = ['Choose', 'Build', 'Shape', 'Invite', 'Create'];

export default function SpaceWizard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const ent = useApp((s) => s.entitlements);
  const [type, setType] = useState(null);
  const [step, setStep] = useState(0);
  const [caps, setCaps] = useState(['notes', 'tasks', 'calendar']);
  const [form, setForm] = useState({ name: '', description: '', icon: 'sparkles', accent: 'violet' });
  const [invites, setInvites] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [idem] = useState(uid());
  const { data: registry = [] } = useQuery({ queryKey: ['registry'], queryFn: () => api.get('/registry').then((r) => r.data), staleTime: Infinity });
  const items = registry.filter((c) => ['module', 'tool', 'view', 'ai'].includes(c.type));
  const steps = type === 'team' ? STEPS_T : STEPS_P;
  const toggle = (k) => setCaps((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const memberList = invites.split(/[,\n\s]+/).map((s) => s.trim()).filter((s) => s.includes('@'));
  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/spaces', { name: form.name.trim(), type, description: form.description, icon: form.icon, accent: form.accent, capabilities: caps, invites: memberList }, { headers: { 'Idempotency-Key': idem } });
      qc.invalidateQueries({ queryKey: ['spaces'] });
      setStep(steps.length);
      setTimeout(() => nav(`/dashboard/spaces/${data.id}`), 900);
    } catch (e) { toast.error(e.message); if (e.code === 'PLAN_REQUIRED') nav('/dashboard/settings?tab=billing'); } finally { setBusy(false); }
  };
  const canNext = step === 0 ? !!type : step === 2 ? form.name.trim().length > 0 : true;
  const isInvite = type === 'team' && step === 3;
  const isCreate = step === steps.length - 1;
  const categories = [...new Set(items.map((c) => c.category))];
  return (
    <div className="h-screen grid grid-cols-[1fr_520px] overflow-hidden bg-white" data-testid="space-wizard">
      <div className="relative flex flex-col items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% 45%, #f3f0ff 0%, #fbfbfe 60%)' }}>
        <button className="absolute top-6 left-6 nv-btn nv-btn-ghost" onClick={() => nav('/dashboard')} data-testid="wizard-back-brain"><Icon name="arrow-left" size={15} /> Back to Notevoro</button>
        <div className="absolute top-6 right-6"><Logo size={24} /></div>
        <Chamber step={step} nodes={step >= 1 ? caps : []} accent={form.accent} members={step >= 3 ? memberList : []} />
        <div className="text-center mt-2 min-h-[60px]">
          <div className="text-[18px] font-extrabold tracking-tight">{step >= steps.length ? 'Your chamber is ready.' : ['A new chamber begins to form.', 'Each capability becomes a node.', 'Give the chamber a name and a color.', type === 'team' ? 'Bring your people in.' : 'Ready to enter.', 'Ready to enter.'][step]}</div>
          <div className="text-xs nv-muted mt-1">{form.name || (type ? `${type === 'team' ? 'Team' : 'Personal'} Space` : 'Personal or Team')}{caps.length ? ` · ${caps.length} capabilities` : ''}{memberList.length ? ` · ${memberList.length} people` : ''}</div>
        </div>
      </div>
      <div className="border-l border-[var(--nv-border)] flex flex-col h-full">
        <div className="px-8 pt-8">
          <div className="flex items-center gap-2">{steps.map((s, i) => <div key={s} className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${i < step ? 'bg-[#22b573] text-white' : i === step ? 'bg-[#6e56f5] text-white' : 'bg-[#f0eefa] text-[#a3a0b8]'}`} data-testid={`wizard-step-${i}`}>{i < step ? <Icon name="check" size={12} /> : i + 1}</div><span className={`text-[11px] font-bold uppercase tracking-wider ${i === step ? 'text-[#16141f]' : 'nv-faint'}`}>{s}</span>{i < steps.length - 1 && <div className="w-5 h-px bg-[var(--nv-border)]" />}</div>)}</div>
        </div>
        <div className="flex-1 overflow-auto nv-scroll px-8 py-6">
          {step === 0 && (
            <div className="fade-up"><h2 className="nv-h1">What kind of Space?</h2><p className="nv-muted text-sm mt-1">A Space is a complete environment: modules, tools, views, people and Voro context.</p>
              <div className="grid gap-3 mt-6">
                {[['personal', 'Personal', 'One-user environment. School, research, ideas, life, journal, learning.', 'user'], ['team', 'Team', 'Shared environment. Product, engineering, design, marketing, study groups.', 'users']].map(([k, n, d, ic]) => (
                  <button key={k} onClick={() => setType(k)} data-testid={`wizard-type-${k}`} className={`nv-card p-4 text-left flex gap-4 items-start transition-all ${type === k ? 'border-[#6e56f5] ring-2 ring-[#eeebfe]' : 'hover:border-[#c9bffb]'}`}>
                    <div className={`stat-icon ${k === 'team' ? 'tone-pink' : 'tone-violet'}`}><Icon name={ic} size={18} /></div><div><div className="font-bold">{n}</div><div className="text-xs nv-muted mt-0.5">{d}</div>{k === 'team' && ent?.plan === 'free' && <span className="nv-tag tone-amber mt-2">Requires Pro</span>}</div>
                  </button>
                ))}
              </div></div>
          )}
          {step === 1 && (
            <div className="fade-up"><h2 className="nv-h1">What should this chamber be capable of?</h2><p className="nv-muted text-sm mt-1">Start small. You can add anything later from the Space Library.</p>
              <input className="nv-input mt-4" placeholder="Search capabilities…" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="wizard-cap-search" />
              <div className="mt-4 space-y-5">
                {categories.map((cat) => { const list = items.filter((c) => c.category === cat && (!filter || c.name.toLowerCase().includes(filter.toLowerCase()))); if (!list.length) return null; return (
                  <div key={cat}><div className="nv-eyebrow mb-2">{cat}</div><div className="grid grid-cols-2 gap-2">{list.map((c) => (
                    <button key={c.key} onClick={() => toggle(c.key)} data-testid={`wizard-cap-${c.key}`} className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${caps.includes(c.key) ? 'border-[#6e56f5] bg-[#f4f2ff]' : 'border-[var(--nv-border)] hover:border-[#c9bffb]'}`}>
                      <div className={`stat-icon ${caps.includes(c.key) ? 'tone-violet' : 'tone-slate'}`} style={{ width: 30, height: 30 }}><Icon name={c.icon} size={14} /></div><div className="min-w-0 flex-1"><div className="text-[12.5px] font-bold truncate">{c.name}</div><div className="text-[10px] nv-faint uppercase">{c.type}</div></div>{caps.includes(c.key) && <Icon name="check-circle-2" size={15} className="text-[#6e56f5]" />}
                    </button>))}</div></div>); })}
              </div></div>
          )}
          {step === 2 && (
            <div className="fade-up"><h2 className="nv-h1">Shape your Space</h2><p className="nv-muted text-sm mt-1">Name, icon, color and a line about what lives here.</p>
              <div className="flex items-center gap-4 mt-6"><SpaceIcon icon={form.icon} accent={form.accent} size={56} radius={16} /><div className="flex-1"><input className="nv-input text-[15px] h-11" placeholder={type === 'team' ? 'e.g. Product Development' : 'e.g. Research, School, Ideas'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="wizard-name-input" autoFocus /></div></div>
              <textarea className="nv-input mt-3 min-h-[70px]" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="wizard-description-input" />
              <div className="nv-eyebrow mt-5 mb-2">Icon</div><div className="flex flex-wrap gap-2">{SPACE_ICONS.map((i) => <button key={i} onClick={() => setForm({ ...form, icon: i })} data-testid={`wizard-icon-${i}`} className={`w-9 h-9 rounded-lg grid place-items-center border transition-colors ${form.icon === i ? 'border-[#6e56f5] bg-[#f4f2ff] text-[#6e56f5]' : 'border-[var(--nv-border)] nv-muted hover:bg-[#f7f6fd]'}`}><Icon name={i} size={16} /></button>)}</div>
              <div className="nv-eyebrow mt-5 mb-2">Accent</div><div className="flex gap-2">{ACCENTS.map((a) => <button key={a} onClick={() => setForm({ ...form, accent: a })} data-testid={`wizard-accent-${a}`} className={`w-8 h-8 rounded-full bg-${a} ring-offset-2 transition-all ${form.accent === a ? 'ring-2 ring-[#6e56f5] scale-110' : ''}`} aria-label={a} />)}</div>
            </div>
          )}
          {isInvite && (
            <div className="fade-up"><h2 className="nv-h1">Invite your team</h2><p className="nv-muted text-sm mt-1">Optional. People who already use Notevoro join instantly; others get an invitation.</p>
              <textarea className="nv-input mt-5 min-h-[110px]" placeholder={'sarah@company.com\nmichael@company.com'} value={invites} onChange={(e) => setInvites(e.target.value)} data-testid="wizard-invites-input" />
              <div className="flex flex-wrap gap-2 mt-3">{memberList.map((m) => <span key={m} className="nv-tag tone-pink">{m}</span>)}</div>
            </div>
          )}
          {isCreate && step < steps.length && (
            <div className="fade-up"><h2 className="nv-h1">Create {form.name}</h2><p className="nv-muted text-sm mt-1">Everything is set. Enter your Space right after creation.</p>
              <div className="nv-card p-4 mt-6 space-y-3">
                <div className="flex items-center gap-3"><SpaceIcon icon={form.icon} accent={form.accent} size={44} radius={12} /><div><div className="font-bold">{form.name}</div><div className="text-xs nv-muted capitalize">{type} Space{form.description ? ` · ${form.description}` : ''}</div></div></div>
                <div className="flex flex-wrap gap-1.5">{caps.map((k) => <span key={k} className="nv-tag bg-[#f3f2fa] text-[#5c5b70]">{items.find((c) => c.key === k)?.name || k}</span>)}</div>
                {memberList.length > 0 && <div className="text-xs nv-muted">{memberList.length} invitation{memberList.length > 1 ? 's' : ''}</div>}
              </div></div>
          )}
          {step >= steps.length && <div className="fade-up text-center py-16"><div className="stat-icon tone-green mx-auto"><Icon name="check" size={20} /></div><div className="font-bold mt-3">Chamber stabilized</div><div className="text-xs nv-muted">Entering {form.name}…</div></div>}
        </div>
        {step < steps.length && (
          <div className="px-8 py-5 border-t border-[var(--nv-border)] flex items-center gap-2">
            {step > 0 && <button className="nv-btn nv-btn-outline" onClick={() => setStep(step - 1)} data-testid="wizard-back">Back</button>}
            <div className="flex-1" />
            {isInvite && <button className="nv-btn nv-btn-ghost" onClick={() => { setInvites(''); setStep(step + 1); }} data-testid="wizard-skip-invites">Skip for now</button>}
            {!isCreate ? <button className="nv-btn nv-btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)} data-testid="wizard-next">Continue <Icon name="arrow-right" size={14} /></button>
              : <button className="nv-btn nv-btn-primary" disabled={busy || !form.name.trim()} onClick={create} data-testid="wizard-create">{busy ? <Icon name="loader-2" className="spin" size={14} /> : <Icon name="sparkles" size={14} />} Create Space</button>}
          </div>
        )}
      </div>
    </div>
  );
}
