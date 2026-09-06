import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ago, Empty, ErrorState, fmtTime, Loading, Tag } from '../lib/ui';
import { useCrud } from '../components/Forms';
import { PageHeader, useSpace, MemberAvatar } from './SpaceShell';
import { blank, EventModal } from './Calendar';
import { SaveState, useAutosave } from './Notes';

const PROVIDER = { zoom: ['Zoom', 'video', 'blue'], google_meet: ['Google Meet', 'video', 'green'], teams: ['Microsoft Teams', 'video', 'violet'] };

export default function Meetings() {
  const { spaceId, canWrite, space } = useSpace();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  const events = useCrud(spaceId, 'events', 'calendar_events');
  const tasks = useCrud(spaceId, 'tasks');
  const { data: integrations = [] } = useQuery({ queryKey: ['integrations', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/integrations`).then((r) => r.data) });
  useEffect(() => { if (params.get('new')) { setEditing(blank(true)); setParams({}); } }, [params, setParams]);
  const meetings = events.items.filter((e) => e.kind === 'meeting');
  const upcoming = meetings.filter((m) => dayjs(m.end_at).isAfter(dayjs()));
  const past = meetings.filter((m) => !dayjs(m.end_at).isAfter(dayjs())).reverse();
  const save = async (e) => { if (e.id) await events.update.mutateAsync(e); else await events.create.mutateAsync(e); setEditing(null); };
  const current = meetings.find((m) => m.id === open);
  const zoom = integrations.find((i) => i.provider === 'zoom');
  return (
    <div className="fade-up" data-testid="meetings-page">
      <PageHeader icon="video" title="Meetings" subtitle="Agenda, attendees, notes, transcript and action items — connected to Calendar, Tasks and Voro." actions={<>
        <button className="nv-btn nv-btn-outline" onClick={() => nav(`/dashboard/spaces/${spaceId}/library?type=integration`)} data-testid="meetings-integrations"><Icon name="plug" size={14} /> {zoom?.status === 'connected' ? 'Zoom connected' : 'Connect Zoom / Meet / Teams'}</button>
        {canWrite && <button className="nv-btn nv-btn-primary" onClick={() => setEditing(blank(true))} data-testid="meetings-new-button"><Icon name="plus" size={14} /> New Meeting</button>}</>} />
      <div className="px-7 pb-8 grid grid-cols-[1fr_1.4fr] gap-5">
        <div className="space-y-5">
          {events.isLoading && <Loading />}{events.error && <ErrorState error={events.error} onRetry={events.refetch} />}
          {!events.isLoading && !meetings.length && <Empty icon="video" title="No meetings yet" hint="Schedule a meeting. Voro can summarize it and turn action items into tasks." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => setEditing(blank(true))} data-testid="meetings-empty-new">Schedule a meeting</button>} />}
          {[['Upcoming', upcoming], ['Past', past]].map(([label, list]) => list.length > 0 && <div key={label}><div className="nv-eyebrow mb-2">{label}</div><div className="space-y-2">{list.map((m) => { const p = PROVIDER[m.meeting_provider]; return (
            <button key={m.id} onClick={() => setOpen(m.id)} className={`w-full nv-card p-3.5 text-left flex items-start gap-3 hover:border-[#c9bffb] ${open === m.id ? 'border-[#6e56f5]' : ''}`} data-testid={`meeting-${m.id}`}>
              <div className="text-center w-12 shrink-0"><div className="text-[10px] font-bold nv-muted uppercase">{dayjs(m.start_at).format('MMM')}</div><div className="text-[20px] font-extrabold leading-none">{dayjs(m.start_at).format('D')}</div></div>
              <div className="flex-1 min-w-0"><div className="font-bold text-[13.5px] truncate">{m.title}</div><div className="text-[11.5px] nv-muted">{fmtTime(m.start_at)} – {fmtTime(m.end_at)}</div><div className="flex items-center gap-1.5 mt-1.5">{p && <Tag tone={p[2]}>{p[0]}</Tag>}{m.transcript && <Tag tone="green">Transcript</Tag>}<div className="flex -space-x-1.5 ml-auto">{(m.attendees || []).slice(0, 3).map((a) => <MemberAvatar key={a} userId={a} size={18} />)}</div></div></div>
            </button>); })}</div></div>)}
        </div>
        {current ? <MeetingDetail key={current.id} m={current} events={events} tasks={tasks} canWrite={canWrite} spaceId={spaceId} onEdit={() => setEditing(current)} zoom={zoom} /> : <div className="nv-card grid place-items-center min-h-[300px]"><Empty icon="clipboard-list" title="Select a meeting" hint="See agenda, notes, transcript and action items." /></div>}
      </div>
      {editing && <EventModal ev={editing} members={space.members} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? () => { events.remove.mutate(editing.id); setEditing(null); setOpen(null); } : null} />}
    </div>
  );
}

