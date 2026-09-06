import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon } from '../lib/icons';
import { ago, ErrorState, Loading, Tag } from '../lib/ui';
import { Field } from '../components/Forms';

const TABS = [['profile', 'Profile', 'user'], ['billing', 'Plan & usage', 'crown'], ['data', 'Data & export', 'download'], ['security', 'Security', 'shield-check']];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  return (
    <div className="px-8 py-7 max-w-[1000px] fade-up" data-testid="settings-page">
      <h1 className="nv-h1">Settings</h1>
      <div className="flex gap-6 mt-6">
        <aside className="w-[200px] space-y-0.5">{TABS.map(([k, l, i]) => <button key={k} onClick={() => setParams({ tab: k })} className={`nav-item w-full ${tab === k ? 'active' : ''}`} data-testid={`settings-tab-${k}`}><Icon name={i} /> {l}</button>)}</aside>
        <div className="flex-1 min-w-0">{tab === 'profile' && <Profile />}{tab === 'billing' && <Billing />}{tab === 'data' && <Data />}{tab === 'security' && <Security />}</div>
      </div>
    </div>
  );
}

function Profile() {
  const { user, setUser } = useApp();
  const [f, setF] = useState({ name: user.name, title: user.title || '', bio: user.bio || '', location: user.location || '', timezone: user.timezone || '' });
  const save = useMutation({ mutationFn: () => api.patch('/auth/me', f).then((r) => r.data), onSuccess: (u) => { setUser(u); toast.success('Profile saved'); }, onError: (e) => toast.error(e.message) });
  return (
    <div className="nv-card p-6 space-y-4" data-testid="settings-profile">
      <div className="flex items-center gap-4"><Avatar user={user} size={64} /><div><div className="font-bold text-[16px]">{user.name}</div><div className="text-xs nv-muted">{user.email}</div></div></div>
      <div className="grid grid-cols-2 gap-3">{[['name', 'Full name'], ['title', 'Title / role'], ['location', 'Location'], ['timezone', 'Timezone']].map(([k, l]) => <Field key={k} label={l}><input className="nv-input h-9" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`profile-${k}`} /></Field>)}</div>
      <Field label="About"><textarea className="nv-input min-h-[70px]" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} data-testid="profile-bio" /></Field>
      <div className="flex justify-end"><button className="nv-btn nv-btn-primary" onClick={() => save.mutate()} disabled={save.isPending} data-testid="profile-save">Save changes</button></div>
    </div>
  );
}

