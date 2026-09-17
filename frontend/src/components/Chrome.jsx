import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';
import { useApp } from '../lib/store';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ago } from '../lib/ui';

export function Popover({ trigger, children, align = 'right', width = 320, testId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)} data-testid={testId}>{trigger}</div>
      {open && (
        <div className={`absolute top-[calc(100%+8px)] ${align === 'right' ? 'right-0' : 'left-0'} nv-card shadow-xl shadow-[#6e56f5]/10 z-50 pop overflow-hidden`} style={{ width }} onClick={(e) => e.stopPropagation()}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

const QUICK = [
  ['note', 'New Note', 'file-text', 'violet'], ['task', 'New Task', 'check-square', 'green'], ['project', 'New Project', 'layers', 'blue'],
  ['event', 'New Event', 'calendar', 'pink'], ['file', 'Upload File', 'cloud-upload', 'teal'], ['meeting', 'New Meeting', 'video', 'amber'],
  ['space', 'New Space', 'plus', 'violet'], ['document', 'New Document', 'file', 'blue'], ['conversation', 'New Conversation', 'message-circle', 'pink'],
];

export function useQuickNew(spaceId) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: spaces } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const [pending, setPending] = useState(null);
  const run = async (kind, sid) => {
    if (kind === 'space') return nav('/dashboard/spaces/new');
    if (!sid) { setPending(kind); return; }
    setPending(null);
    const base = `/dashboard/spaces/${sid}`;
    try {
      if (kind === 'note') { const { data } = await api.post(`/spaces/${sid}/notes`, { title: 'Untitled note' }); nav(`${base}/notes/${data.id}`); }
      else if (kind === 'document') { const { data } = await api.post(`/spaces/${sid}/documents`, { title: 'Untitled document' }); nav(`${base}/documents/${data.id}`); }
      else if (kind === 'task') nav(`${base}/tasks?new=1`);
      else if (kind === 'project') nav(`${base}/projects?new=1`);
      else if (kind === 'event') nav(`${base}/calendar?new=event`);
      else if (kind === 'meeting') nav(`${base}/meetings?new=1`);
      else if (kind === 'file') nav(`${base}/files?upload=1`);
      else if (kind === 'conversation') nav(`${base}/chat?new=1`);
      qc.invalidateQueries({ queryKey: ['home', sid] });
    } catch (e) { toast.error(e.message); }
  };
  return { run, pending, setPending, spaces: spaces || [], spaceId };
}

