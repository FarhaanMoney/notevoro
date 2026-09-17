import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ErrorState, Loading } from '../lib/ui';
import { Popover } from '../components/Chrome';
import { Logo } from './BrainLayout';

const SpaceCtx = createContext(null);
export const useSpace = () => useContext(SpaceCtx);

// ----------------------------------------------------------------------------
// Sidebar section registry — fixed 4-section design matching the product spec.
// Each section is collapsible (state persisted per user in localStorage).
// ----------------------------------------------------------------------------
const SECTIONS = [
  {
    key: 'create', label: 'CREATE',
    items: [
      { key: 'new',        label: '+ New',      icon: 'plus',       action: 'quick-new', accent: true },
      { key: 'pages',      label: 'Page',       icon: 'file-stack', route: 'pages' },
      { key: 'notes',      label: 'Note',       icon: 'file-text',  route: 'notes' },
      { key: 'documents',  label: 'Document',   icon: 'file',       route: 'documents' },
      { key: 'whiteboard', label: 'Whiteboard', icon: 'pen-tool',   route: 'm/whiteboards' },
      { key: 'forms',      label: 'Form',       icon: 'clipboard',  route: 'm/forms' },
      { key: 'datasets',   label: 'Dataset',    icon: 'table',      route: 'm/tables' },
    ],
  },
  {
    key: 'work', label: 'WORK',
    items: [
      { key: 'tasks',    label: 'Tasks',    icon: 'check-square', route: 'tasks' },
      { key: 'projects', label: 'Projects', icon: 'layers',       route: 'projects' },
      { key: 'calendar', label: 'Calendar', icon: 'calendar',     route: 'calendar' },
      { key: 'meetings', label: 'Meetings', icon: 'video',        route: 'meetings' },
    ],
  },
  {
    key: 'knowledge', label: 'KNOWLEDGE',
    items: [
      { key: 'space-notes', label: 'Notes',     icon: 'file-text',  route: 'notes' },
      { key: 'research',    label: 'Research',  icon: 'microscope', route: 'm/research' },
      { key: 'knowledge',   label: 'Knowledge', icon: 'book-open',  route: 'knowledge' },
      { key: 'files',       label: 'Files',     icon: 'folder',     route: 'files' },
    ],
  },
  {
    key: 'collaborate', label: 'COLLABORATE',
    items: [
      { key: 'team',  label: 'Team',  icon: 'users',          route: 'team', teamOnly: true },
      { key: 'chat',  label: 'Chat',  icon: 'message-circle', route: 'chat', teamOnly: true },
      { key: 'inbox', label: 'Inbox', icon: 'inbox',          global: true },
    ],
  },
];

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
  const [q, setQ] = useState('');
  const { data: space, isLoading, error, refetch } = useQuery({ queryKey: ['space', spaceId], queryFn: () => api.get(`/spaces/${spaceId}`).then((r) => r.data) });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const { data: inbox } = useQuery({ queryKey: ['inbox-count'], queryFn: () => api.get('/inbox', { params: { limit: 1 } }).then((r) => r.data), refetchInterval: 45000 });
  const [openSections, setOpenSections] = useState(() => ({ create: true, work: true, knowledge: true, collaborate: true, ...loadOpenState() }));
  const toggleSection = (k) => setOpenSections((prev) => { const next = { ...prev, [k]: !prev[k] }; saveOpenState(next); return next; });

  useEffect(() => { setQ(''); }, [spaceId]);

  if (isLoading) return <div className="h-screen grid place-items-center"><Loading label="Entering Space…" /></div>;
  if (error) return <div className="h-screen p-8"><ErrorState error={error} onRetry={refetch} /><button className="nv-btn nv-btn-outline ml-4" onClick={() => nav('/dashboard/spaces')}>Back</button></div>;

  const isTeam = space.type === 'team';
  const runQuickCreate = async (kind) => {
    try {
      if (kind === 'notes')       { const { data } = await api.post(`/spaces/${spaceId}/notes`, { title: 'Untitled note' });         nav(`/dashboard/spaces/${spaceId}/notes/${data.id}`); }
      else if (kind === 'documents')  { const { data } = await api.post(`/spaces/${spaceId}/documents`, { title: 'Untitled document' }); nav(`/dashboard/spaces/${spaceId}/documents/${data.id}`); }
      else if (kind === 'pages')  { const { data } = await api.post(`/spaces/${spaceId}/pages`, { title: 'Untitled' });                nav(`/dashboard/spaces/${spaceId}/pages/${data.id}`); }
      else if (kind === 'tasks')     nav(`/dashboard/spaces/${spaceId}/tasks?new=1`);
      else if (kind === 'projects')  nav(`/dashboard/spaces/${spaceId}/projects?new=1`);
      else if (kind === 'meetings')  nav(`/dashboard/spaces/${spaceId}/meetings?new=1`);
      else nav(`/dashboard/spaces/${spaceId}/${kind}`);
    } catch (e) { toast.error(e.message || 'Failed to create'); }
  };

  return (
    <SpaceCtx.Provider value={{ space, spaceId, role: space.role, canWrite: ['owner', 'admin', 'member'].includes(space.role), isAdmin: ['owner', 'admin'].includes(space.role) }}>
      <div className="h-screen flex overflow-hidden bg-[#faf9fb]" data-testid="space-shell">
        {/* ==== Fixed left rail ==== */}
        <aside className="w-[240px] shrink-0 bg-white border-r border-[var(--nv-border)] flex flex-col sticky top-0 h-screen" data-testid="space-sidebar">
          {/* Logo */}
          <div className="px-5 h-[62px] flex items-center cursor-pointer border-b border-[var(--nv-border)]/60" onClick={() => nav('/dashboard/spaces')} data-testid="sidebar-logo">
            <Logo size={26} />
          </div>

          {/* Space switcher card */}
          <div className="px-3 pt-3">
            <Popover align="left" width={280} testId="space-switcher-trigger" trigger={
              <button className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#f6f5fa] text-left border border-transparent hover:border-[var(--nv-border)]" data-testid="space-switcher-button">
                <SpaceIcon icon={space.icon} accent={space.accent} size={34} radius={9} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-extrabold truncate leading-tight">{space.name}</div>
                  <div className="text-[10.5px] nv-muted capitalize leading-tight mt-0.5">{space.type} Space</div>
                </div>
                <Icon name="chevron-down" size={13} className="nv-faint" />
              </button>}>
              {(close) => <SpaceSwitcher spaces={spaces} current={space} onPick={(id) => { close(); nav(`/dashboard/spaces/${id}`); }} onBrain={() => { close(); nav('/dashboard'); }} onCreate={() => { close(); nav('/dashboard/spaces/new'); }} />}
            </Popover>
          </div>

          {/* Search this space */}
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 nv-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in this space..." className="w-full bg-[#f4f3f7] border-0 rounded-lg pl-7 pr-2 h-8 text-[12px] outline-none focus:bg-[#eeecf4]" data-testid="space-search-input" />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-auto nv-scroll px-2 pt-1.5 pb-2 space-y-0.5" data-testid="space-nav">
            <SideItem to={`/dashboard/spaces/${spaceId}`} end icon="home" label="Home" testid="space-nav-home" />
            {isTeam && <SideItem to={`/dashboard/spaces/${spaceId}/my-work`} icon="user" label="My Work" testid="space-nav-my-work" />}

            {SECTIONS.map((section) => {
              const items = section.items.filter((it) => !it.teamOnly || isTeam);
              if (!items.length) return null;
              const isOpen = !!openSections[section.key];
              return (
                <div key={section.key} className="pt-3">
                  <button className="w-full flex items-center px-2 h-6 text-[10.5px] font-extrabold tracking-[0.14em] text-[#8b8a9a] hover:text-black" onClick={() => toggleSection(section.key)} data-testid={`section-toggle-${section.key}`}>
                    <span className="flex-1 text-left">{section.label}</span>
                    <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={11} className="nv-faint" />
                  </button>
                  <div style={{ maxHeight: isOpen ? 500 : 0, overflow: 'hidden', transition: 'max-height 220ms ease' }}>
                    <div className="pt-1 space-y-0.5">
                      {items.map((it) => {
                        if (it.action === 'quick-new') {
                          return (
                            <button key={it.key} className="w-full flex items-center gap-2.5 h-8 px-2 rounded-lg hover:bg-[#eeebfe] text-left" onClick={() => runQuickCreate('notes')} data-testid={`space-create-${it.key}`}>
                              <span className="w-[22px] h-[22px] grid place-items-center rounded-md bg-[#6e56f5] text-white">
                                <Icon name={it.icon} size={12} />
                              </span>
                              <span className="text-[13px] font-bold flex-1">{it.label}</span>
                              <Icon name="chevron-right" size={12} className="nv-faint" />
                            </button>
                          );
                        }
                        if (it.global) {
                          return (
                            <NavLink key={it.key} to="/dashboard/inbox" className={({ isActive }) => `flex items-center gap-2.5 h-8 px-2 rounded-lg ${isActive ? 'bg-[#eeebfe] text-[#5b43e6] font-bold' : 'hover:bg-[#f4f3f7]'}`} data-testid={`space-nav-${it.key}`}>
                              <Icon name={it.icon} size={14} className="nv-faint" />
                              <span className="text-[13px] font-semibold flex-1">{it.label}</span>
                              {inbox?.unread > 0 && (
                                <span className="text-[10px] font-bold text-white bg-[#6e56f5] px-1.5 rounded-full min-w-[18px] text-center" data-testid="inbox-unread-count">{inbox.unread}</span>
                              )}
                            </NavLink>
                          );
                        }
                        if (section.key === 'create') {
                          return (
                            <button key={it.key} className="w-full flex items-center gap-2.5 h-8 px-2 rounded-lg hover:bg-[#f4f3f7] text-left" onClick={() => runQuickCreate(it.route)} data-testid={`space-create-${it.key}`}>
                              <Icon name={it.icon} size={14} className="nv-faint" />
                              <span className="text-[13px] font-semibold flex-1">{it.label}</span>
                            </button>
                          );
                        }
                        return (
                          <NavLink key={it.key} to={`/dashboard/spaces/${spaceId}/${it.route}`} className={({ isActive }) => `flex items-center gap-2.5 h-8 px-2 rounded-lg ${isActive ? 'bg-[#eeebfe] text-[#5b43e6] font-bold' : 'hover:bg-[#f4f3f7]'}`} data-testid={`space-nav-${it.key}`}>
                            <Icon name={it.icon} size={14} className="nv-faint" />
                            <span className="text-[13px] font-semibold flex-1">{it.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer account */}
          <div className="px-2 py-2 border-t border-[var(--nv-border)]">
            <button className="w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#f4f3f7] text-left" onClick={() => nav('/dashboard/settings')} data-testid="space-sidebar-account">
              <Avatar user={user} size={30} />
              <div className="text-[13px] font-bold flex-1 truncate">{user?.name}</div>
              <Icon name="chevron-down" size={13} className="nv-faint" />
            </button>
          </div>
        </aside>

        {/* ==== Main workspace ==== */}
        <div className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </div>
      </div>
    </SpaceCtx.Provider>
  );
}

function SideItem({ to, end, icon, label, testid }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-2.5 h-8 px-2 rounded-lg ${isActive ? 'bg-[#eeebfe] text-[#5b43e6] font-bold' : 'hover:bg-[#f4f3f7] font-semibold'}`} data-testid={testid}>
      <Icon name={icon} size={14} className="nv-faint" />
      <span className="text-[13px] flex-1">{label}</span>
    </NavLink>
  );
}

function SpaceSwitcher({ spaces, current, onPick, onBrain, onCreate }) {
  const groups = [['Personal Spaces', spaces.filter((s) => s.type === 'personal')], ['Team Spaces', spaces.filter((s) => s.type === 'team')]];
  return (
    <div className="p-2" data-testid="space-switcher">
      <div className="px-3 py-2 nv-eyebrow">Current Space</div>
      <div className="flex items-center gap-3 px-3 py-1.5">
        <SpaceIcon icon={current.icon} accent={current.accent} size={28} radius={8} />
        <div className="text-[13px] font-bold">{current.name}</div>
        <Icon name="check" size={14} className="ml-auto text-[#6e56f5]" />
      </div>
      {groups.map(([label, list]) => list.length > 0 && (
        <div key={label}>
          <div className="px-3 pt-3 pb-1 nv-eyebrow">{label}</div>
          {list.map((s) => (
            <button key={s.id} className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#f4f2ff] text-left" onClick={() => onPick(s.id)} data-testid={`switcher-space-${s.id}`}>
              <SpaceIcon icon={s.icon} accent={s.accent} size={24} radius={7} />
              <span className="text-[13px] font-semibold truncate">{s.name}</span>
            </button>
          ))}
        </div>
      ))}
      <div className="border-t border-[var(--nv-border)] mt-2 pt-2 space-y-0.5">
        <button className="w-full flex items-center gap-2.5 h-8 px-3 rounded-lg hover:bg-[#f4f3f7] text-left" onClick={onCreate} data-testid="switcher-create"><Icon name="plus" size={13} /> <span className="text-[13px] font-semibold">Create Space</span></button>
        <button className="w-full flex items-center gap-2.5 h-8 px-3 rounded-lg hover:bg-[#f4f3f7] text-left" onClick={onBrain} data-testid="switcher-brain"><Icon name="arrow-left" size={13} /> <span className="text-[13px] font-semibold">Back to Notevoro</span></button>
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
