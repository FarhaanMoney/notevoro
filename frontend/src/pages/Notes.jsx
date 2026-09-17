import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../lib/icons';
import { ago, Empty, ErrorState, Loading, Tag } from '../lib/ui';
import { useCrud } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';
import { renderMarkdown } from './Documents';
import SendComposer from '../components/SendComposer';

export default function Notes() {
  const { spaceId, canWrite } = useSpace();
  const { noteId } = useParams();
  const nav = useNavigate();
  const notes = useCrud(spaceId, 'notes');
  const [q, setQ] = useState('');
  const base = `/dashboard/spaces/${spaceId}/notes`;
  const current = notes.items.find((n) => n.id === noteId);
  const createNote = async () => { const n = await notes.create.mutateAsync({ title: 'Untitled note' }); nav(`${base}/${n.id}`); };
  const list = notes.items.filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || (n.content || '').toLowerCase().includes(q.toLowerCase()) || (n.tags || []).some((t) => t.includes(q.toLowerCase())));
  const backlinks = current ? notes.items.filter((n) => n.id !== current.id && (n.content || '').includes(`[[${current.title}]]`)) : [];
  return (
    <div className="flex" style={{ height: 'calc(100vh - var(--header-h))' }} data-testid="notes-page">
      <div className="w-[300px] shrink-0 border-r border-[var(--nv-border)] flex flex-col">
        <div className="p-4 flex items-center justify-between"><h1 className="text-[18px] font-extrabold">Notes</h1>{canWrite && <button className="nv-btn nv-btn-soft w-9 px-0" onClick={createNote} aria-label="New note" data-testid="notes-new-button"><Icon name="plus" size={16} /></button>}</div>
        <div className="px-4"><input className="nv-input h-9" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="notes-search-input" /></div>
        <div className="flex-1 overflow-auto nv-scroll p-2 mt-2">
          {notes.isLoading && <Loading />}{notes.error && <ErrorState error={notes.error} onRetry={notes.refetch} compact />}
          {!notes.isLoading && !list.length && <Empty icon="file-text" title="No notes yet" hint="Fast, linkable notes. Use [[Note title]] to link." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={createNote} data-testid="notes-empty-new">Write a note</button>} />}
          {list.map((n) => <button key={n.id} onClick={() => nav(`${base}/${n.id}`)} className={`w-full text-left p-3 rounded-xl mb-1 ${n.id === noteId ? 'bg-[#eeebfe]' : 'hover:bg-[#f7f6fd]'}`} data-testid={`note-item-${n.id}`}><div className="flex items-center gap-2">{n.pinned && <Icon name="pin" size={11} className="text-[#6e56f5]" />}<span className="text-[13px] font-bold truncate">{n.title || 'Untitled'}</span></div><div className="text-[11.5px] nv-muted truncate mt-0.5">{(n.content || '').slice(0, 80) || 'Empty note'}</div><div className="flex items-center gap-1.5 mt-1.5">{(n.tags || []).slice(0, 2).map((t) => <Tag key={t} tone="blue">{t}</Tag>)}<span className="text-[10px] nv-faint ml-auto">{ago(n.updated_at)}</span></div></button>)}
        </div>
      </div>
      {current ? <NoteEditor key={current.id} note={current} notes={notes} canWrite={canWrite} backlinks={backlinks} onOpen={(id) => nav(`${base}/${id}`)} onDelete={() => { notes.remove.mutate(current.id); nav(base); }} />
        : <div className="flex-1 grid place-items-center"><Empty icon="file-text" title="Select a note" hint="Or create a new one. Notes autosave as you type." /></div>}
    </div>
  );
}

