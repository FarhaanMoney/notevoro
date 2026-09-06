import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ago, dueLabel, ErrorState, fmtTime, greeting, Loading, priorityTone, Tag } from '../lib/ui';
import { useQuickNew, SpacePicker } from '../components/Chrome';
import { useSpace, MemberAvatar } from './SpaceShell';
import dayjs from 'dayjs';

const QUICK = [['note', 'Note', 'file-text'], ['task', 'Task', 'check-square'], ['project', 'Project', 'layers'], ['event', 'Event', 'calendar'], ['document', 'Document', 'file'], ['file', 'File', 'cloud-upload'], ['meeting', 'Meeting', 'video'], ['space', 'Space', 'plus'], ['more', 'More', 'more-horizontal']];

export default function SpaceHome() {
  const { space, spaceId } = useSpace();
  const user = useApp((s) => s.user);
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuickNew(spaceId);
  const [banner, setBanner] = useState(() => !localStorage.getItem(`nv.banner.${spaceId}`));
  const [filter, setFilter] = useState('all');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/home`).then((r) => r.data), refetchInterval: 60000 });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const first = (user?.name || '').split(' ')[0];
  const base = `/dashboard/spaces/${spaceId}`;
  const toggleTask = async (t) => { await api.patch(`/spaces/${spaceId}/tasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done' }); qc.invalidateQueries({ queryKey: ['home', spaceId] }); };
  if (isLoading) return <Loading label="Loading your Space…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const s = data.stats;
  const tasks = data.tasks.filter((t) => filter === 'all' || (filter === 'today' && t.due_at && dayjs(t.due_at).isSame(dayjs(), 'day')) || (filter === 'week' && t.due_at && dayjs(t.due_at).isBefore(dayjs().add(7, 'day'))) || (filter === 'upcoming' && t.due_at && dayjs(t.due_at).isAfter(dayjs())));
  const has = (k) => space.enabled_capabilities.includes(k);
  const stats = [
    has('projects') && ['Active Projects', s.active_projects, `+${s.new_projects} this week`, 'layers', 'violet', 'projects'],
    has('tasks') && ['Open Tasks', s.open_tasks, `+${s.tasks_today} today`, 'check-circle-2', 'green', 'tasks'],
    space.type === 'team' ? ['Team Members', s.members, `${s.online} online`, 'users', 'blue', 'team'] : ['Notes', s.notes, `${s.documents} documents`, 'file-text', 'blue', 'notes'],
    has('meetings') ? ['Upcoming Meetings', s.meetings, 'Next 7 days', 'calendar', 'pink', 'meetings'] : ['Files', s.files, 'in this space', 'folder', 'pink', 'files'],
  ].filter(Boolean);
  return (
    <div className="flex flex-col fade-up" style={{ height: 'calc(100vh - var(--header-h))', overflow: 'hidden' }} data-testid="space-home">
      <div className="px-7 pt-5 flex items-start justify-between shrink-0">
        <div><h1 className="nv-h1 text-[26px]">{greeting()}, {first} <span aria-hidden>👋</span></h1><p className="nv-muted text-[13.5px] mt-1">Here's what's happening in your {space.name} space today.</p></div>
        <div className="flex items-center gap-2 mt-2 text-xs nv-muted" data-testid="synced-label"><Icon name="cloud" size={14} /> Synced {ago(data.synced_at)} <span className="w-1.5 h-1.5 rounded-full bg-[#22b573]" /></div>
      </div>
      {banner && (
        <div className="mx-7 mt-4 hero-banner rounded-2xl h-[118px] flex items-center relative overflow-hidden shrink-0" data-testid="space-banner">
          <div className="w-[300px] h-full relative shrink-0" aria-hidden>
            <div className="absolute left-16 top-4 w-24 h-24" style={{ transform: 'rotate(12deg)' }}><div className="w-full h-full rounded-[20px] bg-white/25 backdrop-blur-sm border border-white/40 grid place-items-center"><div className="w-12 h-12 rounded-xl bg-white/80 shadow-xl" /></div></div>
            <div className="absolute left-10 top-8 w-2 h-2 rounded-full bg-white/70" /><div className="absolute left-48 bottom-6 w-3 h-3 rounded-full bg-[#f9a8d4]" /><div className="absolute left-44 top-5 w-1.5 h-1.5 rounded-full bg-white/60" />
          </div>
          <div className="flex-1 pl-2"><div className="font-extrabold text-[17px]">{space.type === 'team' ? 'Build something great, together' : 'Shape this chamber around your thinking'}</div><div className="text-[13px] nv-muted mt-0.5">{space.type === 'team' ? 'Plan, create, collaborate, and bring your ideas to life — all in one space.' : 'Add modules, tools and views. Your Space evolves with what you do.'}</div>
            <div className="flex gap-2 mt-3"><button className="nv-btn nv-btn-primary" onClick={() => nav(`${base}/library`)} data-testid="banner-explore-library">Explore Space Library</button><button className="nv-btn nv-btn-outline" onClick={() => nav(`${base}/library`)} data-testid="banner-add-feature"><Icon name="plus" size={14} /> Add Feature</button></div></div>
          <button className="absolute top-3 right-4 nv-faint hover:text-[#16141f]" onClick={() => { localStorage.setItem(`nv.banner.${spaceId}`, '1'); setBanner(false); }} aria-label="Dismiss" data-testid="banner-dismiss"><Icon name="x" size={16} /></button>
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mx-7 mt-4 shrink-0">
        {stats.map(([label, val, sub, ic, tone, route]) => (
          <button key={label} className="nv-card p-4 flex gap-3 items-start text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(`${base}/${route}`)} data-testid={`stat-${route}`}>
            <div className={`stat-icon tone-${tone}`}><Icon name={ic} size={18} /></div>
            <div><div className="text-xs nv-muted font-semibold">{label}</div><div className="text-[24px] font-extrabold leading-tight mt-0.5">{val}</div><div className={`text-[11px] font-semibold mt-0.5 ${tone === 'green' ? 'text-[#1d9e63]' : 'text-[#6e56f5]'}`}>{sub}</div></div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 mx-7 mt-4 flex-1 min-h-0">
        <Card title="Upcoming" icon="calendar" tone="violet" onAll={() => nav(`${base}/calendar`)} testId="card-upcoming">
          {!data.upcoming.length ? <EmptyLine text="Nothing scheduled. Add an event or meeting." onClick={() => nav(`${base}/calendar?new=event`)} /> : data.upcoming.map((e) => (
            <button key={e.id} className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-[#faf9ff] text-left" onClick={() => nav(`${base}/${e.kind === 'meeting' ? 'meetings' : 'calendar'}`)} data-testid="upcoming-item">
              <div className={`mt-1 w-7 h-7 rounded-lg grid place-items-center tone-${e.color || 'violet'}`}><Icon name={e.kind === 'meeting' ? 'video' : 'calendar'} size={13} /></div>
              <div className="flex-1 min-w-0"><div className="text-[11px] nv-muted">{fmtTime(e.start_at)} – {fmtTime(e.end_at)}</div><div className="text-[13px] font-bold truncate">{e.title}</div><div className="text-[11px] nv-muted capitalize">{e.kind === 'meeting' ? 'Team Meeting' : e.location || 'Event'}</div></div>
              <div className="flex -space-x-1.5 mt-1">{(e.attendees || []).slice(0, 2).map((a) => <MemberAvatar key={a} userId={a} size={20} />)}</div>
            </button>
          ))}
        </Card>
        <Card title="My Tasks" icon="check-square" tone="green" onAll={() => nav(`${base}/tasks`)} testId="card-tasks" header={
          <div className="flex gap-1 px-3 pb-2">{[['all', 'All'], ['today', 'Today'], ['week', 'This Week'], ['upcoming', 'Upcoming']].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${filter === k ? 'bg-[#6e56f5] text-white' : 'bg-[#f3f2fa] nv-muted hover:bg-[#eceafb]'}`} data-testid={`task-filter-${k}`}>{l}</button>)}</div>}>
          {!tasks.length ? <EmptyLine text="No open tasks. Nice." onClick={() => nav(`${base}/tasks?new=1`)} /> : tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-[#faf9ff]" data-testid="home-task-item">
              <button onClick={() => toggleTask(t)} className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 grid place-items-center ${t.status === 'done' ? 'bg-[#6e56f5] border-[#6e56f5] text-white' : 'border-[#c8c6d8] hover:border-[#6e56f5]'}`} data-testid="home-task-toggle">{t.status === 'done' && <Icon name="check" size={10} />}</button>
              <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{t.title}</div><div className="flex gap-1.5 mt-1">{(t.tags || []).slice(0, 1).map((g) => <Tag key={g} tone="blue">{g}</Tag>)}<Tag tone={priorityTone(t.priority)}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</Tag></div></div>
              <div className="text-[11px] nv-muted shrink-0">{dueLabel(t.due_at)}</div>
            </div>
          ))}
        </Card>
        <Card title="Recent Activity" icon="activity" tone="violet" onAll={() => nav(`${base}/activity`)} testId="card-activity">
          {!data.activity.length ? <EmptyLine text="Activity will appear as your Space comes alive." /> : data.activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-3 py-2" data-testid="activity-item"><Avatar user={a.actor} size={30} /><div className="min-w-0"><div className="text-[12.5px] leading-snug">{a.summary}</div><div className="text-[11px] nv-faint mt-0.5">{ago(a.created_at)}</div></div></div>
          ))}
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4 mx-7 mt-4 mb-4 shrink-0" style={{ height: 'clamp(118px, 16vh, 150px)' }}>
        <div className="col-span-2 nv-card p-4 flex flex-col min-h-0" data-testid="card-shared-spaces">
          <div className="flex items-center justify-between mb-2"><div className="nv-h2 flex items-center gap-2"><Icon name="users" size={15} className="text-[#6e56f5]" /> {space.type === 'team' ? 'Shared Spaces' : 'My Spaces'}</div><button className="nv-link" onClick={() => nav('/dashboard')} data-testid="spaces-view-all">View all</button></div>
          <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
            {spaces.slice(0, 4).map((sp) => <button key={sp.id} className="nv-card p-3 text-left hover:border-[#c9bffb] transition-colors relative" onClick={() => nav(`/dashboard/spaces/${sp.id}`)} data-testid={`home-space-${sp.id}`}><SpaceIcon icon={sp.icon} accent={sp.accent} size={28} radius={8} /><div className="text-[12.5px] font-bold mt-2 truncate">{sp.name}</div><div className="text-[11px] nv-muted capitalize">{sp.type} · {sp.type === 'team' ? `${sp.member_count} members` : 'Just me'}</div><Icon name="more-horizontal" size={13} className="absolute top-3 right-3 nv-faint" /></button>)}
          </div>
        </div>
        <div className="nv-card p-4 flex flex-col" data-testid="card-quick-new">
          <div className="nv-h2 flex items-center gap-2 mb-2"><Icon name="plus" size={15} className="text-[#6e56f5]" /> Quick New</div>
          <div className="grid grid-cols-3 gap-1.5 flex-1">{QUICK.map(([k, l, ic]) => <button key={k} className="rounded-lg border border-[var(--nv-border)] hover:bg-[#f4f2ff] hover:border-[#d9d4f5] flex flex-col items-center justify-center gap-0.5 transition-colors" onClick={() => (k === 'more' ? nav(`${base}/library`) : q.run(k, spaceId))} data-testid={`home-quick-${k}`}><Icon name={ic} size={14} className="text-[#6e56f5]" /><span className="text-[10.5px] font-semibold nv-muted">{l}</span></button>)}</div>
        </div>
      </div>
      <SpacePicker q={q} />
    </div>
  );
}

function Card({ title, icon, tone, onAll, children, header, testId }) {
  return (
    <div className="nv-card flex flex-col min-h-0" data-testid={testId}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2"><div className="nv-h2 flex items-center gap-2"><span className={`w-6 h-6 rounded-md grid place-items-center tone-${tone}`}><Icon name={icon} size={13} /></span> {title}</div>{onAll && <button className="nv-link" onClick={onAll} data-testid={`${testId}-view-all`}>View all</button>}</div>
      {header}
      <div className="flex-1 overflow-auto nv-scroll px-1 pb-2">{children}</div>
    </div>
  );
}

function EmptyLine({ text, onClick }) {
  return <button className="w-full text-left text-xs nv-muted px-3 py-4 hover:text-[#6e56f5]" onClick={onClick} data-testid="card-empty">{text}</button>;
}
