import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Icon } from '../lib/icons';
import { ErrorState, fmtTime, Loading, Tag } from '../lib/ui';
import { ConfirmDelete, Field, fromLocalInput, Modal, Select, toLocalInput, useCrud } from '../components/Forms';
import { PageHeader, useSpace, MemberAvatar } from './SpaceShell';

export default function Calendar() {
  const { spaceId, canWrite, space } = useSpace();
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [editing, setEditing] = useState(null);
  const events = useCrud(spaceId, 'events', 'calendar_events');
  const tasks = useCrud(spaceId, 'tasks');
  useEffect(() => { if (params.get('new')) { setEditing(blank(params.get('new') === 'meeting')); setParams({}); } }, [params, setParams]);
  const days = useMemo(() => { const start = month.startOf('week'); return [...Array(42)].map((_, i) => start.add(i, 'day')); }, [month]);
  const byDay = (d) => [...events.items.filter((e) => dayjs(e.start_at).isSame(d, 'day')).map((e) => ({ ...e, _kind: e.kind })), ...tasks.items.filter((t) => t.due_at && dayjs(t.due_at).isSame(d, 'day') && t.status !== 'done').map((t) => ({ id: `t-${t.id}`, title: t.title, start_at: t.due_at, _kind: 'task', color: 'amber' }))];
  const save = async (e) => { if (e.id) await events.update.mutateAsync(e); else await events.create.mutateAsync(e); setEditing(null); };
  return (
    <div className="fade-up" data-testid="calendar-page">
      <PageHeader icon="calendar" title="Calendar" subtitle="Events, deadlines and meetings in this Space" actions={<>
        <div className="flex items-center gap-1 nv-card px-1 h-9"><button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => setMonth(month.subtract(1, 'month'))} data-testid="calendar-prev"><Icon name="chevron-left" size={15} /></button><span className="text-[13px] font-bold w-32 text-center" data-testid="calendar-month">{month.format('MMMM YYYY')}</span><button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => setMonth(month.add(1, 'month'))} data-testid="calendar-next"><Icon name="chevron-right" size={15} /></button></div>
        <button className="nv-btn nv-btn-outline" onClick={() => setMonth(dayjs().startOf('month'))}>Today</button>
        {canWrite && <button className="nv-btn nv-btn-primary" onClick={() => setEditing(blank(false))} data-testid="calendar-new-button"><Icon name="plus" size={14} /> New Event</button>}</>} />
      <div className="px-7 pb-8">
        {events.isLoading && <Loading />}{events.error && <ErrorState error={events.error} onRetry={events.refetch} />}
        <div className="nv-card overflow-hidden">
          <div className="grid grid-cols-7 bg-[#f6f5fc] text-[11px] font-bold nv-muted uppercase tracking-wider">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="px-3 py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">{days.map((d) => { const list = byDay(d); const out = !d.isSame(month, 'month'); return (
            <div key={d} className={`min-h-[96px] border-t border-r border-[var(--nv-border)] p-1.5 ${out ? 'bg-[#fbfbfe]' : ''}`} onDoubleClick={() => canWrite && setEditing({ ...blank(false), start_at: d.hour(9).toISOString(), end_at: d.hour(10).toISOString() })} data-testid={`calendar-day-${d.format('YYYY-MM-DD')}`}>
              <div className={`text-[11.5px] font-bold w-6 h-6 grid place-items-center rounded-full ${d.isSame(dayjs(), 'day') ? 'bg-[#6e56f5] text-white' : out ? 'nv-faint' : ''}`}>{d.date()}</div>
              <div className="space-y-0.5 mt-1">{list.slice(0, 3).map((e) => <button key={e.id} onClick={() => e._kind !== 'task' && setEditing(events.items.find((x) => x.id === e.id))} className={`w-full text-left text-[10.5px] font-semibold px-1.5 py-0.5 rounded truncate tone-${e.color || 'violet'}`} data-testid="calendar-event">{fmtTime(e.start_at)} {e.title}</button>)}{list.length > 3 && <div className="text-[10px] nv-muted px-1">+{list.length - 3} more</div>}</div>
            </div>); })}</div>
        </div>
      </div>
      {editing && <EventModal ev={editing} members={space.members} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? () => { events.remove.mutate(editing.id); setEditing(null); } : null} />}
    </div>
  );
}