export function useAutosave(value, save, delay = 700) {
  const [state, setState] = useState('saved');
  const first = useRef(true);
  const timer = useRef();
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { try { await save(value); setState('saved'); } catch { setState('error'); } }, delay);
    return () => clearTimeout(timer.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export function SaveState({ state }) {
  return <span className={`text-[11px] flex items-center gap-1 ${state === 'error' ? 'text-[#ee5a5a]' : 'nv-muted'}`} data-testid="save-state">{state === 'saving' ? <><Icon name="loader-2" size={11} className="spin" /> Saving…</> : state === 'error' ? <><Icon name="alert-circle" size={11} /> Not saved — retrying on next edit</> : <><Icon name="check" size={11} className="text-[#22b573]" /> Saved</>}</span>;
}

function NoteEditor({ note, notes, canWrite, backlinks, onOpen, onDelete }) {
  const { spaceId } = useSpace();
  const [f, setF] = useState({ title: note.title, content: note.content || '', tags: (note.tags || []).join(', ') });
  const [preview, setPreview] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const state = useAutosave(f, (v) => notes.update.mutateAsync({ id: note.id, title: v.title, content: v.content, tags: v.tags.split(',').map((s) => s.trim()).filter(Boolean) }));
  const links = [...(f.content.matchAll(/\[\[([^\]]+)\]\]/g))].map((m) => m[1]);
  return (
    <div className="flex-1 flex flex-col min-w-0" data-testid="note-editor">
      <div className="px-8 pt-6 flex items-center gap-3"><input className="flex-1 text-[24px] font-extrabold tracking-tight outline-none bg-transparent" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} disabled={!canWrite} data-testid="note-title-input" /><SaveState state={state} />
        <button className={`nv-btn nv-btn-ghost w-8 px-0 ${note.pinned ? 'text-[#6e56f5]' : ''}`} onClick={() => notes.update.mutate({ id: note.id, pinned: !note.pinned })} aria-label="Pin" data-testid="note-pin"><Icon name="pin" size={15} /></button>
        <button className={`nv-btn nv-btn-ghost w-8 px-0 ${preview ? 'text-[#6e56f5]' : ''}`} onClick={() => setPreview(!preview)} aria-label="Preview" data-testid="note-preview"><Icon name="eye" size={15} /></button>
        <button className="nv-btn nv-btn-soft h-8 px-2.5" onClick={() => setSendOpen(true)} aria-label="Send" data-testid="note-send"><Icon name="send" size={13} /> Send</button>
        {canWrite && <button className="nv-btn nv-btn-ghost w-8 px-0 text-[#ee5a5a]" onClick={() => window.confirm('Delete this note?') && onDelete()} aria-label="Delete" data-testid="note-delete"><Icon name="trash-2" size={15} /></button>}</div>
      <div className="px-8 mt-1 flex items-center gap-2 text-xs nv-muted"><Icon name="tag" size={12} /><input className="bg-transparent outline-none flex-1" placeholder="Add tags, comma separated" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} disabled={!canWrite} data-testid="note-tags-input" /><span>Edited {ago(note.updated_at)}</span></div>
      <div className="flex-1 min-h-0 flex">
        {preview ? <div className="flex-1 overflow-auto nv-scroll px-8 py-4 prose-nv" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.content) }} data-testid="note-preview-body" />
          : <textarea className="flex-1 resize-none outline-none bg-transparent px-8 py-4 text-[14.5px] leading-relaxed nv-scroll" placeholder="Start writing… Markdown supported. Link notes with [[Title]]." value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} disabled={!canWrite} data-testid="note-content-input" />}
        {(links.length > 0 || backlinks.length > 0) && <aside className="w-[220px] border-l border-[var(--nv-border)] p-4 text-xs space-y-4" data-testid="note-links-panel">
          {links.length > 0 && <div><div className="nv-eyebrow mb-2">Links</div>{links.map((l) => { const t = notes.items.find((n) => n.title === l); return <button key={l} className="block text-left nv-link mb-1" onClick={() => t && onOpen(t.id)}>{l}{!t && <span className="nv-faint"> (new)</span>}</button>; })}</div>}
          {backlinks.length > 0 && <div><div className="nv-eyebrow mb-2">Backlinks</div>{backlinks.map((b) => <button key={b.id} className="block text-left nv-link mb-1" onClick={() => onOpen(b.id)}>{b.title}</button>)}</div>}
        </aside>}
      </div>
      <SendComposer open={sendOpen} onClose={() => setSendOpen(false)} presetSpaceId={spaceId} lockSourceSpace object={{ type: 'note', id: note.id, title: f.title }} />
    </div>
  );
}
