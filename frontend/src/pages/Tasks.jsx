import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Icon } from '../lib/icons';
import { dueLabel, Empty, ErrorState, Loading, priorityTone, Tag } from '../lib/ui';
import { ConfirmDelete, Field, fromLocalInput, Modal, Select, toLocalInput, useCrud } from '../components/Forms';
import { PageHeader, useSpace, MemberAvatar } from './SpaceShell';

const STATUSES = [['todo', 'To do', 'slate'], ['in_progress', 'In progress', 'amber'], ['done', 'Done', 'green']];
const VIEWS = [['list', 'List', 'list'], ['board', 'Board', 'kanban'], ['table', 'Table', 'table-2'], ['timeline', 'Timeline', 'gantt-chart']];

export default function Tasks({ view: initial = 'list' }) {
  const { spaceId, space, canWrite } = useSpace();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const tasks = useCrud(spaceId, 'tasks');
  const projects = useCrud(spaceId, 'projects');
  useEffect(() => { setView(initial); }, [initial]);
  useEffect(() => { if (params.get('new')) { setEditing({ title: params.get('title') || '', priority: 'medium', status: 'todo' }); setParams({}); } }, [params, setParams]);
  const items = useMemo(() => tasks.items.filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase())), [tasks.items, q]);
  const save = async (t) => { if (t.id) await tasks.update.mutateAsync(t); else await tasks.create.mutateAsync(t); setEditing(null); };
  const toggle = (t) => tasks.update.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' });
  const enabledViews = VIEWS.filter(([k]) => k === 'list' || space.enabled_capabilities.includes(k === 'table' ? 'table_view' : k));
  return (
    <div className="fade-up" data-testid="tasks-page">
      <PageHeader icon="check-square" title="Tasks" subtitle={`${tasks.items.filter((t) => t.status !== 'done').length} open · ${tasks.items.length} total`} actions={<>
        <input className="nv-input h-9 w-48" placeholder="Filter tasks…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="tasks-filter-input" />
        <div className="flex bg-[#f3f2fa] rounded-lg p-0.5">{enabledViews.map(([k, l, ic]) => <button key={k} onClick={() => setView(k)} className={`h-8 px-2.5 rounded-md text-[12px] font-semibold flex items-center gap-1.5 ${view === k ? 'bg-white shadow-sm text-[#5b43e6]' : 'nv-muted'}`} data-testid={`tasks-view-${k}`}><Icon name={ic} size={13} /> {l}</button>)}</div>
        {canWrite && <button className="nv-btn nv-btn-primary" onClick={() => setEditing({ title: '', priority: 'medium', status: 'todo' })} data-testid="tasks-new-button"><Icon name="plus" size={14} /> New Task</button>}</>} />
      <div className="px-7 pb-8">
        {tasks.isLoading && <Loading />}{tasks.error && <ErrorState error={tasks.error} onRetry={tasks.refetch} />}
        {!tasks.isLoading && !items.length && <Empty icon="check-square" title="No tasks yet" hint="Capture what needs doing. Voro can also turn intent into tasks." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => setEditing({ title: '', priority: 'medium', status: 'todo' })} data-testid="tasks-empty-new">Create a task</button>} />}
        {items.length > 0 && view === 'list' && <div className="nv-card divide-y divide-[var(--nv-border)]">{items.map((t) => <TaskRow key={t.id} t={t} onToggle={toggle} onOpen={() => setEditing(t)} projects={projects.items} />)}</div>}
        {items.length > 0 && view === 'board' && <div className="grid grid-cols-3 gap-4">{STATUSES.map(([s, l, tone]) => <div key={s} className="bg-[#f6f5fc] rounded-2xl p-3 min-h-[300px]" data-testid={`board-column-${s}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('id'); if (id) tasks.update.mutate({ id, status: s }); }}>
          <div className="flex items-center justify-between px-1 mb-3"><div className="flex items-center gap-2 text-[12.5px] font-bold"><span className={`w-2 h-2 rounded-full bg-${tone === 'slate' ? 'slate' : tone}`} /> {l}</div><span className="text-[11px] nv-muted">{items.filter((t) => t.status === s).length}</span></div>
          <div className="space-y-2">{items.filter((t) => t.status === s).map((t) => <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('id', t.id)} onClick={() => setEditing(t)} className="nv-card p-3 cursor-pointer hover:border-[#c9bffb]" data-testid="board-card"><div className="text-[13px] font-semibold">{t.title}</div><div className="flex items-center gap-1.5 mt-2"><Tag tone={priorityTone(t.priority)}>{t.priority}</Tag>{t.due_at && <span className="text-[11px] nv-muted">{dueLabel(t.due_at)}</span>}{t.assignee_id && <span className="ml-auto"><MemberAvatar userId={t.assignee_id} size={20} /></span>}</div></div>)}</div></div>)}</div>}
        {items.length > 0 && view === 'table' && <div className="nv-card overflow-hidden"><table className="w-full text-[13px]"><thead className="bg-[#f6f5fc] text-[11px] uppercase tracking-wider nv-muted"><tr>{['Task', 'Status', 'Priority', 'Project', 'Due', 'Assignee'].map((h) => <th key={h} className="text-left font-bold px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[var(--nv-border)]">{items.map((t) => <tr key={t.id} className="hover:bg-[#faf9ff] cursor-pointer" onClick={() => setEditing(t)} data-testid="table-row"><td className="px-4 py-2.5 font-semibold">{t.title}</td><td className="px-4 py-2.5"><Tag tone={STATUSES.find(([s]) => s === t.status)?.[2]}>{STATUSES.find(([s]) => s === t.status)?.[1]}</Tag></td><td className="px-4 py-2.5"><Tag tone={priorityTone(t.priority)}>{t.priority}</Tag></td><td className="px-4 py-2.5 nv-muted">{projects.items.find((p) => p.id === t.project_id)?.name || '—'}</td><td className="px-4 py-2.5 nv-muted">{dueLabel(t.due_at) || '—'}</td><td className="px-4 py-2.5">{t.assignee_id ? <MemberAvatar userId={t.assignee_id} size={22} /> : '—'}</td></tr>)}</tbody></table></div>}
        {items.length > 0 && view === 'timeline' && <Timeline items={items} onOpen={setEditing} />}
      </div>
      {editing && <TaskModal task={editing} projects={projects.items} members={space.members} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? () => { tasks.remove.mutate(editing.id); setEditing(null); } : null} canWrite={canWrite} />}
    </div>
  );
}

function TaskRow({ t, onToggle, onOpen, projects }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf9ff]" data-testid="task-row">
      <button onClick={() => onToggle(t)} className={`w-[18px] h-[18px] rounded-md border-2 grid place-items-center shrink-0 ${t.status === 'done' ? 'bg-[#6e56f5] border-[#6e56f5] text-white' : 'border-[#c8c6d8] hover:border-[#6e56f5]'}`} data-testid="task-toggle">{t.status === 'done' && <Icon name="check" size={11} />}</button>
      <button className="flex-1 min-w-0 text-left" onClick={onOpen} data-testid="task-open"><div className={`text-[13.5px] font-semibold truncate ${t.status === 'done' ? 'line-through nv-faint' : ''}`}>{t.title}</div>{t.description && <div className="text-[11.5px] nv-muted truncate">{t.description}</div>}</button>
      {t.project_id && <span className="text-[11px] nv-muted">{projects.find((p) => p.id === t.project_id)?.name}</span>}
      {(t.tags || []).slice(0, 2).map((g) => <Tag key={g} tone="blue">{g}</Tag>)}
      <Tag tone={priorityTone(t.priority)}>{t.priority}</Tag>
      {t.status === 'in_progress' && <Tag tone="amber">In progress</Tag>}
      <span className="text-[11.5px] nv-muted w-20 text-right">{dueLabel(t.due_at)}</span>
      {t.assignee_id && <MemberAvatar userId={t.assignee_id} size={22} />}
    </div>
  );
}

function Timeline({ items, onOpen }) {
  const start = dayjs().startOf('day').subtract(2, 'day');
  const days = [...Array(21)].map((_, i) => start.add(i, 'day'));
  return (
    <div className="nv-card overflow-auto nv-scroll" data-testid="timeline-view">
      <div className="grid" style={{ gridTemplateColumns: `220px repeat(21, minmax(44px, 1fr))` }}>
        <div className="sticky left-0 bg-white border-b border-r border-[var(--nv-border)] px-3 py-2 text-[11px] font-bold nv-muted">TASK</div>
        {days.map((d) => <div key={d} className={`border-b border-[var(--nv-border)] text-center py-2 text-[10.5px] font-bold ${d.isSame(dayjs(), 'day') ? 'text-[#6e56f5]' : 'nv-muted'}`}>{d.format('D')}<div className="text-[9px] font-medium">{d.format('dd')}</div></div>)}
        {items.map((t) => { const end = t.due_at ? dayjs(t.due_at) : dayjs(t.created_at).add(3, 'day'); const s = dayjs(t.created_at).isBefore(start) ? start : dayjs(t.created_at).startOf('day'); const col = Math.max(0, s.diff(start, 'day')) + 2; const span = Math.max(1, Math.min(21 - col + 2, end.diff(s, 'day') + 1)); return (
          <div key={t.id} className="contents"><button className="sticky left-0 bg-white border-r border-b border-[var(--nv-border)] px-3 py-2 text-left text-[12.5px] font-semibold truncate" onClick={() => onOpen(t)}>{t.title}</button>
            <div className="border-b border-[var(--nv-border)] relative h-9" style={{ gridColumn: `2 / span 21` }}><div className={`absolute top-2 h-5 rounded-md bg-${priorityTone(t.priority)} opacity-80`} style={{ left: `${((col - 2) / 21) * 100}%`, width: `${(span / 21) * 100}%` }} /></div></div>); })}
      </div>
    </div>
  );
}

function TaskModal({ task, projects, members, onClose, onSave, onDelete, canWrite }) {
  const [f, setF] = useState({ ...task, due_at: toLocalInput(task.due_at), tags: (task.tags || []).join(', ') });
  const set = (k) => (v) => setF({ ...f, [k]: v?.target ? v.target.value : v });
  const submit = (e) => { e.preventDefault(); onSave({ ...f, due_at: fromLocalInput(f.due_at), tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean), project_id: f.project_id || null, assignee_id: f.assignee_id || null }); };
  return (
    <Modal title={task.id ? 'Edit task' : 'New task'} onClose={onClose} testId="task-modal">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><input className="nv-input" value={f.title} onChange={set('title')} required autoFocus disabled={!canWrite} data-testid="task-title-input" /></Field>
        <Field label="Description"><textarea className="nv-input min-h-[70px]" value={f.description || ''} onChange={set('description')} data-testid="task-description-input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><Select value={f.status} onChange={set('status')} options={STATUSES.map(([v, l]) => [v, l])} testId="task-status-select" /></Field>
          <Field label="Priority"><Select value={f.priority} onChange={set('priority')} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]} testId="task-priority-select" /></Field>
          <Field label="Due"><input type="datetime-local" className="nv-input h-9" value={f.due_at} onChange={set('due_at')} data-testid="task-due-input" /></Field>
          <Field label="Project"><Select value={f.project_id || ''} onChange={set('project_id')} options={[['', 'None'], ...projects.map((p) => [p.id, p.name])]} testId="task-project-select" /></Field>
          <Field label="Assignee"><Select value={f.assignee_id || ''} onChange={set('assignee_id')} options={[['', 'Unassigned'], ...(members || []).map((m) => [m.user.id, m.user.name])]} testId="task-assignee-select" /></Field>
          <Field label="Tags"><input className="nv-input h-9" value={f.tags} onChange={set('tags')} placeholder="Backend, Design" data-testid="task-tags-input" /></Field>
        </div>
        <div className="flex items-center justify-between pt-2">{onDelete && canWrite ? <ConfirmDelete onConfirm={onDelete} testId="task-delete" /> : <span />}<div className="flex gap-2"><button type="button" className="nv-btn nv-btn-outline" onClick={onClose}>Cancel</button>{canWrite && <button className="nv-btn nv-btn-primary" data-testid="task-save">{task.id ? 'Save' : 'Create'}</button>}</div></div>
      </form>
    </Modal>
  );
}
