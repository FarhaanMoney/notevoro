import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ago, Empty, ErrorState, Loading, Tag } from '../lib/ui';
import { useCrud } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

const KIND = { note: ['file-text', 'violet', 'notes'], document: ['file', 'blue', 'documents'], task: ['check-square', 'green', 'tasks'], project: ['layers', 'amber', 'projects'], event: ['calendar', 'pink', 'calendar'], file: ['folder', 'teal', 'files'], record: ['box', 'slate', 'm'] };

export default function Knowledge() {
  const { spaceId } = useSpace();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => { setQ(params.get('q') || ''); }, [params]);
  const notes = useCrud(spaceId, 'notes');
  const docs = useCrud(spaceId, 'documents');
  const { data: results = [], isLoading } = useQuery({ queryKey: ['search', spaceId, q], queryFn: () => api.get(`/spaces/${spaceId}/search`, { params: { q } }).then((r) => r.data), enabled: q.length > 1 });
  const base = `/dashboard/spaces/${spaceId}`;
  const tags = [...new Set(notes.items.flatMap((n) => n.tags || []))];
  const linkCount = notes.items.reduce((a, n) => a + ((n.content || '').match(/\[\[/g) || []).length, 0);
  const openResult = (r) => nav(r.kind === 'note' ? `${base}/notes/${r.id}` : r.kind === 'document' ? `${base}/documents/${r.id}` : r.kind === 'record' ? `${base}/m/${r.capability_key}` : `${base}/${KIND[r.kind][2]}`);
  return (
    <div className="fade-up" data-testid="knowledge-page">
      <PageHeader icon="book-open" title="Knowledge" subtitle={`${notes.items.length} notes · ${docs.items.length} documents · ${linkCount} links · ${tags.length} tags`} actions={<div className="relative"><Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" /><input className="nv-input h-9 pl-8 w-80" placeholder="Search everything in this Space…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus data-testid="knowledge-search-input" /></div>} />
      <div className="px-7 pb-8 space-y-6">
        {q.length > 1 && <div><div className="nv-eyebrow mb-2">Results for "{q}"</div>{isLoading ? <Loading /> : !results.length ? <div className="text-xs nv-muted">Nothing found. Voro can also search semantically when the AI provider is configured.</div> : <div className="nv-card divide-y divide-[var(--nv-border)]">{results.map((r) => { const [ic, tone] = KIND[r.kind] || KIND.record; return <button key={r.kind + r.id} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#faf9ff]" onClick={() => openResult(r)} data-testid="search-result"><div className={`stat-icon tone-${tone}`} style={{ width: 30, height: 30 }}><Icon name={ic} size={13} /></div><div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{r.title}</div><div className="text-[11px] nv-muted capitalize">{r.capability_key || r.kind} · {ago(r.updated_at)}</div></div><Icon name="chevron-right" size={14} className="nv-faint" /></button>; })}</div>}</div>}
        {tags.length > 0 && <div><div className="nv-eyebrow mb-2">Tags</div><div className="flex flex-wrap gap-2">{tags.map((t) => <button key={t} className="nv-chip" onClick={() => setQ(t)} data-testid="knowledge-tag"><Icon name="tag" size={11} /> {t}</button>)}</div></div>}
        <div className="grid grid-cols-2 gap-5">
          <div><div className="nv-eyebrow mb-2">Linked notes</div>{notes.isLoading && <Loading />}{notes.error && <ErrorState error={notes.error} compact />}{!notes.items.length && <Empty icon="file-text" title="No notes yet" hint="Notes with [[links]] form your knowledge graph." />}
            <div className="space-y-2">{notes.items.slice(0, 12).map((n) => { const links = [...((n.content || '').matchAll(/\[\[([^\]]+)\]\]/g))].map((m) => m[1]); return <button key={n.id} className="w-full nv-card p-3 text-left hover:border-[#c9bffb]" onClick={() => nav(`${base}/notes/${n.id}`)} data-testid="knowledge-note"><div className="flex items-center gap-2"><Icon name="file-text" size={14} className="text-[#6e56f5]" /><span className="text-[13px] font-bold flex-1 truncate">{n.title}</span><span className="text-[11px] nv-faint">{ago(n.updated_at)}</span></div>{links.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{links.map((l) => <Tag key={l} tone="violet"><Icon name="link" size={9} /> {l}</Tag>)}</div>}</button>; })}</div></div>
          <div><div className="nv-eyebrow mb-2">Documents</div>{!docs.items.length && <Empty icon="file" title="No documents yet" />}<div className="space-y-2">{docs.items.slice(0, 12).map((d) => <button key={d.id} className="w-full nv-card p-3 text-left hover:border-[#c9bffb]" onClick={() => nav(`${base}/documents/${d.id}`)} data-testid="knowledge-doc"><div className="flex items-center gap-2"><Icon name="file" size={14} className="text-[#4f7cf7]" /><span className="text-[13px] font-bold flex-1 truncate">{d.title}</span><span className="text-[11px] nv-faint">v{d.version}</span></div><div className="text-[11.5px] nv-muted mt-1 line-clamp-2">{(d.content || '').replace(/[#*`>]/g, '').slice(0, 140)}</div></button>)}</div></div>
        </div>
      </div>
    </div>
  );
}
