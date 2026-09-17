import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon } from '../lib/icons';
import { ago, Empty, ErrorState, Loading } from '../lib/ui';
import { Field, Select, useCrud } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';
import { SaveState, useAutosave } from './Notes';
import CollaborativeDocEditor, { CollabStatusPill } from '../components/CollaborativeDocEditor';
import SendComposer from '../components/SendComposer';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function renderMarkdown(md = '') {
  const lines = esc(md).split('\n'); const out = []; let inCode = false; let list = null;
  const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[\[([^\]]+)\]\]/g, '<a class="nv-link">$1</a>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a class="nv-link" href="$2" target="_blank" rel="noreferrer">$1</a>');
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    if (raw.startsWith('```')) { closeList(); inCode = !inCode; out.push(inCode ? '<pre>' : '</pre>'); continue; }
    if (inCode) { out.push(raw + '\n'); continue; }
    const h = raw.match(/^(#{1,3})\s+(.*)/); if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*[-*]\s+\[[ x]\]/.test(raw)) { if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); } const done = /\[x\]/i.test(raw); out.push(`<li style="list-style:none;margin-left:-16px">${done ? '☑' : '☐'} ${inline(raw.replace(/^\s*[-*]\s+\[[ x]\]\s*/i, ''))}</li>`); continue; }
    if (/^\s*[-*]\s+/.test(raw)) { if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); } out.push(`<li>${inline(raw.replace(/^\s*[-*]\s+/, ''))}</li>`); continue; }
    if (/^\s*\d+\.\s+/.test(raw)) { if (list !== 'ol') { closeList(); list = 'ol'; out.push('<ol>'); } out.push(`<li>${inline(raw.replace(/^\s*\d+\.\s+/, ''))}</li>`); continue; }
    closeList();
    if (raw.startsWith('>')) { out.push(`<blockquote>${inline(raw.slice(1).trim())}</blockquote>`); continue; }
    if (raw.startsWith('|')) { const cells = raw.split('|').filter((_, i, a) => i > 0 && i < a.length - 1); if (/^\|[\s:-]+\|/.test(raw)) continue; out.push(`<table><tr>${cells.map((c) => `<td>${inline(c.trim())}</td>`).join('')}</tr></table>`); continue; }
    out.push(raw.trim() ? `<p>${inline(raw)}</p>` : '');
  }
  closeList(); if (inCode) out.push('</pre>');
  return out.join('');
}

