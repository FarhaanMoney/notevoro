import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Icon, SpaceIcon } from '../lib/icons';
import { ago, greeting, Loading, ErrorState, fmtTime } from '../lib/ui';
import { useVoro, VoroComposer, VoroThread } from '../components/VoroPanel';
import { useQuickNew, SpacePicker } from '../components/Chrome';

const QUICK = [['note', 'New Note', 'file-text', 'violet'], ['task', 'New Task', 'check-circle-2', 'green'], ['project', 'New Project', 'layers', 'blue'], ['event', 'New Event', 'calendar', 'pink'], ['file', 'Upload File', 'cloud-upload', 'teal'], ['meeting', 'New Meeting', 'video', 'amber'], ['space', 'New Space', 'plus', 'violet'], ['document', 'New Document', 'file', 'blue'], ['conversation', 'New Conversation', 'message-circle', 'pink']];
const KIND_ICON = { document: ['file', 'blue'], note: ['file-text', 'violet'], project: ['layers', 'green'], task: ['check-square', 'amber'] };
const SPACE_ART = ['linear-gradient(135deg,#f5d0fe 0%,#c4b5fd 45%,#7c6cf0 100%)', 'linear-gradient(135deg,#312e81 0%,#6d5df6 55%,#a5b4fc 100%)', 'linear-gradient(135deg,#fecdd3 0%,#f9a8d4 50%,#c084fc 100%)', 'linear-gradient(135deg,#a7f3d0 0%,#67e8f9 50%,#818cf8 100%)'];