function Billing() {
  const qc = useQueryClient();
  const setEnt = useApp((s) => s.setEntitlements);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['billing'], queryFn: () => api.get('/billing').then((r) => r.data) });
  const change = useMutation({ mutationFn: (plan) => api.post('/billing/change-plan', { plan }).then((r) => r.data), onSuccess: (e) => { setEnt(e); qc.invalidateQueries({ queryKey: ['billing'] }); qc.invalidateQueries({ queryKey: ['brain'] }); toast.success(`You're now on ${e.plan}`); }, onError: (e) => toast.error(e.message) });
  const expire = useMutation({ mutationFn: () => api.post('/billing/simulate-expiry').then((r) => r.data), onSuccess: (e) => { setEnt(e); qc.invalidateQueries({ queryKey: ['billing'] }); toast.warning('Subscription expired — grace period active'); } });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const pct = (k) => Math.min(100, Math.round((data.usage[k] / (data.limits[k] || 1)) * 100));
  const STATE_TONE = { active: 'green', expiring: 'amber', grace: 'amber', restricted: 'red' };
  return (
    <div className="space-y-5" data-testid="settings-billing">
      <div className="nv-card p-6">
        <div className="flex items-center justify-between"><div><div className="nv-eyebrow">Current plan</div><div className="text-[24px] font-extrabold capitalize mt-1">{data.plan} {data.subscribed_plan !== data.plan && <span className="text-sm nv-muted font-medium">(subscribed: {data.subscribed_plan})</span>}</div></div><Tag tone={STATE_TONE[data.state]}>{data.state.toUpperCase()}</Tag></div>
        {data.expires_at && <div className="text-xs nv-muted mt-2">{data.state === 'grace' ? `Grace period until ${ago(data.grace_until)}. Local data stays yours; cloud features are limited.` : `Renews / expires ${ago(data.expires_at)}`}</div>}
        <div className="grid grid-cols-2 gap-4 mt-5">{['ai_requests', 'voro_actions', 'transcription_minutes', 'cloud_storage_mb'].map((k) => <div key={k} data-testid={`usage-${k}`}><div className="flex justify-between text-xs"><span className="font-semibold capitalize">{k.replace(/_/g, ' ')}</span><span className="nv-muted">{data.usage[k]} / {data.limits[k]}</span></div><div className="h-2 bg-[#f0eefa] rounded-full mt-1.5 overflow-hidden"><div className={`h-full ${pct(k) >= 90 ? 'bg-[#ee5a5a]' : 'bg-[#6e56f5]'}`} style={{ width: `${pct(k)}%` }} /></div></div>)}</div>
        <div className="text-[11px] nv-faint mt-3">Resets {ago(data.resets_at)} · {data.ai_tokens.toLocaleString()} AI tokens used this period · limits enforced server-side</div>
      </div>
      <div className="grid grid-cols-4 gap-3">{Object.entries(data.plans).map(([k, p]) => <div key={k} className={`nv-card p-4 flex flex-col ${k === data.plan ? 'border-[#6e56f5] ring-2 ring-[#eeebfe]' : ''}`} data-testid={`plan-${k}`}><div className="font-extrabold text-[15px]">{p.label}</div><div className="text-[22px] font-extrabold mt-1">{p.price === null ? 'Custom' : p.price === 0 ? 'Free' : `$${p.price}`}<span className="text-xs nv-muted font-medium">{p.price ? '/mo' : ''}</span></div><ul className="text-[11.5px] nv-muted mt-3 space-y-1 flex-1"><li>{p.ai_requests.toLocaleString()} AI requests</li><li>{p.cloud_storage_mb >= 1024 ? `${p.cloud_storage_mb / 1024} GB` : `${p.cloud_storage_mb} MB`} cloud storage</li><li>{p.team_spaces ? `${p.team_spaces} Team Spaces` : 'Personal Spaces'}</li><li>{p.collaboration ? 'Collaboration' : 'Local-first'}</li><li>{p.integrations ? 'Integrations' : 'BYOK AI'}</li></ul><button className={`nv-btn nv-btn-sm mt-3 ${k === data.subscribed_plan ? 'nv-btn-outline' : 'nv-btn-primary'}`} disabled={k === data.subscribed_plan && data.state === 'active'} onClick={() => change.mutate(k)} data-testid={`choose-plan-${k}`}>{k === data.subscribed_plan && data.state === 'active' ? 'Current' : k === 'enterprise' ? 'Contact / activate' : 'Choose'}</button></div>)}</div>
      {data.subscribed_plan !== 'free' && <div className="nv-card p-4 flex items-center justify-between"><div className="text-xs nv-muted"><b className="text-[#16141f]">Lifecycle test:</b> expire the subscription now to verify grace → restricted behavior. Local data is never affected.</div><button className="nv-btn nv-btn-outline nv-btn-sm" onClick={() => expire.mutate()} data-testid="simulate-expiry">Simulate expiry</button></div>}
      <div className="text-[11px] nv-faint">Payments are driven by provider webhooks (idempotent by event id). Plan targets: Pro $12/mo, Premium $20/mo, Enterprise per-organization.</div>
    </div>
  );
}

function Data() {
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const exp = async (s) => { const { data } = await api.get(`/spaces/${s.id}/export`); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.name}.notevoro.json`; a.click(); toast.success(`Exported ${s.name}`); };
  return (
    <div className="nv-card p-6 space-y-4" data-testid="settings-data">
      <div><div className="font-bold">Export your data</div><div className="text-xs nv-muted mt-1">Everything in a Space as structured JSON (notes, documents, tasks, projects, events, records, file metadata). Documents and notes also export as Markdown from their editors. No lock-in.</div></div>
      <div className="divide-y divide-[var(--nv-border)]">{spaces.map((s) => <div key={s.id} className="flex items-center justify-between py-2.5"><div className="text-[13px] font-semibold">{s.name} <span className="nv-faint font-medium capitalize">· {s.type}</span></div><button className="nv-btn nv-btn-outline nv-btn-sm" onClick={() => exp(s)} data-testid={`export-${s.id}`}><Icon name="download" size={13} /> Export JSON</button></div>)}</div>
      <div className="text-xs nv-muted pt-2 border-t border-[var(--nv-border)]"><b className="text-[#16141f]">Local vault (desktop):</b> the Tauri app stores human-readable Markdown in a folder you choose; SQLite is a rebuildable index. Cloud sync is additive — cloud outage never means data loss.</div>
    </div>
  );
}

function Security() {
  const { data } = useQuery({ queryKey: ['auth-config'], queryFn: () => api.get('/auth/config').then((r) => r.data) });
  return (
    <div className="nv-card p-6 space-y-3 text-[13px]" data-testid="settings-security">
      <div className="font-bold">Identity & sessions</div>
      <div className="text-xs nv-muted">Identity provider: <b className="text-[#16141f]">{data?.provider === 'cognito' ? 'AWS Cognito' : data?.provider === 'local' ? 'Local (development)' : 'Not configured'}</b>. Passwords and recovery are handled by the provider; the API only accepts verified access tokens.</div>
      <ul className="text-xs nv-muted list-disc pl-5 space-y-1"><li>Every request is authorized against Space membership and role on the server.</li><li>Plans, usage limits and Voro actions are enforced server-side and cannot be changed from the client.</li><li>Files are served through signed access; large binaries never live in the database.</li></ul>
    </div>
  );
}
