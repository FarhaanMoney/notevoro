import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, AvatarStack, Icon, SpaceIcon } from '../lib/icons';
import { ErrorState, Loading } from '../lib/ui';
import { AccountMenu, NotificationsMenu, Popover, QuickNewMenu, SyncBadge } from '../components/Chrome';
import VoroPanel from '../components/VoroPanel';
import { Logo } from './BrainLayout';

const SpaceCtx = createContext(null);
export const useSpace = () => useContext(SpaceCtx);

const KIND_ROUTE = { notes: 'notes', pages: 'pages', documents: 'documents', files: 'files', knowledge: 'knowledge', tasks: 'tasks', projects: 'projects', calendar: 'calendar', meetings: 'meetings', chat: 'chat', team: 'team', activity: 'activity' };
export const capRoute = (c) => (c.kind === 'records' ? `m/${c.key}` : c.kind === 'tool' ? `tools/${c.key}` : c.kind === 'view' ? c.key : KIND_ROUTE[c.kind] || c.key);

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
  useEffect(() => { setQ(''); }, [spaceId]);
  if (isLoading) return <div className="h-screen grid place-items-center"><Loading label="Entering Space…" /></div>;
  if (error) return <div className="h-screen p-8"><ErrorState error={error} onRetry={refetch} /><button className="nv-btn nv-btn-outline ml-4" onClick={() => nav('/dashboard')}>Back to Notevoro</button></div>;
  const isHome = loc.pathname === `/dashboard/spaces/${spaceId}`;
  const isChat = loc.pathname.includes('/chat');
  const members = space.members || [];
  const online = members.filter((m) => presence.has(m.user.id)).length;
  const showVoro = voroOpen && isHome;
  return (
    <SpaceCtx.Provider value={{ space, spaceId, role: space.role, canWrite: ['owner', 'admin', 'member'].includes(space.role), isAdmin: ['owner', 'admin'].includes(space.role) }}>
      <div className="h-screen flex overflow-hidden" data-testid="space-shell">
        <aside className="w-[232px] shrink-0 bg-[var(--nv-sidebar)] border-r border-[var(--nv-border)] flex flex-col" data-testid="space-sidebar">
          <div className="px-5 h-[var(--header-h)] flex items-center cursor-pointer" onClick={() => nav('/dashboard')} data-testid="sidebar-logo"><Logo /></div>
          <div className="px-3">
            <Popover align="left" width={280} testId="space-switcher-trigger" trigger={
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/70 text-left" data-testid="space-switcher-button">
                <SpaceIcon icon={space.icon} accent={space.accent} size={38} radius={11} />
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold truncate">{space.name}</div><div className="text-[11px] nv-muted capitalize">{space.type} Space</div></div>
                <Icon name="chevrons-up-down" size={14} className="nv-faint" />
              </button>}>
              {(close) => <SpaceSwitcher spaces={spaces} current={space} onPick={(id) => { close(); nav(`/dashboard/spaces/${id}`); }} onBrain={() => { close(); nav('/dashboard'); }} onCreate={() => { close(); nav('/dashboard/spaces/new'); }} />}
            </Popover>
          </div>
          <nav className="flex-1 overflow-auto nv-scroll px-3 mt-2 space-y-0.5" data-testid="space-nav">
            <NavLink to={`/dashboard/spaces/${spaceId}`} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-home"><Icon name="home" /> Home</NavLink>
            {space.type === 'team' && (
              <NavLink to={`/dashboard/spaces/${spaceId}/my-work`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-my-work"><Icon name="user" /> My Work</NavLink>
            )}
            {space.sidebar.map((sec) => (
              <div key={sec.section} className="pt-3">
                <div className="nv-eyebrow px-3 mb-1">{sec.section}</div>
                {sec.items.map((c) => <NavLink key={c.key} to={`/dashboard/spaces/${spaceId}/${capRoute(c)}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid={`space-nav-${c.key}`}><Icon name={c.icon} /> {c.name}</NavLink>)}
              </div>
            ))}
            <div className="pt-3 space-y-0.5">
              <NavLink to={`/dashboard/spaces/${spaceId}/library`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-library"><Icon name="layout-grid" /> Space Library</NavLink>
              <NavLink to={`/dashboard/spaces/${spaceId}/voro`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-voro"><Icon name="sparkles" className="text-[#6e56f5]" /> Voro</NavLink>
              <NavLink to={`/dashboard/spaces/${spaceId}/settings`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="space-nav-settings"><Icon name="settings" /> Settings</NavLink>
            </div>
          </nav>
          <div className="p-4 border-t border-[var(--nv-border)]">
            <div className="flex items-center gap-2"><AvatarStack users={members.map((m) => m.user)} size={26} max={3} /></div>
            <div className="flex items-center gap-1.5 text-[11px] nv-muted mt-2" data-testid="members-online"><span className="w-1.5 h-1.5 rounded-full bg-[#22b573]" /> {online} {online === 1 ? 'member' : 'members'} online</div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          {!isChat && (
            <header className="h-[var(--header-h)] shrink-0 flex items-center gap-3 px-6 border-b border-[var(--nv-border)] bg-white/70 backdrop-blur" data-testid="space-header">
              <button className="flex items-center gap-2 font-bold text-[14px] hover:bg-[#f4f2ff] rounded-lg px-2 py-1" onClick={() => nav(`/dashboard/spaces/${spaceId}`)} data-testid="header-space-name"><SpaceIcon icon={space.icon} accent={space.accent} size={22} radius={6} /> {space.name} <Icon name="chevron-down" size={13} className="nv-faint" /></button>
              <form className="flex-1 max-w-[460px] ml-2" onSubmit={(e) => { e.preventDefault(); nav(`/dashboard/spaces/${spaceId}/knowledge?q=${encodeURIComponent(q)}`); }}>
                <div className="relative"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} className="nv-input pl-9 h-9" placeholder="Search this space…" data-testid="space-search-input" /></div>
              </form>
              <div className="ml-auto flex items-center gap-2">
                <QuickNewMenu spaceId={spaceId} compact />
                <NotificationsMenu />
                <button className="nv-btn nv-btn-ghost w-9 px-0" onClick={() => nav(`/dashboard/spaces/${spaceId}/team`)} aria-label="Members" data-testid="header-members-button"><Icon name="users" size={17} /></button>
                {isHome && <button className={`nv-btn nv-btn-ghost w-9 px-0 ${voroOpen ? 'text-[#6e56f5]' : ''}`} onClick={() => setVoroOpen(!voroOpen)} aria-label="Toggle Voro" data-testid="header-voro-toggle"><Icon name="sparkles" size={17} /></button>}
                <AccountMenu />
              </div>
            </header>
          )}
          <div className="flex-1 flex min-h-0">
            <main className={`flex-1 min-w-0 ${isHome || isChat ? 'overflow-hidden' : 'overflow-auto nv-scroll'}`}><Outlet /></main>
            {showVoro && <VoroPanel space={space} onClose={() => setVoroOpen(false)} />}
          </div>
        </div>
      </div>
    </SpaceCtx.Provider>
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
        <button className="nav-item w-full !h-8" onClick={onBrain} data-testid="switcher-manage"><Icon name="layout-grid" /> Manage Spaces</button>
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
