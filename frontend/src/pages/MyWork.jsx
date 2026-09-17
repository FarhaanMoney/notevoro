import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Icon } from '../lib/icons';
import { ago, Empty, Loading } from '../lib/ui';
import { useSpace } from './SpaceShell';

/**
 * My Work — private (visibility='private', created_by=me) objects that
 * live inside a Team Space. Everything the user drafts here is invisible
 * to teammates until they explicitly share or promote it.
 *
 * Uses the existing per-Space endpoints and filters client-side by the
 * existing visibility/created_by fields (which are already enforced
 * server-side via filter_accessible, so the caller only sees objects
 * they can already access).
 */
export default function MyWork() {
  const { spaceId, space } = useSpace();
  const me = useApp((s) => s.user);
  const nav = useNavigate();
  const kinds = [
    { key: 'notes',     label: 'Private notes',     icon: 'file-text',   route: 'notes' },
    { key: 'documents', label: 'Private documents', icon: 'file',        route: 'documents' },
    { key: 'tasks',     label: 'My tasks',          icon: 'check-square',route: 'tasks' },
    { key: 'pages',     label: 'My pages',          icon: 'file-stack',  route: 'pages' },
  ];
  const queries = kinds.map((k) => useQuery({ // eslint-disable-line react-hooks/rules-of-hooks
    queryKey: [k.key, spaceId, 'mine'],
    queryFn: () => (k.key === 'pages'
      ? api.get(`/spaces/${spaceId}/pages`, { params: { mine_only: true } }).then((r) => r.data)
      : api.get(`/spaces/${spaceId}/${k.key}`).then((r) => r.data)),
  }));
  const isLoading = queries.some((q) => q.isLoading);
  const groups = kinds.map((k, i) => ({
    ...k,
    items: (queries[i].data || []).filter((it) => it.visibility === 'private' && it.created_by === me?.id),
  }));
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <div className="px-8 py-8 max-w-[1000px] mx-auto" data-testid="my-work-page">
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-slate" style={{ width: 46, height: 46 }}><Icon name="user" size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">My Work</h1>
          <div className="text-[13px] nv-muted mt-1 max-w-[560px]">
            Private drafts inside <span className="font-semibold">{space?.name}</span>. Only you can see anything on this page. Share or promote to Team when ready.
          </div>
        </div>
      </div>
      {isLoading && <Loading />}
      {!isLoading && total === 0 && (
        <Empty
          icon="user"
          title="Nothing private yet"
          hint="When you create a Note, Page, Document or Task marked as Private in this Team Space, it will appear here."
        />
      )}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {groups.map((g) => g.items.length > 0 && (
            <section key={g.key} data-testid={`my-work-${g.key}`}>
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name={g.icon} size={13} className="nv-muted" /> {g.label} <span className="nv-faint">· {g.items.length}</span>
              </h2>
              <div className="space-y-1">
                {g.items.slice(0, 8).map((it) => (
                  <button
                    key={it.id}
                    className="nv-card p-3 flex items-center gap-3 w-full text-left hover:border-[#c9bffb]"
                    onClick={() => nav(`/dashboard/spaces/${spaceId}/${g.route}/${it.id}`)}
                    data-testid={`my-work-item-${it.id}`}
                  >
                    <div className="stat-icon tone-slate" style={{ width: 28, height: 28 }}><Icon name={g.icon} size={12} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{it.title || it.name || 'Untitled'}</div>
                      <div className="text-[11px] nv-muted truncate">Updated {ago(it.updated_at)}</div>
                    </div>
                    <span className="nv-tag tone-gray text-[9.5px] uppercase font-bold">Private</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
