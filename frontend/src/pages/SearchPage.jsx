import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon, SpaceIcon } from '../lib/icons';
import { ago, Empty, Loading } from '../lib/ui';

const KIND = { note: ['file-text', 'violet', (s, r) => `/dashboard/spaces/${s}/notes/${r.id}`], document: ['file', 'blue', (s, r) => `/dashboard/spaces/${s}/documents/${r.id}`], task: ['check-square', 'green', (s) => `/dashboard/spaces/${s}/tasks`], project: ['layers', 'amber', (s, r) => `/dashboard/spaces/${s}/projects/${r.id}`], event: ['calendar', 'pink', (s) => `/dashboard/spaces/${s}/calendar`], file: ['folder', 'teal', (s) => `/dashboard/spaces/${s}/files`], record: ['box', 'slate', (s, r) => `/dashboard/spaces/${s}/m/${r.capability_key}`] };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => setParams(q ? { q } : {}), 250); return () => clearTimeout(t); }, [q, setParams]);
  const term = params.get('q') || '';
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ['global-search', term, spaces.map((s) => s.id).join()], enabled: term.length > 1 && spaces.length > 0, queryFn: async () => (await Promise.all(spaces.map((s) => api.get(`/spaces/${s.id}/search`, { params: { q: term } }).then((r) => r.data.map((x) => ({ ...x, space: s })))))).flat() });
  const matchingSpaces = spaces.filter((s) => term && s.name.toLowerCase().includes(term.toLowerCase()));
  return (
    <div className="px-8 py-7 max-w-[900px] fade-up" data-testid="search-page">
      <div className="relative"><Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 nv-faint" /><input autoFocus className="nv-input h-12 pl-12 text-[15px]" placeholder="Search across all your Spaces…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-page-input" /></div>
      <div className="mt-6 space-y-5">
        {matchingSpaces.length > 0 && <div><div className="nv-eyebrow mb-2">Spaces</div><div className="flex gap-2 flex-wrap">{matchingSpaces.map((s) => <button key={s.id} className="nv-chip" onClick={() => nav(`/dashboard/spaces/${s.id}`)} data-testid="search-space"><SpaceIcon icon={s.icon} accent={s.accent} size={18} radius={5} /> {s.name}</button>)}</div></div>}
        {term.length > 1 && (isLoading ? <Loading /> : !data?.length ? <Empty icon="search" title={`No results for "${term}"`} hint="Search covers notes, documents, tasks, projects, events, files and module records in every Space you belong to." /> : <div className="nv-card divide-y divide-[var(--nv-border)]" data-testid="search-results">{data.map((r) => { const [ic, tone, to] = KIND[r.kind] || KIND.record; return <button key={r.kind + r.id} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#faf9ff]" onClick={() => nav(to(r.space.id, r))} data-testid="search-result"><div className={`stat-icon tone-${tone}`} style={{ width: 32, height: 32 }}><Icon name={ic} size={14} /></div><div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold truncate">{r.title}</div><div className="text-[11px] nv-muted capitalize">{r.capability_key || r.kind} · {r.space.name} · {ago(r.updated_at)}</div></div><Icon name="chevron-right" size={14} className="nv-faint" /></button>; })}</div>)}
        {term.length <= 1 && <div className="text-xs nv-muted">Type at least two characters. Tip: press <span className="kbd">⌘ K</span> anywhere in the Brain.</div>}
      </div>
    </div>
  );
}
