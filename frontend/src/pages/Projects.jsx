import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import { ago, dueLabel, Empty, ErrorState, Loading, Tag } from '../lib/ui';
import { ACCENTS } from '../lib/icons';
import { ConfirmDelete, Field, fromLocalInput, Modal, Select, toLocalInput, useCrud } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

export default function Projects() {
  const { spaceId, canWrite } = useSpace();
  const { projectId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [editing, setEditing] = useState(null);
  const projects = useCrud(spaceId, 'projects');
  const tasks = useCrud(spaceId, 'tasks');
  const docs = useCrud(spaceId, 'documents');
  const events = useCrud(spaceId, 'events', 'calendar_events');
  useEffect(() => { if (params.get('new')) { setEditing({ name: '', status: 'active', color: 'violet' }); setParams({}); } }, [params, setParams]);
  const base = `/dashboard/spaces/${spaceId}`;
  const save = async (p) => { if (p.id) await projects.update.mutateAsync(p); else await projects.create.mutateAsync(p); setEditing(null); };
  const current = projects.items.find((p) => p.id === projectId);
  if (current) {
    const pt = tasks.items.filter((t) => t.project_id === current.id); const done = pt.filter((t) => t.status === 'done').length;
    const pd = docs.items.filter((d) => d.project_id === current.id); const pe = events.items.filter((e) => e.project_id === current.id);
    return (
      <div className="fade-up" data-testid="project-detail">
        <PageHeader title={current.name} subtitle={current.description || 'Project overview'} actions={<><button className="nv-btn nv-btn-outline" onClick={() => nav(`${base}/projects`)} data-testid="project-back"><Icon name="arrow-left" size={14} /> All projects</button>{canWrite && <button className="nv-btn nv-btn-soft" onClick={() => setEditing(current)} data-testid="project-edit">Edit</button>}</>}>
          <div className="flex items-center gap-3 mt-3"><div className="h-2 w-64 bg-[#f0eefa] rounded-full overflow-hidden"><div className={`h-full bg-${current.color}`} style={{ width: `${pt.length ? (done / pt.length) * 100 : 0}%` }} /></div><span className="text-xs nv-muted">{done}/{pt.length} tasks done</span><Tag tone={current.status === 'active' ? 'green' : 'slate'}>{current.status}</Tag>{current.due_at && <span className="text-xs nv-muted">Due {dueLabel(current.due_at)}</span>}</div>
        </PageHeader>
        <div className="px-7 pb-8 grid grid-cols-3 gap-4">
          <Section title="Tasks" icon="check-square" onAdd={() => nav(`${base}/tasks?new=1`)} onAll={() => nav(`${base}/tasks`)}>{pt.map((t) => <Row key={t.id} title={t.title} sub={dueLabel(t.due_at)} done={t.status === 'done'} onClick={() => nav(`${base}/tasks`)} />)}{!pt.length && <Hint>No tasks linked. Set the project on a task.</Hint>}</Section>
          <Section title="Documents" icon="file" onAdd={() => nav(`${base}/documents`)} onAll={() => nav(`${base}/documents`)}>{pd.map((d) => <Row key={d.id} title={d.title} sub={`v${d.version} · ${ago(d.updated_at)}`} onClick={() => nav(`${base}/documents/${d.id}`)} />)}{!pd.length && <Hint>No documents linked yet.</Hint>}</Section>
          <Section title="Meetings & events" icon="calendar" onAdd={() => nav(`${base}/calendar?new=event`)} onAll={() => nav(`${base}/calendar`)}>{pe.map((e) => <Row key={e.id} title={e.title} sub={dueLabel(e.start_at)} onClick={() => nav(`${base}/calendar`)} />)}{!pe.length && <Hint>No events linked yet.</Hint>}</Section>
        </div>
        {editing && <ProjectModal p={editing} onClose={() => setEditing(null)} onSave={save} onDelete={() => { projects.remove.mutate(editing.id); setEditing(null); nav(`${base}/projects`); }} />}
      </div>
    );
  }
  return (
    <div className="fade-up" data-testid="projects-page">
      <PageHeader icon="layers" title="Projects" subtitle={`${projects.items.filter((p) => p.status === 'active').length} active`} actions={canWrite && <button className="nv-btn nv-btn-primary" onClick={() => setEditing({ name: '', status: 'active', color: 'violet' })} data-testid="projects-new-button"><Icon name="plus" size={14} /> New Project</button>} />
      <div className="px-7 pb-8">
        {projects.isLoading && <Loading />}{projects.error && <ErrorState error={projects.error} onRetry={projects.refetch} />}
        {!projects.isLoading && !projects.items.length && <Empty icon="layers" title="No projects yet" hint="Projects tie tasks, documents, meetings and goals together." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => setEditing({ name: '', status: 'active', color: 'violet' })} data-testid="projects-empty-new">Create a project</button>} />}
        <div className="grid grid-cols-3 gap-4">{projects.items.map((p) => { const pt = tasks.items.filter((t) => t.project_id === p.id); const done = pt.filter((t) => t.status === 'done').length; return (
          <button key={p.id} className="nv-card p-4 text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(`${base}/projects/${p.id}`)} data-testid={`project-card-${p.id}`}>
            <div className="flex items-start justify-between"><div className={`stat-icon bg-${p.color} text-white`}><Icon name="layers" size={17} /></div><Tag tone={p.status === 'active' ? 'green' : p.status === 'completed' ? 'violet' : 'slate'}>{p.status}</Tag></div>
            <div className="font-bold text-[15px] mt-3 truncate">{p.name}</div><div className="text-xs nv-muted mt-0.5 line-clamp-2 min-h-[16px]">{p.description}</div>
            <div className="mt-4 h-1.5 bg-[#f0eefa] rounded-full overflow-hidden"><div className={`h-full bg-${p.color}`} style={{ width: `${pt.length ? (done / pt.length) * 100 : 0}%` }} /></div>
            <div className="flex justify-between text-[11px] nv-muted mt-2"><span>{done}/{pt.length} tasks</span><span>{p.due_at ? `Due ${dueLabel(p.due_at)}` : `Updated ${ago(p.updated_at)}`}</span></div>
          </button>); })}</div>
      </div>
      {editing && <ProjectModal p={editing} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? () => { projects.remove.mutate(editing.id); setEditing(null); } : null} />}
    </div>
  );
}

