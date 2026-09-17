import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon, Avatar, SpaceIcon } from '../lib/icons';
import { ago, Empty, Loading } from '../lib/ui';
import SendComposer from '../components/SendComposer';

const CATEGORIES = [
  ['all', 'All', 'inbox'],
  ['invitations', 'Invitations', 'user-plus'],
  ['shared', 'Shared with me', 'send'],
  ['mentions', 'Mentions', 'at-sign'],
  ['activity', 'Activity', 'activity'],
];

export default function InboxPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('cat') || 'all';
  const spaceId = params.get('space') || '';
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inbox', category, spaceId, q],
    queryFn: () => api.get('/inbox', { params: { category, space_id: spaceId || undefined, search: q || undefined, limit: 80 } }).then((r) => r.data),
    refetchInterval: 45000,
  });
  const items = data?.items || [];
  const spaceCounts = data?.space_counts || {};
  const spaceById = useMemo(() => Object.fromEntries(spaces.map((s) => [s.id, s])), [spaces]);
  const selected = items.find((i) => i.id === selectedId) || items[0] || null;

  const markRead = useMutation({
    mutationFn: (payload) => api.post('/inbox/read', payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inbox'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });
  const decide = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/inbox/${id}/${accept ? 'accept' : 'decline'}`).then((r) => r.data),
    onSuccess: (_d, v) => { toast.success(v.accept ? 'Accepted' : 'Declined'); qc.invalidateQueries({ queryKey: ['inbox'] }); },
  });
  const archive = useMutation({
    mutationFn: (id) => api.delete(`/inbox/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Archived'); qc.invalidateQueries({ queryKey: ['inbox'] }); setSelectedId(null); },
  });

  const openItem = (it) => {
    setSelectedId(it.id);
    if (!it.read_at) markRead.mutate({ id: it.id });
  };
  const openObject = (it) => {
    if (it.link) nav(it.link);
  };

  return (
    <div className="h-full flex" data-testid="inbox-page">
      {/* LEFT — categories & filters */}
      <aside className="w-[240px] shrink-0 border-r border-[var(--nv-border)] flex flex-col bg-white">
        <div className="px-5 h-[var(--header-h)] flex items-center gap-2">
          <h1 className="text-[17px] font-extrabold tracking-tight">Inbox</h1>
          {data?.unread > 0 && <span className="text-[11px] font-bold text-[#5b43e6]">{data.unread}</span>}
          <button className="ml-auto nv-btn nv-btn-primary nv-btn-sm" onClick={() => setComposeOpen(true)} data-testid="inbox-compose"><Icon name="plus" size={13} /> Compose</button>
        </div>
        <div className="px-3 space-y-0.5">
          {CATEGORIES.map(([k, label, icon]) => (
            <button key={k} onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('cat', k); return n; })} className={`nav-item w-full ${category === k ? 'active' : ''}`} data-testid={`inbox-cat-${k}`}>
              <Icon name={icon} /> {label}
            </button>
          ))}
        </div>
        <div className="px-3 mt-5 flex-1 overflow-auto nv-scroll">
          <div className="nv-eyebrow px-3 mb-1">By Space</div>
          <button onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.delete('space'); return n; })} className={`nav-item w-full ${!spaceId ? 'active' : ''}`} data-testid="inbox-space-all">
            <Icon name="circle-dot" /> All Spaces
          </button>
          {spaces.map((s) => (
            <button key={s.id} onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('space', s.id); return n; })} className={`nav-item w-full !pl-2 ${spaceId === s.id ? 'active' : ''}`} data-testid={`inbox-space-${s.id}`}>
              <SpaceIcon icon={s.icon} accent={s.accent} size={18} radius={5} />
              <span className="truncate flex-1 text-left">{s.name}</span>
              {spaceCounts[s.id] > 0 && <span className="text-[10.5px] nv-faint">{spaceCounts[s.id]}</span>}
            </button>
          ))}
          {spaceCounts.__none__ > 0 && (
            <button onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('space', '__none__'); return n; })} className={`nav-item w-full !pl-2 ${spaceId === '__none__' ? 'active' : ''}`} data-testid="inbox-space-none">
              <Icon name="minus-circle" /> <span className="truncate flex-1 text-left">No Space</span>
              <span className="text-[10.5px] nv-faint">{spaceCounts.__none__}</span>
            </button>
          )}
        </div>
        <div className="p-3 border-t border-[var(--nv-border)]">
          <button className="nv-btn nv-btn-ghost w-full text-[12px]" onClick={() => markRead.mutate({ all: true })} data-testid="inbox-mark-all"><Icon name="check-check" size={13} /> Mark all read</button>
        </div>
      </aside>

      {/* CENTER — message list */}
      <section className="w-[380px] shrink-0 border-r border-[var(--nv-border)] flex flex-col bg-white">
        <div className="px-4 h-[var(--header-h)] flex items-center gap-2 border-b border-[var(--nv-border)]">
          <div className="relative flex-1">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 nv-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inbox..." className="nv-input pl-8 h-8 text-[13px]" data-testid="inbox-search" />
          </div>
        </div>
        <div className="flex-1 overflow-auto nv-scroll">
          {isLoading && <Loading label="Loading inbox..." />}
          {!isLoading && !items.length && (
            <Empty icon="inbox" title="You're all caught up" hint="Nothing needs your attention right now." />
          )}
          {items.map((it) => {
            const sp = it.source_space || null;
            const isUnread = !it.read_at;
            const isSel = selected?.id === it.id;
            return (
              <button key={it.id} onClick={() => openItem(it)} className={`w-full text-left px-4 py-3 border-b border-[var(--nv-border)]/60 flex gap-3 hover:bg-[#faf9ff] ${isSel ? 'bg-[#f3f2fa]' : ''}`} data-testid={`inbox-row-${it.id}`}>
                <div className="relative">
                  <Avatar user={it.sender || { name: 'System' }} size={30} />
                  {isUnread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6e56f5]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[13px] truncate ${isUnread ? 'font-extrabold' : 'font-semibold nv-muted'}`}>{it.sender?.name || 'Notevoro'}</span>
                    <span className="text-[10.5px] nv-faint ml-auto shrink-0">{ago(it.created_at)}</span>
                  </div>
                  <div className="text-[12.5px] truncate mt-0.5">
                    {previewFor(it)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <SpaceTag space={sp} />
                    <TypeTag type={it.event_type} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RIGHT — detail */}
      <section className="flex-1 min-w-0 bg-white overflow-auto nv-scroll" data-testid="inbox-detail">
        {!selected ? (
          <div className="h-full grid place-items-center">
            <Empty icon="mail-open" title="Select a message" hint="Pick something on the left to read it here." />
          </div>
        ) : (
          <div className="px-8 py-6 max-w-[720px]">
            <div className="flex items-start gap-3">
              <Avatar user={selected.sender || { name: 'System' }} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold">{selected.sender?.name || 'Notevoro'}</div>
                <div className="text-[12px] nv-muted">{selected.sender?.email || ''}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <SpaceTag space={selected.source_space} />
                <TypeTag type={selected.event_type} />
              </div>
            </div>
            <h2 className="text-[22px] font-extrabold tracking-tight mt-6">{selected.subject || defaultTitle(selected)}</h2>
            <div className="text-[11.5px] nv-muted mt-1">{ago(selected.created_at)} · {statusLabel(selected)}</div>
            {selected.body && <div className="mt-5 text-[14px] leading-relaxed whitespace-pre-wrap">{selected.body}</div>}
            {selected.object_type && (
              <div className="mt-6 border border-[var(--nv-border)] rounded-xl p-4 flex items-center gap-3">
                <div className="stat-icon tone-violet" style={{ width: 36, height: 36 }}><Icon name={objectIcon(selected.object_type)} size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold truncate">{selected.meta?.source_object_title || selected.subject || 'Attached object'}</div>
                  <div className="text-[11.5px] nv-muted capitalize">{selected.object_type}{selected.permission ? ` · ${selected.permission}` : ''}</div>
                </div>
                {selected.link && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => openObject(selected)} data-testid="inbox-open-object">Open</button>}
              </div>
            )}
            <div className="mt-8 flex items-center gap-2">
              {selected.event_type === 'share' && selected.status === 'pending' && (
                <>
                  <button className="nv-btn nv-btn-primary" onClick={() => decide.mutate({ id: selected.id, accept: true })} data-testid="inbox-accept"><Icon name="check" size={13} /> Accept</button>
                  <button className="nv-btn nv-btn-outline" onClick={() => decide.mutate({ id: selected.id, accept: false })} data-testid="inbox-decline"><Icon name="x" size={13} /> Decline</button>
                </>
              )}
              {selected.event_type === 'mail' && (
                <button className="nv-btn nv-btn-primary" onClick={() => setComposeOpen(true)} data-testid="inbox-reply"><Icon name="reply" size={13} /> Reply</button>
              )}
              <button className="nv-btn nv-btn-ghost ml-auto" onClick={() => archive.mutate(selected.id)} data-testid="inbox-archive"><Icon name="archive" size={13} /> Archive</button>
            </div>
          </div>
        )}
      </section>

      <SendComposer
        open={composeOpen}
        onClose={() => { setComposeOpen(false); refetch(); }}
        presetSpaceId={selected?.source_space_id || ''}
      />
    </div>
  );
}

function previewFor(it) {
  if (it.event_type === 'invitation') return `Invited you to ${it.source_space?.name || 'a Space'}`;
  if (it.event_type === 'share') return `Shared ${it.meta?.source_object_title || it.subject || 'an object'}`;
  if (it.subject && it.body) return `${it.subject} — ${it.body}`;
  return it.subject || it.body || '(no preview)';
}
function defaultTitle(it) {
  if (it.event_type === 'invitation') return `You were added to ${it.source_space?.name || 'a Space'}`;
  if (it.event_type === 'share') return `Shared: ${it.meta?.source_object_title || 'object'}`;
  return '(no subject)';
}
function statusLabel(it) {
  if (it.status === 'accepted') return 'Accepted';
  if (it.status === 'declined') return 'Declined';
  if (it.status === 'archived') return 'Archived';
  return 'Pending';
}
function objectIcon(type) {
  return { page: 'file-stack', document: 'file', note: 'file-text', project: 'layers', task: 'check-square', file: 'folder', meeting: 'video', space: 'users' }[type] || 'file';
}
function SpaceTag({ space }) {
  if (!space) return <span className="nv-tag tone-gray text-[10px]">NO SPACE</span>;
  return <span className="nv-tag tone-violet text-[10px] uppercase font-bold tracking-wide"><SpaceIcon icon={space.icon} accent={space.accent} size={11} radius={3} /> {space.name}</span>;
}
function TypeTag({ type }) {
  const map = { mail: ['MESSAGE', 'gray'], share: ['SHARED', 'green'], invitation: ['INVITE', 'blue'], mention: ['MENTION', 'amber'], activity: ['ACTIVITY', 'gray'], system: ['SYSTEM', 'gray'] };
  const [label, tone] = map[type] || ['EVENT', 'gray'];
  return <span className={`nv-tag tone-${tone} text-[10px] uppercase font-bold tracking-wide`}>{label}</span>;
}