function MeetingDetail({ m, events, tasks, canWrite, spaceId, onEdit, zoom }) {
  const [f, setF] = useState({ agenda: m.agenda || '', notes: m.notes || '', transcript: m.transcript || '' });
  const [tab, setTab] = useState('notes');
  const [item, setItem] = useState('');
  const state = useAutosave(f, (v) => events.update.mutateAsync({ id: m.id, ...v }));
  const linked = tasks.items.filter((t) => t.source?.meeting_id === m.id);
  const addTask = async () => { if (!item.trim()) return; await tasks.create.mutateAsync({ title: item.trim(), source: { meeting_id: m.id }, tags: ['meeting'] }); setItem(''); toast.success('Task created from action item'); };
  const p = PROVIDER[m.meeting_provider];
  const joinInfo = m.meeting_url ? null : m.meeting_provider ? (zoom?.status === 'connected' ? 'Link will be generated by the integration.' : `${p?.[0] || 'Provider'} is not connected. Connect it in the Space Library to generate links automatically, or paste a link.`) : null;
  return (
    <div className="nv-card p-5 space-y-4" data-testid="meeting-detail">
      <div className="flex items-start gap-3"><div className="flex-1"><div className="text-[18px] font-extrabold">{m.title}</div><div className="text-xs nv-muted mt-0.5">{dayjs(m.start_at).format('dddd, MMM D')} · {fmtTime(m.start_at)} – {fmtTime(m.end_at)}{m.location ? ` · ${m.location}` : ''}</div></div><SaveState state={state} />{canWrite && <button className="nv-btn nv-btn-outline nv-btn-sm" onClick={onEdit} data-testid="meeting-edit">Edit</button>}</div>
      <div className="flex items-center gap-2">{m.meeting_url ? <a href={m.meeting_url} target="_blank" rel="noreferrer" className="nv-btn nv-btn-primary nv-btn-sm" data-testid="meeting-join"><Icon name="video" size={13} /> Join {p?.[0] || 'meeting'}</a> : <span className="text-xs nv-muted flex items-center gap-1.5"><Icon name="info" size={12} /> {joinInfo || 'In-person / no link'}</span>}<div className="flex -space-x-1.5 ml-auto">{(m.attendees || []).map((a) => <MemberAvatar key={a} userId={a} size={24} />)}</div></div>
      <div className="flex bg-[#f3f2fa] rounded-lg p-0.5 w-fit">{[['agenda', 'Agenda'], ['notes', 'Notes'], ['transcript', 'Transcript'], ['actions', `Action items (${linked.length})`]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`h-8 px-3 rounded-md text-[12px] font-semibold ${tab === k ? 'bg-white shadow-sm text-[#5b43e6]' : 'nv-muted'}`} data-testid={`meeting-tab-${k}`}>{l}</button>)}</div>
      {tab !== 'actions' ? <textarea className="nv-input min-h-[260px] font-[inherit] leading-relaxed" placeholder={tab === 'transcript' ? 'Paste or upload a transcript. Transcription via the Transcriber tool requires the AI provider to be configured.' : `Write the ${tab}…`} value={f[tab]} onChange={(e) => setF({ ...f, [tab]: e.target.value })} disabled={!canWrite} data-testid={`meeting-${tab}-input`} />
        : <div className="space-y-2" data-testid="meeting-actions">
          {canWrite && <div className="flex gap-2"><input className="nv-input h-9" placeholder="Action item → becomes a task in this Space" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} data-testid="action-item-input" /><button className="nv-btn nv-btn-primary" onClick={addTask} data-testid="action-item-add">Add task</button></div>}
          {linked.map((t) => <div key={t.id} className="flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-lg bg-[#faf9ff]"><Icon name={t.status === 'done' ? 'check-circle-2' : 'circle'} size={14} className={t.status === 'done' ? 'text-[#22b573]' : 'nv-faint'} /><span className={t.status === 'done' ? 'line-through nv-faint' : ''}>{t.title}</span></div>)}
          {!linked.length && <div className="text-xs nv-muted p-2">No action items yet. Add them here, or ask Voro to extract them from the transcript.</div>}
        </div>}
      <div className="text-[11px] nv-faint">Updated {ago(m.updated_at)} · Ask Voro: "Summarize this meeting and extract action items"</div>
    </div>
  );
}