function Section({ title, icon, children, onAdd, onAll }) { return <div className="nv-card p-4"><div className="flex items-center justify-between mb-3"><div className="nv-h2 flex items-center gap-2"><Icon name={icon} size={15} className="text-[#6e56f5]" /> {title}</div><div className="flex gap-1"><button className="nv-btn nv-btn-ghost nv-btn-sm" onClick={onAdd}><Icon name="plus" size={13} /></button><button className="nv-link" onClick={onAll}>All</button></div></div><div className="space-y-1">{children}</div></div>; }
function Row({ title, sub, done, onClick }) { return <button className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#faf9ff] flex items-center gap-2" onClick={onClick}><span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-[#22b573]' : 'bg-[#c8c6d8]'}`} /><span className={`text-[13px] font-semibold flex-1 truncate ${done ? 'line-through nv-faint' : ''}`}>{title}</span><span className="text-[11px] nv-muted">{sub}</span></button>; }
function Hint({ children }) { return <div className="text-xs nv-muted px-2 py-3">{children}</div>; }

function ProjectModal({ p, onClose, onSave, onDelete }) {
  const [f, setF] = useState({ ...p, due_at: toLocalInput(p.due_at) });
  const set = (k) => (v) => setF({ ...f, [k]: v?.target ? v.target.value : v });
  return (
    <Modal title={p.id ? 'Edit project' : 'New project'} onClose={onClose} testId="project-modal">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ ...f, due_at: fromLocalInput(f.due_at) }); }} className="space-y-3">
        <Field label="Name"><input className="nv-input" value={f.name} onChange={set('name')} required autoFocus data-testid="project-name-input" /></Field>
        <Field label="Description"><textarea className="nv-input min-h-[70px]" value={f.description || ''} onChange={set('description')} data-testid="project-description-input" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Status"><Select value={f.status} onChange={set('status')} options={[['active', 'Active'], ['on_hold', 'On hold'], ['completed', 'Completed'], ['archived', 'Archived']]} testId="project-status-select" /></Field><Field label="Due"><input type="datetime-local" className="nv-input h-9" value={f.due_at} onChange={set('due_at')} data-testid="project-due-input" /></Field></div>
        <Field label="Color"><div className="flex gap-2">{ACCENTS.map((a) => <button type="button" key={a} onClick={() => setF({ ...f, color: a })} className={`w-7 h-7 rounded-full bg-${a} ${f.color === a ? 'ring-2 ring-offset-2 ring-[#6e56f5]' : ''}`} aria-label={a} />)}</div></Field>
        <div className="flex items-center justify-between pt-2">{onDelete ? <ConfirmDelete onConfirm={onDelete} testId="project-delete" /> : <span />}<div className="flex gap-2"><button type="button" className="nv-btn nv-btn-outline" onClick={onClose}>Cancel</button><button className="nv-btn nv-btn-primary" data-testid="project-save">{p.id ? 'Save' : 'Create'}</button></div></div>
      </form>
    </Modal>
  );
}
