import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ErrorState, Loading, Tag } from '../lib/ui';
import { PageHeader, useSpace, capRoute } from './SpaceShell';

const TYPES = [['all', 'All'], ['module', 'Modules'], ['tool', 'Tools'], ['view', 'Views'], ['ai', 'AI'], ['integration', 'Integrations']];
const TYPE_TONE = { module: 'violet', tool: 'amber', view: 'blue', ai: 'pink', integration: 'teal' };

export default function Library() {
  const { spaceId, isAdmin } = useSpace();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [type, setType] = useState('all');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['library', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/library`).then((r) => r.data) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['library', spaceId] }); qc.invalidateQueries({ queryKey: ['space', spaceId] }); };
  const toggle = useMutation({ mutationFn: (c) => api.post(`/spaces/${spaceId}/library/${c.enabled ? 'disable' : 'enable'}`, { key: c.key }), onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const connect = useMutation({ mutationFn: (c) => api.post(`/spaces/${spaceId}/integrations/${c.key}/connect`), onSuccess: () => { refresh(); toast.success('Integration connection started'); }, onError: (e) => toast.error(e.message) });
  if (isLoading) return <Loading label="Opening the Space Library…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const cats = ['all', ...new Set(data.items.map((c) => c.category))];
  const items = data.items.filter((c) => (type === 'all' || c.type === type) && (cat === 'all' || c.category === cat) && (!onlyEnabled || c.enabled) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase())));
  const enabledCount = data.items.filter((c) => c.enabled).length;
  return (
    <div className="fade-up" data-testid="library-page">
      <PageHeader icon="layout-grid" title="Space Library" subtitle={`What should this chamber be capable of? · ${enabledCount} enabled · ${data.items.length} available`} actions={<div className="relative"><Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" /><input className="nv-input h-9 pl-8 w-64" placeholder="Search capabilities…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="library-search-input" /></div>} />
      <div className="px-7 pb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#f3f2fa] rounded-lg p-0.5">{TYPES.map(([k, l]) => <button key={k} onClick={() => setType(k)} className={`h-8 px-3 rounded-md text-[12px] font-semibold ${type === k ? 'bg-white shadow-sm text-[#5b43e6]' : 'nv-muted'}`} data-testid={`library-type-${k}`}>{l}</button>)}</div>
          <select className="nv-input h-9 w-44" value={cat} onChange={(e) => setCat(e.target.value)} data-testid="library-category-select">{cats.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}</select>
          <label className="flex items-center gap-2 text-xs font-semibold nv-muted ml-2"><input type="checkbox" checked={onlyEnabled} onChange={(e) => setOnlyEnabled(e.target.checked)} data-testid="library-only-enabled" /> Enabled only</label>
          {!isAdmin && <span className="text-xs nv-muted ml-auto">Only owners and admins can change capabilities.</span>}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5">{items.map((c) => (
          <div key={c.key} className={`nv-card p-4 flex flex-col transition-colors ${c.enabled ? 'border-[#d9d4f5] bg-[#fcfbff]' : ''}`} data-testid={`capability-${c.key}`}>
            <div className="flex items-start gap-3"><div className={`stat-icon tone-${c.enabled ? 'violet' : 'slate'}`}><Icon name={c.icon} size={17} /></div><div className="flex-1 min-w-0"><div className="font-bold text-[14px] truncate">{c.name}</div><div className="flex items-center gap-1.5 mt-0.5"><Tag tone={TYPE_TONE[c.type]}>{c.type.toUpperCase()}</Tag><span className="text-[11px] nv-muted">{c.category}</span></div></div>{c.enabled && <Icon name="check-circle-2" size={16} className="text-[#22b573]" />}</div>
            <div className="text-[12px] nv-muted mt-3 flex-1 leading-relaxed">{c.description}</div>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap text-[11px]">{c.plan && <Tag tone="amber"><Icon name="crown" size={10} /> {c.plan.toUpperCase()}+</Tag>}{c.requires?.map((r) => <Tag key={r} tone="teal">needs {r}</Tag>)}{c.type === 'integration' && c.integration_status && <Tag tone={c.integration_status === 'connected' ? 'green' : 'slate'}>{c.integration_status}</Tag>}</div>
            <div className="flex items-center gap-2 mt-4">
              {c.type === 'integration' ? <button className="nv-btn nv-btn-outline nv-btn-sm" disabled={!isAdmin || c.locked} onClick={() => connect.mutate(c)} data-testid={`connect-${c.key}`}><Icon name="plug" size={13} /> {c.integration_status === 'connected' ? 'Manage' : 'Connect'}</button>
                : c.enabled ? <><button className="nv-btn nv-btn-soft nv-btn-sm" onClick={() => nav(`/dashboard/spaces/${spaceId}/${c.type === 'ai' ? 'voro' : capRoute(c)}`)} data-testid={`open-${c.key}`}>Open</button><button className="nv-btn nv-btn-ghost nv-btn-sm" disabled={!isAdmin} onClick={() => toggle.mutate(c)} data-testid={`remove-${c.key}`}>Remove</button></>
                  : <button className="nv-btn nv-btn-primary nv-btn-sm" disabled={!isAdmin} onClick={() => (c.locked ? nav('/dashboard/settings?tab=billing') : toggle.mutate(c))} data-testid={`add-${c.key}`}>{c.locked ? <><Icon name="crown" size={13} /> Upgrade to add</> : <><Icon name="plus" size={13} /> Add to Space</>}</button>}
            </div>
          </div>))}</div>
        {!items.length && <div className="text-center text-xs nv-muted py-12">No capabilities match.</div>}
      </div>
    </div>
  );
}