export default function Documents({ gallery }) {
  const { spaceId, canWrite } = useSpace();
  const { docId } = useParams();
  const nav = useNavigate();
  const docs = useCrud(spaceId, 'documents');
  const projects = useCrud(spaceId, 'projects');
  const base = `/dashboard/spaces/${spaceId}/documents`;
  const current = docs.items.find((d) => d.id === docId);
  const create = async () => { const d = await docs.create.mutateAsync({ title: 'Untitled document', content: '# Untitled document\n\n' }); nav(`${base}/${d.id}`); };
  if (current) return <DocEditor key={current.id} doc={current} docs={docs} projects={projects.items} canWrite={canWrite} spaceId={spaceId} onBack={() => nav(base)} />;
  return (
    <div className="fade-up" data-testid="documents-page">
      <PageHeader icon="file" title={gallery ? 'Gallery' : 'Documents'} subtitle="Rich collaborative documents. Realtime editing via Supabase + Yjs when configured; offline-first with local persistence." actions={canWrite && <button className="nv-btn nv-btn-primary" onClick={create} data-testid="documents-new-button"><Icon name="plus" size={14} /> New Document</button>} />
      <div className="px-7 pb-8">
        {docs.isLoading && <Loading />}{docs.error && <ErrorState error={docs.error} onRetry={docs.refetch} />}
        {!docs.isLoading && !docs.items.length && <Empty icon="file" title="No documents yet" hint="Specs, plans, meeting notes, essays — everything versioned." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={create} data-testid="documents-empty-new">Create a document</button>} />}
        <div className="grid grid-cols-4 gap-4">{docs.items.map((d) => <button key={d.id} className="nv-card p-4 text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(`${base}/${d.id}`)} data-testid={`document-card-${d.id}`}><div className="stat-icon tone-blue" style={{ width: 34, height: 34 }}><Icon name="file-text" size={15} /></div><div className="font-bold text-[13.5px] mt-3 truncate">{d.title}</div><div className="text-[11.5px] nv-muted mt-1 line-clamp-2 h-8">{(d.content || '').replace(/[#*`>]/g, '').slice(0, 120) || 'Empty document'}</div><div className="text-[11px] nv-faint mt-2">v{d.version} · Edited {ago(d.updated_at)}</div></button>)}</div>
      </div>
    </div>
  );
}

function DocEditor({ doc, docs, projects, canWrite, spaceId, onBack }) {
  const [f, setF] = useState({ title: doc.title, content: doc.content || '', project_id: doc.project_id || '' });
  const [mode, setMode] = useState('rich');
  const [showVersions, setShowVersions] = useState(false);
  const [collabStatus, setCollabStatus] = useState('local');
  const [sendOpen, setSendOpen] = useState(false);
  const me = useApp((s) => s.user);
  const state = useAutosave(f, (v) => docs.update.mutateAsync({ id: doc.id, title: v.title, content: v.content, project_id: v.project_id || null }));
  const { data: versions = [] } = useQuery({ queryKey: ['doc-versions', doc.id, doc.version], queryFn: () => api.get(`/spaces/${spaceId}/documents/${doc.id}/versions`).then((r) => r.data), enabled: showVersions });
  const exportMd = () => { const blob = new Blob([f.content], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${f.title}.md`; a.click(); };
  const print = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>${esc(f.title)}</title><style>body{font-family:Manrope,system-ui;max-width:760px;margin:40px auto;line-height:1.6}</style></head><body>${renderMarkdown(f.content)}</body></html>`); w.document.close(); w.print(); };
  return (
    <div className="flex flex-col fade-up" style={{ height: 'calc(100vh - var(--header-h))' }} data-testid="document-editor">
      <div className="px-7 pt-5 pb-3 flex items-center gap-3 border-b border-[var(--nv-border)]">
        <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={onBack} aria-label="Back" data-testid="document-back"><Icon name="arrow-left" size={16} /></button>
        <input className="flex-1 text-[20px] font-extrabold tracking-tight outline-none bg-transparent" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} disabled={!canWrite} data-testid="document-title-input" />
        <SaveState state={state} /><span className="text-[11px] nv-faint">v{doc.version}</span>
        <CollabStatusPill status={collabStatus} />
        <div className="flex bg-[#f3f2fa] rounded-lg p-0.5">{[['rich', 'pen-line'], ['markdown', 'columns-2'], ['read', 'book-open']].map(([m, i]) => <button key={m} onClick={() => setMode(m)} className={`h-8 w-9 rounded-md grid place-items-center ${mode === m ? 'bg-white shadow-sm text-[#5b43e6]' : 'nv-muted'}`} aria-label={m} data-testid={`doc-mode-${m}`}><Icon name={i} size={14} /></button>)}</div>
        <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => setShowVersions(!showVersions)} aria-label="History" data-testid="doc-history"><Icon name="history" size={15} /></button>
        <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={exportMd} aria-label="Export Markdown" data-testid="doc-export"><Icon name="download" size={15} /></button>
        <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={print} aria-label="Print / PDF" data-testid="doc-print"><Icon name="printer" size={15} /></button>
        <button className="nv-btn nv-btn-soft h-8 px-2.5" onClick={() => setSendOpen(true)} aria-label="Send" data-testid="doc-send"><Icon name="send" size={13} /> Send</button>
        <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }} aria-label="Copy link" data-testid="doc-share"><Icon name="link" size={15} /></button>
        {canWrite && <button className="nv-btn nv-btn-ghost w-8 px-0 text-[#ee5a5a]" onClick={() => window.confirm('Delete this document?') && (docs.remove.mutate(doc.id), onBack())} aria-label="Delete" data-testid="doc-delete"><Icon name="trash-2" size={15} /></button>}
      </div>
      <div className="px-7 py-2 flex items-center gap-3 text-xs border-b border-[var(--nv-border)]"><Field label=""><Select value={f.project_id} onChange={(v) => setF({ ...f, project_id: v })} options={[['', 'No project'], ...projects.map((p) => [p.id, p.name])]} testId="doc-project-select" /></Field><span className="nv-muted">{mode === 'rich' ? 'Collaborative editor · Tiptap + Yjs' : 'Markdown · headings, lists, tables, code, links, [[backlinks]]'}</span></div>
      <div className="flex-1 min-h-0 flex">
        {mode === 'rich' && (
          <CollaborativeDocEditor
            documentId={doc.id}
            user={me}
            canWrite={canWrite}
            initialContent={doc.content || ''}
            onLocalChange={(_json, text) => setF((prev) => (prev.content === text ? prev : { ...prev, content: text }))}
            onStatusChange={setCollabStatus}
          />
        )}
        {mode === 'markdown' && <textarea className="flex-1 resize-none outline-none bg-transparent px-8 py-5 text-[14px] leading-relaxed font-mono nv-scroll" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} disabled={!canWrite} data-testid="document-content-input" />}
        {mode === 'read' && <div className="flex-1 overflow-auto nv-scroll px-10 py-5 prose-nv" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.content) }} data-testid="document-preview" />}
        {showVersions && <aside className="w-[260px] border-l border-[var(--nv-border)] p-4 overflow-auto nv-scroll" data-testid="doc-versions-panel"><div className="nv-eyebrow mb-2">Version history</div>{!versions.length && <div className="text-xs nv-muted">No previous versions yet.</div>}{versions.map((v) => <button key={v.id} className="w-full text-left p-2 rounded-lg hover:bg-[#f7f6fd] mb-1" onClick={() => canWrite && window.confirm(`Restore version ${v.version}?`) && setF({ ...f, content: v.content })} data-testid="doc-version"><div className="text-[12.5px] font-bold">Version {v.version}</div><div className="text-[11px] nv-muted">{ago(v.created_at)}</div></button>)}</aside>}
      </div>
      <SendComposer open={sendOpen} onClose={() => setSendOpen(false)} presetSpaceId={spaceId} lockSourceSpace object={{ type: 'document', id: doc.id, title: f.title }} />
    </div>
  );
}