export default function Brain() {
  const user = useApp((s) => s.user);
  const ent = useApp((s) => s.entitlements);
  const nav = useNavigate();
  const q = useQuickNew();
  const voro = useVoro(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['brain'], queryFn: () => api.get('/brain').then((r) => r.data) });
  const first = (user?.name || '').split(' ')[0];
  if (isLoading) return <Loading label="Opening your Brain…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="px-8 py-7 max-w-[1180px] fade-up" data-testid="brain-home">
      <div className="relative">
        <div className="flex items-center gap-3"><Icon name="sun" size={26} className="text-[#f2a531]" /><h1 className="nv-h1 text-[30px]">{greeting()}, <span className="text-[#6e56f5]">{first}</span></h1></div>
        <p className="nv-muted text-[15px] mt-1 ml-10">Your thoughts, projects, and ideas — all in one place.</p>
        <div className="absolute right-4 -top-6 w-40 h-32 pointer-events-none" aria-hidden>
          <div className="absolute right-6 top-4 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #efe9ff 0%, #c4b5fd 45%, #8b7cf8 100%)', boxShadow: '0 20px 40px -10px rgba(110,86,245,.45)' }} />
          <div className="absolute right-2 top-2 w-3 h-3 rounded-full bg-[#d8ccff]" /><div className="absolute right-32 top-20 w-2 h-2 rounded-full bg-[#c4b5fd]" /><div className="absolute right-28 top-6 w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
        </div>
      </div>

      <div className="nv-card mt-7 p-3 bg-gradient-to-r from-[#f9f8ff] to-white" data-testid="brain-voro-card">
        <VoroComposer onSend={(m) => voro.ask(m)} busy={voro.busy} large testId="brain-voro-input" />
        <div className="flex flex-wrap gap-2 mt-3 px-1">
          {[['align-left', 'Summarize my notes'], ['calendar-check', 'Help me plan my day'], ['search', 'Research a topic'], ['check-square', 'Create a task']].map(([ic, s]) => <button key={s} className="nv-chip" onClick={() => voro.ask(s)} data-testid="brain-voro-chip"><Icon name={ic} size={12} /> {s}</button>)}
        </div>
        <VoroThread voro={voro} className="mt-3 max-h-[280px] px-1" />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3"><h2 className="nv-h2 text-[16px] flex items-center gap-2"><Icon name="user" size={17} /> My Spaces</h2><button className="nv-link" onClick={() => nav('/dashboard/spaces/new')} data-testid="create-space-button">Create Space →</button></div>
        <div className="grid grid-cols-2 gap-4">
          {data.spaces.map((s, i) => (
            <button key={s.id} className="nv-card p-4 text-left hover:border-[#c9bffb] hover:shadow-lg hover:shadow-[#6e56f5]/5 transition-all group" onClick={() => nav(`/dashboard/spaces/${s.id}`)} data-testid={`space-card-${s.id}`}>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3"><SpaceIcon icon={s.icon} accent={s.accent} size={40} radius={11} /><div className="min-w-0"><div className="font-bold text-[16px] truncate">{s.name}</div><div className="text-xs nv-muted truncate">{s.description || (s.type === 'team' ? 'Team collaboration space' : 'Your personal workspace')}</div></div></div>
                  <div className="flex flex-wrap gap-1.5 mt-4">{s.capability_names.slice(0, 3).map((n) => <span key={n} className="nv-tag bg-[#f3f2fa] text-[#5c5b70]">{n}</span>)}{s.capability_names.length > 3 && <span className="nv-tag bg-[#f3f2fa] text-[#5c5b70]">+{s.capability_names.length - 3}</span>}</div>
                  <div className="flex items-center gap-1.5 text-[11px] nv-muted mt-4"><span className="w-1.5 h-1.5 rounded-full bg-[#22b573]" /> {s.last_active_at ? `Last active ${ago(s.last_active_at)}` : 'New'} {s.type === 'team' && <span className="ml-2">· {s.member_count} members</span>}</div>
                </div>
                <div className="w-[108px] h-[86px] rounded-xl shrink-0 relative overflow-hidden" style={{ background: SPACE_ART[i % SPACE_ART.length] }}><div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent" /><Icon name="more-vertical" size={14} className="absolute top-2 right-2 text-white/80" /></div>
              </div>
            </button>
          ))}
          <button className="nv-card p-4 border-dashed flex flex-col items-center justify-center gap-2 min-h-[150px] hover:border-[#c9bffb] hover:bg-[#faf9ff] transition-colors" onClick={() => nav('/dashboard/spaces/new')} data-testid="create-space-card">
            <div className="stat-icon tone-violet"><Icon name="plus" size={18} /></div><div className="font-bold text-sm">Create Space</div><div className="text-xs nv-muted">Personal or Team — shape it around what you're doing</div>
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="nv-h2 text-[16px] flex items-center gap-2 mb-3"><Icon name="clock" size={17} /> Continue where you left off</h2>
        {!data.recent.length ? <div className="nv-card p-6 text-center text-xs nv-muted" data-testid="recent-empty">Nothing yet — create a note, task or document in one of your Spaces.</div> : (
          <div className="grid grid-cols-4 gap-3">
            {data.recent.slice(0, 4).map((r) => { const [ic, tone] = KIND_ICON[r.kind]; const to = `/dashboard/spaces/${r.space.id}/${r.kind === 'note' ? `notes/${r.id}` : r.kind === 'document' ? `documents/${r.id}` : r.kind === 'project' ? 'projects' : 'tasks'}`; return (
              <button key={r.kind + r.id} className="nv-card p-4 text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(to)} data-testid="recent-item">
                <div className="flex items-start justify-between"><div className={`stat-icon tone-${tone}`} style={{ width: 34, height: 34 }}><Icon name={ic} size={15} /></div><Icon name="more-horizontal" size={14} className="nv-faint" /></div>
                <div className="font-bold text-[13px] mt-3 truncate">{r.title}</div><div className="text-[11px] nv-muted mt-1 flex items-center gap-1 capitalize"><Icon name={ic} size={11} /> {r.kind} · {r.space.name}</div><div className="text-[11px] nv-faint mt-2">Edited {ago(r.updated_at)}</div>
              </button>); })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="nv-h2 text-[16px] flex items-center gap-2 mb-3"><Icon name="zap" size={17} /> Quick Access</h2>
        <div className="grid grid-cols-9 gap-2">
          {QUICK.map(([k, label, ic, tone]) => <button key={k} className="nv-card p-3 flex flex-col items-center gap-2 hover:border-[#c9bffb] hover:bg-[#faf9ff] transition-colors" onClick={() => q.run(k)} data-testid={`quick-access-${k}`}><div className={`stat-icon tone-${tone}`} style={{ width: 34, height: 34 }}><Icon name={ic} size={15} /></div><span className="text-[11px] font-semibold text-center leading-tight">{label}</span></button>)}
        </div>
      </section>

      {data.today.length > 0 && (
        <section className="mt-8"><h2 className="nv-h2 text-[16px] flex items-center gap-2 mb-3"><Icon name="calendar" size={17} /> Today</h2>
          <div className="nv-card divide-y divide-[var(--nv-border)]">{data.today.map((e) => <button key={e.id} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#faf9ff]" onClick={() => nav(`/dashboard/spaces/${e.space_id}/calendar`)} data-testid="today-event"><span className="w-1.5 h-1.5 rounded-full bg-[#6e56f5]" /><span className="text-xs nv-muted w-16">{fmtTime(e.start_at)}</span><span className="text-[13px] font-semibold flex-1">{e.title}</span><span className="text-[11px] nv-muted">{e.space.name}</span></button>)}</div>
        </section>
      )}

      <div className="mt-8 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden" style={{ background: 'linear-gradient(90deg,#e9e4ff 0%,#f6f2ff 45%,#dfe6ff 100%)' }} data-testid="voro-banner">
        <div className="w-12 h-12 rounded-xl bg-[#6e56f5] text-white grid place-items-center shadow-lg shadow-[#6e56f5]/30"><Icon name="sparkles" size={22} /></div>
        <div className="flex-1"><div className="font-bold text-[15px]">Let Voro help you think, plan, and create.</div><div className="text-xs nv-muted">Ask questions, get insights, and take action across your spaces.</div></div>
        <button className="nv-btn nv-btn-primary" onClick={() => nav('/dashboard/voro')} data-testid="open-voro-button">Open Voro <Icon name="arrow-right" size={14} /></button>
      </div>
      {ent?.plan === 'free' && <div className="text-[11px] nv-faint mt-4">You're on the Free plan · unlimited local productivity · {ent.usage.ai_requests}/{ent.limits.ai_requests} AI requests used this month</div>}
      <SpacePicker q={q} />
    </div>
  );
}
