import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ago, dueLabel, Empty, ErrorState, Loading, Tag } from '../lib/ui';
import { ConfirmDelete, Field, fromLocalInput, Modal, Select, toLocalInput } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

/* Generic module engine for library modules (Courses, Habits, Goals, Bookmarks, Flashcards, ...). Real persistence via /records. */
export default function Records() {
  const { spaceId, canWrite, space } = useSpace();
  const { capKey } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const qk = ['records', spaceId, capKey];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk, queryFn: () => api.get(`/spaces/${spaceId}/records/${capKey}`).then((r) => r.data) });
  const inval = () => qc.invalidateQueries({ queryKey: qk });
  const save = useMutation({ mutationFn: (r) => (r.id ? api.patch(`/spaces/${spaceId}/records/${capKey}/${r.id}`, r) : api.post(`/spaces/${spaceId}/records/${capKey}`, r)), onSuccess: () => { inval(); setEditing(null); }, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id) => api.delete(`/spaces/${spaceId}/records/${capKey}/${id}`), onSuccess: () => { inval(); setEditing(null); } });
  const enabled = space.enabled_capabilities.includes(capKey);
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const cap = data.capability || { name: capKey, icon: 'box', description: '' };
  const items = data.items.filter((r) => filter === 'all' || r.status === filter);
  const isCards = ['flashcards', 'formula_sheet', 'bookmarks', 'sources', 'mind_maps', 'whiteboards'].includes(capKey);
  return (
    <div className="fade-up" data-testid={`records-page-${capKey}`}>
      <PageHeader icon={cap.icon} title={cap.name} subtitle={cap.description} actions={<>
        <div className="flex bg-[#f3f2fa] rounded-lg p-0.5">{[['all', 'All'], ['active', 'Active'], ['done', 'Done']].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`h-8 px-3 rounded-md text-[12px] font-semibold ${filter === k ? 'bg-white shadow-sm text-[#5b43e6]' : 'nv-muted'}`} data-testid={`records-filter-${k}`}>{l}</button>)}</div>
        {canWrite && enabled && <button className="nv-btn nv-btn-primary" onClick={() => setEditing({ title: '', status: 'active', fields: {} })} data-testid="records-new-button"><Icon name="plus" size={14} /> New</button>}</>} />
      <div className="px-7 pb-8">
        {!enabled && <ErrorState error={{ code: 'FORBIDDEN', message: `${cap.name} is not enabled in this Space. Add it from the Space Library.` }} />}
        {enabled && !items.length && <Empty icon={cap.icon} title={`No ${cap.name.toLowerCase()} yet`} hint={cap.description} action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => setEditing({ title: '', status: 'active', fields: {} })} data-testid="records-empty-new">Add the first one</button>} />}
        {isCards ? <div className="grid grid-cols-3 gap-4">{items.map((r) => <button key={r.id} className="nv-card p-4 text-left hover:border-[#c9bffb] min-h-[120px]" onClick={() => setEditing(r)} data-testid="record-card"><div className="font-bold text-[14px]">{r.title}</div>{r.body && <div className="text-xs nv-muted mt-1 line-clamp-3">{r.body}</div>}<div className="flex flex-wrap gap-1.5 mt-3">{Object.entries(r.fields || {}).filter(([, v]) => v).map(([k, v]) => <Tag key={k} tone="violet">{k}: {String(v).slice(0, 30)}</Tag>)}</div></button>)}</div>
          : <div className="nv-card divide-y divide-[var(--nv-border)]">{items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf9ff]" data-testid="record-row">
              {canWrite && <button onClick={() => save.mutate({ id: r.id, status: r.status === 'done' ? 'active' : 'done' })} className={`w-[18px] h-[18px] rounded-md border-2 grid place-items-center ${r.status === 'done' ? 'bg-[#6e56f5] border-[#6e56f5] text-white' : 'border-[#c8c6d8]'}`} data-testid="record-toggle">{r.status === 'done' && <Icon name="check" size={11} />}</button>}
              <button className="flex-1 text-left min-w-0" onClick={() => setEditing(r)}><div className={`text-[13.5px] font-semibold truncate ${r.status === 'done' ? 'line-through nv-faint' : ''}`}>{r.title}</div>{r.body && <div className="text-[11.5px] nv-muted truncate">{r.body}</div>}</button>
              {Object.entries(r.fields || {}).filter(([, v]) => v).slice(0, 3).map(([k, v]) => <Tag key={k} tone="blue">{k}: {String(v).slice(0, 20)}</Tag>)}
              <span className="text-[11px] nv-muted w-20 text-right">{r.due_at ? dueLabel(r.due_at) : ago(r.updated_at)}</span>
            </div>))}</div>}
      </div>
      {editing && <RecordModal r={editing} cap={cap} onClose={() => setEditing(null)} onSave={(r) => save.mutate(r)} onDelete={editing.id ? () => remove.mutate(editing.id) : null} canWrite={canWrite} />}
    </div>
  );
}

function RecordModal({ r, cap, onClose, onSave, onDelete, canWrite }) {
  const [f, setF] = useState({ ...r, due_at: toLocalInput(r.due_at), fields: { ...(r.fields || {}) } });
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  return (
    <Modal title={r.id ? `Edit ${cap.name.replace(/s$/, '').toLowerCase()}` : `New in ${cap.name}`} onClose={onClose} testId="record-modal">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ ...f, due_at: fromLocalInput(f.due_at) }); }} className="space-y-3">
        <Field label="Title"><input className="nv-input" value={f.title} onChange={set('title')} required autoFocus disabled={!canWrite} data-testid="record-title-input" /></Field>
        <Field label={cap.key === 'flashcards' ? 'Back / answer' : 'Details'}><textarea className="nv-input min-h-[80px]" value={f.body || ''} onChange={set('body')} data-testid="record-body-input" /></Field>
        {cap.fields?.length > 0 && <div className="grid grid-cols-2 gap-3">{cap.fields.map((k) => <Field key={k} label={k.replace('_', ' ')}><input className="nv-input h-9" value={f.fields[k] || ''} onChange={(e) => setF({ ...f, fields: { ...f.fields, [k]: e.target.value } })} data-testid={`record-field-${k}`} /></Field>)}</div>}
        <div className="grid grid-cols-2 gap-3"><Field label="Status"><Select value={f.status} onChange={set('status')} options={[['active', 'Active'], ['done', 'Done'], ['archived', 'Archived']]} testId="record-status-select" /></Field><Field label="Due / date"><input type="datetime-local" className="nv-input h-9" value={f.due_at} onChange={set('due_at')} data-testid="record-due-input" /></Field></div>
        <div className="flex items-center justify-between pt-2">{onDelete && canWrite ? <ConfirmDelete onConfirm={onDelete} testId="record-delete" /> : <span />}<div className="flex gap-2"><button type="button" className="nv-btn nv-btn-outline" onClick={onClose}>Cancel</button>{canWrite && <button className="nv-btn nv-btn-primary" data-testid="record-save">{r.id ? 'Save' : 'Create'}</button>}</div></div>
      </form>
    </Modal>
  );
}
