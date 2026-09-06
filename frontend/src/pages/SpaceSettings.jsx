import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { ACCENTS, Icon, SPACE_ICONS, SpaceIcon } from '../lib/icons';
import { Tag } from '../lib/ui';
import { Field } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

export default function SpaceSettings() {
  const { space, spaceId, isAdmin, role } = useSpace();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [f, setF] = useState({ name: space.name, description: space.description || '', icon: space.icon, accent: space.accent });
  const [order, setOrder] = useState(space.sidebar_order || []);
  const [voro, setVoro] = useState(space.voro_context?.instructions || '');
  const refresh = () => { qc.invalidateQueries({ queryKey: ['space', spaceId] }); qc.invalidateQueries({ queryKey: ['spaces'] }); };
  const save = useMutation({ mutationFn: () => api.patch(`/spaces/${spaceId}`, { ...f, voro_context: { ...(space.voro_context || {}), instructions: voro } }), onSuccess: () => { refresh(); toast.success('Space updated'); }, onError: (e) => toast.error(e.message) });
  const reorder = useMutation({ mutationFn: () => api.post(`/spaces/${spaceId}/library/reorder`, { order }), onSuccess: () => { refresh(); toast.success('Sidebar order saved'); } });
  const del = useMutation({ mutationFn: () => api.delete(`/spaces/${spaceId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['spaces'] }); nav('/dashboard'); toast.success('Space deleted'); }, onError: (e) => toast.error(e.message) });
  const { data: integrations = [] } = useQuery({ queryKey: ['integrations', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/integrations`).then((r) => r.data) });
  const move = (i, d) => { const o = [...order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
  const names = Object.fromEntries(space.sidebar.flatMap((s) => s.items.map((c) => [c.key, c])));
  return (
    <div className="fade-up" data-testid="space-settings">
      <PageHeader icon="settings" title="Space Settings" subtitle={`You are ${role}${isAdmin ? '' : ' — only owners and admins can change settings'}`} />
      <div className="px-7 pb-8 grid grid-cols-2 gap-5 max-w-[1100px]">
        <div className="nv-card p-5 space-y-4">
          <div className="nv-h2">Identity</div>
          <div className="flex items-center gap-4"><SpaceIcon icon={f.icon} accent={f.accent} size={52} radius={14} /><div className="flex-1"><Field label="Name"><input className="nv-input h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={!isAdmin} data-testid="space-settings-name" /></Field></div></div>
          <Field label="Description"><textarea className="nv-input min-h-[60px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} disabled={!isAdmin} data-testid="space-settings-description" /></Field>
          <Field label="Icon"><div className="flex flex-wrap gap-1.5">{SPACE_ICONS.map((i) => <button key={i} disabled={!isAdmin} onClick={() => setF({ ...f, icon: i })} className={`w-8 h-8 rounded-lg grid place-items-center border ${f.icon === i ? 'border-[#6e56f5] bg-[#f4f2ff] text-[#6e56f5]' : 'border-[var(--nv-border)] nv-muted'}`}><Icon name={i} size={14} /></button>)}</div></Field>
          <Field label="Accent"><div className="flex gap-2">{ACCENTS.map((a) => <button key={a} disabled={!isAdmin} onClick={() => setF({ ...f, accent: a })} className={`w-7 h-7 rounded-full bg-${a} ${f.accent === a ? 'ring-2 ring-offset-2 ring-[#6e56f5]' : ''}`} aria-label={a} />)}</div></Field>
          <Field label="Voro instructions for this Space"><textarea className="nv-input min-h-[70px]" placeholder="e.g. This is our Q3 product space. Prefer concise answers and reference the roadmap document." value={voro} onChange={(e) => setVoro(e.target.value)} disabled={!isAdmin} data-testid="space-settings-voro" /></Field>
          {isAdmin && <div className="flex justify-end"><button className="nv-btn nv-btn-primary" onClick={() => save.mutate()} data-testid="space-settings-save">Save</button></div>}
        </div>
        <div className="space-y-5">
          <div className="nv-card p-5"><div className="flex items-center justify-between mb-3"><div className="nv-h2">Sidebar order</div><button className="nv-link" onClick={() => nav(`/dashboard/spaces/${spaceId}/library`)} data-testid="space-settings-library">Open Space Library →</button></div>
            <div className="space-y-1">{order.filter((k) => names[k]).map((k, i) => <div key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#faf9ff]" data-testid={`order-${k}`}><Icon name={names[k].icon} size={14} className="nv-muted" /><span className="text-[13px] font-semibold flex-1">{names[k].name}</span>{isAdmin && <><button className="nv-btn nv-btn-ghost w-7 h-7 px-0" onClick={() => move(i, -1)} aria-label="Up"><Icon name="chevron-up" size={13} /></button><button className="nv-btn nv-btn-ghost w-7 h-7 px-0" onClick={() => move(i, 1)} aria-label="Down"><Icon name="chevron-down" size={13} /></button></>}</div>)}</div>
            {isAdmin && <div className="flex justify-end mt-3"><button className="nv-btn nv-btn-outline nv-btn-sm" onClick={() => reorder.mutate()} data-testid="space-settings-reorder-save">Save order</button></div>}</div>
          <div className="nv-card p-5"><div className="nv-h2 mb-3">Integrations</div><div className="space-y-2">{integrations.map((i) => <div key={i.provider} className="flex items-center gap-3 text-[13px]" data-testid={`integration-${i.provider}`}><div className="stat-icon tone-slate" style={{ width: 32, height: 32 }}><Icon name="plug" size={14} /></div><div className="flex-1"><div className="font-semibold">{i.name}</div><div className="text-[11px] nv-muted">Used by {i.used_by.join(', ')}</div></div><Tag tone={i.status === 'connected' ? 'green' : i.status === 'pending_oauth' ? 'amber' : 'slate'}>{i.status.replace('_', ' ')}</Tag>{!i.provider_configured && <span className="text-[10px] nv-faint">server keys missing</span>}</div>)}</div></div>
          {role === 'owner' && <div className="nv-card p-5 border-[#f5d9d9]"><div className="nv-h2 text-[#ee5a5a]">Danger zone</div><div className="text-xs nv-muted mt-1">Deleting a Space soft-deletes it; cloud data follows the retention policy. Export first if you want a copy.</div><button className="nv-btn nv-btn-outline nv-btn-sm mt-3 text-[#ee5a5a]" onClick={() => window.confirm(`Delete "${space.name}"? Export your data first.`) && del.mutate()} data-testid="space-delete">Delete Space</button></div>}
        </div>
      </div>
    </div>
  );
}