export const blank = (meeting) => ({ title: '', kind: meeting ? 'meeting' : 'event', start_at: dayjs().add(1, 'hour').startOf('hour').toISOString(), end_at: dayjs().add(2, 'hour').startOf('hour').toISOString(), color: meeting ? 'pink' : 'violet', attendees: [], meeting_provider: meeting ? 'zoom' : null });

export function EventModal({ ev, members, onClose, onSave, onDelete }) {
  const [f, setF] = useState({ ...ev, start_at: toLocalInput(ev.start_at), end_at: toLocalInput(ev.end_at) });
  const set = (k) => (v) => setF({ ...f, [k]: v?.target ? v.target.value : v });
  const meeting = f.kind === 'meeting';
  return (
    <Modal title={ev.id ? `Edit ${f.kind}` : meeting ? 'New meeting' : 'New event'} onClose={onClose} width={520} testId="event-modal">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ ...f, start_at: fromLocalInput(f.start_at), end_at: fromLocalInput(f.end_at), meeting_provider: meeting ? (f.meeting_provider || null) : null, project_id: f.project_id || null }); }} className="space-y-3">
        <Field label="Title"><input className="nv-input" value={f.title} onChange={set('title')} required autoFocus data-testid="event-title-input" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Starts"><input type="datetime-local" className="nv-input h-9" value={f.start_at} onChange={set('start_at')} required data-testid="event-start-input" /></Field><Field label="Ends"><input type="datetime-local" className="nv-input h-9" value={f.end_at} onChange={set('end_at')} required data-testid="event-end-input" /></Field>
          <Field label="Type"><Select value={f.kind} onChange={set('kind')} options={[['event', 'Event'], ['meeting', 'Meeting'], ['deadline', 'Deadline'], ['reminder', 'Reminder']]} testId="event-kind-select" /></Field>
          <Field label="Color"><Select value={f.color} onChange={set('color')} options={[['violet', 'Violet'], ['pink', 'Pink'], ['blue', 'Blue'], ['green', 'Green'], ['amber', 'Amber'], ['red', 'Red']]} /></Field></div>
        {meeting && <div className="grid grid-cols-2 gap-3"><Field label="Provider"><Select value={f.meeting_provider || ''} onChange={set('meeting_provider')} options={[['', 'In person / none'], ['zoom', 'Zoom'], ['google_meet', 'Google Meet'], ['teams', 'Microsoft Teams']]} testId="event-provider-select" /></Field><Field label="Meeting link"><input className="nv-input h-9" value={f.meeting_url || ''} onChange={set('meeting_url')} placeholder="Generated by the integration, or paste" data-testid="event-url-input" /></Field></div>}
        {meeting && <Field label="Agenda"><textarea className="nv-input min-h-[60px]" value={f.agenda || ''} onChange={set('agenda')} data-testid="event-agenda-input" /></Field>}
        {!meeting && <Field label="Location"><input className="nv-input h-9" value={f.location || ''} onChange={set('location')} /></Field>}
        <Field label="Attendees"><div className="flex flex-wrap gap-1.5">{(members || []).map((m) => <button type="button" key={m.user.id} onClick={() => setF({ ...f, attendees: f.attendees.includes(m.user.id) ? f.attendees.filter((x) => x !== m.user.id) : [...f.attendees, m.user.id] })} className={`nv-chip ${f.attendees.includes(m.user.id) ? '!bg-[#eeebfe] !border-[#c9bffb]' : ''}`} data-testid={`attendee-${m.user.id}`}><MemberAvatar userId={m.user.id} size={16} /> {m.user.name}</button>)}</div></Field>
        <Field label="Description"><textarea className="nv-input min-h-[50px]" value={f.description || ''} onChange={set('description')} /></Field>
        <div className="flex items-center justify-between pt-2">{onDelete ? <ConfirmDelete onConfirm={onDelete} testId="event-delete" /> : <span />}<div className="flex gap-2"><button type="button" className="nv-btn nv-btn-outline" onClick={onClose}>Cancel</button><button className="nv-btn nv-btn-primary" data-testid="event-save">{ev.id ? 'Save' : 'Create'}</button></div></div>
      </form>
    </Modal>
  );
}
