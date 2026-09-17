import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, AvatarStack, Icon, SpaceIcon } from '../lib/icons';
import { ErrorState, Loading } from '../lib/ui';
import { AccountMenu, NotificationsMenu, Popover, QuickNewMenu } from '../components/Chrome';
import VoroPanel from '../components/VoroPanel';
import { Logo } from './BrainLayout';

const SpaceCtx = createContext(null);
export const useSpace = () => useContext(SpaceCtx);

// --- Section registry -----------------------------------------------
// Fixed, compact, collapsible Space sidebar.
// Each entry is a per-Space route slug. Items that aren't relevant for
// personal spaces (Team, Chat, Meetings) are filtered at render time.
// The COLLABORATE > Inbox item points to the GLOBAL brain inbox, not a
// per-Space inbox (per product spec: one Inbox, ever).
const SECTIONS = [
  {
    key: 'create', label: 'Create',
    items: [
      { key: 'new',        label: '+ New',      icon: 'plus',       action: 'quick-new' },
      { key: 'pages',      label: 'Page',       icon: 'file-stack', route: 'pages' },
      { key: 'notes',      label: 'Note',       icon: 'file-text', route: 'notes' },
      { key: 'documents',  label: 'Document',   icon: 'file',      route: 'documents' },
      { key: 'whiteboard', label: 'Whiteboard', icon: 'pen-tool',  route: 'm/whiteboards' },
      { key: 'forms',      label: 'Form',       icon: 'clipboard', route: 'm/forms' },
      { key: 'datasets',   label: 'Dataset',    icon: 'table',     route: 'm/tables' },
    ],
  },
  {
    key: 'work', label: 'Work',
    items: [
      { key: 'tasks',    label: 'Tasks',    icon: 'check-square', route: 'tasks' },
      { key: 'projects', label: 'Projects', icon: 'layers',       route: 'projects' },
      { key: 'calendar', label: 'Calendar', icon: 'calendar',     route: 'calendar' },
      { key: 'meetings', label: 'Meetings', icon: 'video',        route: 'meetings' },
    ],
  },
  {
    key: 'knowledge', label: 'Knowledge',
    items: [
      { key: 'space-notes', label: 'Notes',     icon: 'file-text', route: 'notes' },
      { key: 'research',    label: 'Research',  icon: 'microscope', route: 'm/research' },
      { key: 'knowledge',   label: 'Knowledge', icon: 'book-open', route: 'knowledge' },
      { key: 'files',       label: 'Files',     icon: 'folder',    route: 'files' },
    ],
  },
  {
    key: 'collaborate', label: 'Collaborate',
    items: [
      { key: 'team',  label: 'Team',  icon: 'users',           route: 'team',  teamOnly: true },
      { key: 'chat',  label: 'Chat',  icon: 'message-circle',  route: 'chat',  teamOnly: true },
      { key: 'inbox', label: 'Inbox', icon: 'inbox',           global: true },
    ],
  },
];

// Legacy KIND_ROUTE preserved for existing code paths that referenced it.
const KIND_ROUTE = { notes: 'notes', pages: 'pages', documents: 'documents', files: 'files', knowledge: 'knowledge', tasks: 'tasks', projects: 'projects', calendar: 'calendar', meetings: 'meetings', chat: 'chat', team: 'team', activity: 'activity' };
export const capRoute = (c) => (c.kind === 'records' ? `m/${c.key}` : c.kind === 'tool' ? `tools/${c.key}` : c.kind === 'view' ? c.key : KIND_ROUTE[c.kind] || c.key);

function loadOpenState() {
  try { return JSON.parse(localStorage.getItem('nv-space-sections') || '{}'); } catch { return {}; }
}
function saveOpenState(v) {
  try { localStorage.setItem('nv-space-sections', JSON.stringify(v)); } catch { /* noop */ }
}