export function QuickNewMenu({ spaceId, compact, renderTrigger }) {
  const q = useQuickNew(spaceId);
  const defaultTrigger = <button className="nv-btn nv-btn-primary" data-testid="quick-new-button"><Icon name="plus" size={15} /> New {!compact && <Icon name="chevron-down" size={13} />}</button>;
  return (
    <>
      <Popover width={300} testId="quick-new-trigger" trigger={renderTrigger ? renderTrigger({}) : defaultTrigger}>
        {(close) => (
          <div className="p-2 grid grid-cols-3 gap-1">
            {QUICK.map(([k, label, icon, tone]) => (
              <button key={k} data-testid={`quick-new-${k}`} onClick={() => { close(); q.run(k, spaceId); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#f4f2ff] transition-colors">
                <div className={`stat-icon tone-${tone}`} style={{ width: 32, height: 32 }}><Icon name={icon} size={15} /></div>
                <span className="text-[11px] font-semibold">{label.replace('New ', '')}</span>
              </button>
            ))}
          </div>
        )}
      </Popover>
      <SpacePicker q={q} />
    </>
  );
}

export function SpacePicker({ q }) {
  if (!q.pending) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px] grid place-items-center" onClick={() => q.setPending(null)} data-testid="space-picker">
      <div className="nv-card w-[420px] p-5 pop shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="nv-h2">Where does this belong?</div>
        <div className="text-xs nv-muted mt-1">Everything in Notevoro lives inside a Space.</div>
        <div className="mt-4 space-y-1 max-h-72 overflow-auto nv-scroll">
          {q.spaces.map((s) => (
            <button key={s.id} data-testid={`space-picker-${s.id}`} onClick={() => q.run(q.pending, s.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#f4f2ff] text-left">
              <SpaceIcon icon={s.icon} accent={s.accent} size={32} radius={9} />
              <div><div className="text-sm font-bold">{s.name}</div><div className="text-[11px] nv-muted capitalize">{s.type} Space</div></div>
            </button>
          ))}
          {!q.spaces.length && <div className="text-xs nv-muted p-3">You have no Spaces yet. <a className="nv-link" href="/dashboard/spaces/new">Create one</a>.</div>}
        </div>
      </div>
    </div>
  );
}

export function NotificationsMenu() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then((r) => r.data), refetchInterval: 60000 });
  const nav = useNavigate();
  const markAll = async () => { await api.post('/notifications/read'); qc.invalidateQueries({ queryKey: ['notifications'] }); };
  return (
    <Popover width={360} testId="notifications-trigger" trigger={
      <button className="relative nv-btn nv-btn-ghost w-9 px-0" data-testid="notifications-button" aria-label="Notifications">
        <Icon name="bell" size={17} />
        {data?.unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#ee5a5a] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 grid place-items-center" data-testid="notifications-badge">{data.unread}</span>}
      </button>}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--nv-border)]"><span className="font-bold text-sm">Notifications</span><button className="nv-link" onClick={markAll} data-testid="notifications-mark-read">Mark all read</button></div>
          <div className="max-h-[380px] overflow-auto nv-scroll">
            {!data?.items?.length && <div className="p-6 text-center text-xs nv-muted">You're all caught up.</div>}
            {data?.items?.map((n) => (
              <button key={n.id} data-testid="notification-item" onClick={() => { api.post(`/notifications/read?id=${n.id}`); qc.invalidateQueries({ queryKey: ['notifications'] }); close(); if (n.link) nav(n.link.startsWith('/chat/') ? `/dashboard/spaces/${n.space_id}${n.link}` : n.link); }} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-[#f7f6fd] ${n.read_at ? '' : 'bg-[#faf9ff]'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read_at ? 'bg-transparent' : 'bg-[#6e56f5]'}`} />
                <div className="min-w-0"><div className="text-[13px] font-semibold truncate">{n.title}</div>{n.body && <div className="text-xs nv-muted truncate">{n.body}</div>}<div className="text-[10px] nv-faint mt-0.5">{ago(n.created_at)}</div></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

export function AccountMenu() {
  const user = useApp((s) => s.user);
  const ent = useApp((s) => s.entitlements);
  const nav = useNavigate();
  return (
    <Popover width={240} testId="account-trigger" trigger={<button className="flex items-center gap-1.5 nv-btn nv-btn-ghost px-1.5" data-testid="account-button"><Avatar user={user} size={30} /><Icon name="chevron-down" size={13} className="nv-faint" /></button>}>
      {(close) => (
        <div className="p-2">
          <div className="px-3 py-2"><div className="font-bold text-sm truncate">{user?.name}</div><div className="text-xs nv-muted truncate">{user?.email}</div><span className="nv-tag tone-violet mt-1.5 capitalize">{ent?.plan} plan</span></div>
          <button className="nav-item w-full" data-testid="menu-settings" onClick={() => { close(); nav('/dashboard/settings'); }}><Icon name="settings" /> Settings</button>
          <button className="nav-item w-full" data-testid="menu-billing" onClick={() => { close(); nav('/dashboard/settings?tab=billing'); }}><Icon name="crown" /> Plan & usage</button>
          <button className="nav-item w-full" data-testid="menu-logout" onClick={() => signOut()}><Icon name="log-out" /> Sign out</button>
        </div>
      )}
    </Popover>
  );
}

export function SyncBadge() {
  const online = useApp((s) => s.online);
  const ws = useApp((s) => s.wsStatus);
  const label = !online ? 'Offline' : ws === 'connected' ? 'Synced' : ws === 'reconnecting' ? 'Reconnecting…' : 'Syncing…';
  const tone = !online ? '#ee5a5a' : ws === 'connected' ? '#22b573' : '#f2a531';
  return (
    <div className="flex items-center gap-1.5 text-xs nv-muted" data-testid="sync-badge">
      <Icon name={!online ? 'cloud-off' : 'cloud'} size={14} /> {label} <span className={`w-1.5 h-1.5 rounded-full ${ws !== 'connected' && online ? 'pulse-dot' : ''}`} style={{ background: tone }} />
    </div>
  );
}