export default function SpaceShell() {
  const { spaceId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const user = useApp((s) => s.user);
  const presence = useApp((s) => s.presence);
  const { voroOpen, setVoroOpen } = useApp();
  const [q, setQ] = useState('');
  const { data: space, isLoading, error, refetch } = useQuery({ queryKey: ['space', spaceId], queryFn: () => api.get(`/spaces/${spaceId}`).then((r) => r.data) });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const [open, setOpen] = useState(() => ({ create: true, work: true, knowledge: false, collaborate: false, ...loadOpenState() }));
  const toggle = (k) => setOpen((prev) => { const next = { ...prev, [k]: !prev[k] }; saveOpenState(next); return next; });
  useEffect(() => { setQ(''); }, [spaceId]);
  if (isLoading) return <div className="h-screen grid place-items-center"><Loading label="Entering Space…" /></div>;
  if (error) return <div className="h-screen p-8"><ErrorState error={error} onRetry={refetch} /><button className="nv-btn nv-btn-outline ml-4" onClick={() => nav('/dashboard/spaces')}>Back</button></div>;

  const isHome = loc.pathname === `/dashboard/spaces/${spaceId}`;
  const isChat = loc.pathname.includes('/chat');
  const isTeam = space.type === 'team';
  const members = space.members || [];
  const online = members.filter((m) => presence.has(m.user.id)).length;
  const showVoro = voroOpen && isHome;

  const runQuickCreate = async (kind) => {
    try {
      if (kind === 'notes')      { const { data } = await api.post(`/spaces/${spaceId}/notes`, { title: 'Untitled note' });         nav(`/dashboard/spaces/${spaceId}/notes/${data.id}`); }
      else if (kind === 'documents')  { const { data } = await api.post(`/spaces/${spaceId}/documents`, { title: 'Untitled document' }); nav(`/dashboard/spaces/${spaceId}/documents/${data.id}`); }
      else if (kind === 'pages') { const { data } = await api.post(`/spaces/${spaceId}/pages`, { title: 'Untitled' });                 nav(`/dashboard/spaces/${spaceId}/pages/${data.id}`); }
      else if (kind === 'tasks')     nav(`/dashboard/spaces/${spaceId}/tasks?new=1`);
      else if (kind === 'projects')  nav(`/dashboard/spaces/${spaceId}/projects?new=1`);
      else if (kind === 'meetings')  nav(`/dashboard/spaces/${spaceId}/meetings?new=1`);
    } catch (e) { toast.error(e.message || 'Failed to create'); }
  };

  return (
    <SpaceCtx.Provider value={{ space, spaceId, role: space.role, canWrite: ['owner', 'admin', 'member'].includes(space.role), isAdmin: ['owner', 'admin'].includes(space.role) }}>
      <div className="h-screen flex overflow-hidden" data-testid="space-shell">
        <aside className="w-[248px] shrink-0 bg-[var(--nv-sidebar)] border-r border-[var(--nv-border)] flex flex-col sticky top-0" data-testid="space-sidebar">
          <div className="px-5 h-[var(--header-h)] flex items-center cursor-pointer" onClick={() => nav('/dashboard/spaces')} data-testid="sidebar-logo"><Logo /></div>
          <div className="px-3">
            <Popover align="left" width={280} testId="space-switcher-trigger" trigger={
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/70 text-left" data-testid="space-switcher-button">
                <SpaceIcon icon={space.icon} accent={space.accent} size={34} radius={10} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold truncate">{space.name}</div>
                  <div className="text-[11px] nv-muted capitalize">{space.type} Space</div>
                </div>
                <Icon name="chevrons-up-down" size={13} className="nv-faint" />
              </button>}>
              {(close) => <SpaceSwitcher spaces={spaces} current={space} onPick={(id) => { close(); nav(`/dashboard/spaces/${id}`); }} onBrain={() => { close(); nav('/dashboard'); }} onCreate={() => { close(); nav('/dashboard/spaces/new'); }} />}
            </Popover>
          </div>
          <div className="px-4 pt-2">
            <div className="relative">
              <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 nv-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this space…" className="nv-input pl-8 h-8 text-[12.5px] w-full" data-testid="space-search-input" />
            </div>
          </div>
          <nav className="flex-1 overflow-auto nv-scroll px-3 mt-3 space-y-0.5" data-testid="space-nav">
            <NavLink to={`/dashboard/spaces/${spaceId}`} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-home"><Icon name="home" /> Home</NavLink>
            {isTeam && <NavLink to={`/dashboard/spaces/${spaceId}/my-work`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-my-work"><Icon name="user" /> My Work</NavLink>}
            {SECTIONS.map((section) => {
              const items = section.items.filter((it) => !it.teamOnly || isTeam);
              if (!items.length) return null;
              const isOpen = !!open[section.key];
              return (
                <div key={section.key} className="pt-3">
                  <button className="w-full flex items-center justify-between px-3 h-6 nv-eyebrow hover:text-black" onClick={() => toggle(section.key)} data-testid={`section-toggle-${section.key}`}>
                    <span>{section.label.toUpperCase()}</span>
                    <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={12} className="nv-faint" />
                  </button>
                  <div style={{ maxHeight: isOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height 200ms ease' }}>
                    <div className="pt-1 space-y-0.5">
                      {items.map((it) => {
                        if (it.action === 'quick-new') {
                          return <SectionQuickNew key={it.key} spaceId={spaceId} onNav={nav} />;
                        }
                        if (it.global) {
                          return <NavLink key={it.key} to="/dashboard/inbox" className="nav-item" data-testid={`space-nav-${it.key}`}><Icon name={it.icon} /> {it.label}</NavLink>;
                        }
                        // In CREATE section, clicking creates then navigates. In others, it just navigates.
                        if (section.key === 'create') {
                          return <button key={it.key} className="nav-item w-full" onClick={() => runQuickCreate(it.route)} data-testid={`space-create-${it.key}`}><Icon name={it.icon} /> {it.label}</button>;
                        }
                        return <NavLink key={it.key} to={`/dashboard/spaces/${spaceId}/${it.route}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid={`space-nav-${it.key}`}><Icon name={it.icon} /> {it.label}</NavLink>;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="p-3 border-t border-[var(--nv-border)]">
            <div className="flex items-center gap-2 mb-2"><AvatarStack users={members.map((m) => m.user)} size={22} max={3} /><span className="text-[10.5px] nv-muted">{online} online</span></div>
            <button className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/70 text-left" onClick={() => nav('/dashboard/settings')} data-testid="space-sidebar-account">
              <Avatar user={user} size={26} />
              <div className="text-[12px] font-bold truncate">{user?.name}</div>
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {!isChat && !isHome && (
            <header className="h-[var(--header-h)] shrink-0 flex items-center gap-3 px-6 border-b border-[var(--nv-border)] bg-white/70 backdrop-blur" data-testid="space-header">
              <div className="flex items-center gap-2 font-bold text-[14px]"><SpaceIcon icon={space.icon} accent={space.accent} size={22} radius={6} /> {space.name}</div>
              <div className="ml-auto flex items-center gap-2">
                <QuickNewMenu spaceId={spaceId} compact />
                <NotificationsMenu />
                <AccountMenu />
              </div>
            </header>
          )}
          <div className="flex-1 flex min-h-0">
            <main className={`flex-1 min-w-0 ${isChat ? 'overflow-hidden' : 'overflow-auto nv-scroll'}`}><Outlet /></main>
            {showVoro && <VoroPanel space={space} onClose={() => setVoroOpen(false)} />}
          </div>
        </div>
      </div>
    </SpaceCtx.Provider>
  );
}

function SectionQuickNew({ spaceId, onNav }) {
  return (
    <QuickNewMenu spaceId={spaceId} compact renderTrigger={(props) => (
      <button className="nav-item w-full" {...props} data-testid="space-create-new"><Icon name="plus" /> + New</button>
    )} />
  );
}

function SpaceSwitcher({ spaces, current, onPick, onBrain, onCreate }) {
  const groups = [['Personal Spaces', spaces.filter((s) => s.type === 'personal')], ['Team Spaces', spaces.filter((s) => s.type === 'team')]];
  return (
    <div className="p-2" data-testid="space-switcher">
      <div className="px-3 py-2 nv-eyebrow">Current Space</div>
      <div className="flex items-center gap-3 px-3 py-1.5"><SpaceIcon icon={current.icon} accent={current.accent} size={28} radius={8} /><div className="text-[13px] font-bold">{current.name}</div><Icon name="check" size={14} className="ml-auto text-[#6e56f5]" /></div>
      {groups.map(([label, list]) => list.length > 0 && (
        <div key={label}><div className="px-3 pt-3 pb-1 nv-eyebrow">{label}</div>{list.map((s) => <button key={s.id} className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#f4f2ff] text-left" onClick={() => onPick(s.id)} data-testid={`switcher-space-${s.id}`}><SpaceIcon icon={s.icon} accent={s.accent} size={24} radius={7} /><span className="text-[13px] font-semibold truncate">{s.name}</span></button>)}</div>
      ))}
      <div className="border-t border-[var(--nv-border)] mt-2 pt-2 space-y-0.5">
        <button className="nav-item w-full !h-8" onClick={onCreate} data-testid="switcher-create"><Icon name="plus" /> Create Space</button>
        <button className="nav-item w-full !h-8" onClick={onBrain} data-testid="switcher-brain"><Icon name="arrow-left" /> Back to Notevoro</button>
      </div>
    </div>
  );
}

export function PageHeader({ icon, title, subtitle, actions, children }) {
  return (
    <div className="px-7 pt-6 pb-4 flex items-start gap-3" data-testid="page-header">
      {icon && <div className="stat-icon tone-violet"><Icon name={icon} size={18} /></div>}
      <div className="flex-1 min-w-0"><h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>{subtitle && <div className="text-xs nv-muted mt-0.5">{subtitle}</div>}{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function MemberAvatar({ userId, size = 22 }) {
  const { space } = useSpace();
  const m = (space.members || []).find((x) => x.user.id === userId);
  return m ? <Avatar user={m.user} size={size} /> : null;
}
