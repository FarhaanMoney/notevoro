import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { AccountMenu, NotificationsMenu, QuickNewMenu } from '../components/Chrome';
import VoroPanel from '../components/VoroPanel';
import { useEffect, useState } from 'react';

export function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2 select-none" data-testid="logo">
      <div className="grid place-items-center rounded-lg bg-[#6e56f5] text-white" style={{ width: size, height: size }}><Icon name="sparkles" size={size * 0.55} /></div>
      <span className="font-extrabold tracking-tight" style={{ fontSize: size * 0.72 }}>note<span className="text-[#6e56f5]">voro</span></span>
    </div>
  );
}

export default function BrainLayout() {
  const user = useApp((s) => s.user);
  const ent = useApp((s) => s.entitlements);
  const { voroOpen, setVoroOpen } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); nav('/dashboard/search'); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);
  const personal = spaces.filter((s) => s.type === 'personal');
  const team = spaces.filter((s) => s.type === 'team');
  const showVoro = voroOpen && loc.pathname === '/dashboard';
  return (
    <div className="h-screen flex overflow-hidden" data-testid="brain-layout">
      <aside className="w-[232px] shrink-0 bg-[var(--nv-sidebar)] border-r border-[var(--nv-border)] flex flex-col" data-testid="brain-sidebar">
        <div className="px-5 h-[var(--header-h)] flex items-center"><Logo /></div>
        <nav className="px-3 space-y-0.5 mt-1">
          <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="nav-home"><Icon name="home" /> Home</NavLink>
          <NavLink to="/dashboard/today" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="nav-today"><Icon name="calendar" /> Today</NavLink>
          <NavLink to="/dashboard/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="nav-search"><Icon name="search" /> Search <span className="ml-auto kbd">⌘ K</span></NavLink>
        </nav>
        <div className="px-3 mt-5 flex-1 overflow-auto nv-scroll">
          <div className="flex items-center justify-between px-3 mb-1"><span className="nv-eyebrow">Spaces</span><button className="nv-faint hover:text-[#6e56f5]" onClick={() => nav('/dashboard/spaces/new')} data-testid="sidebar-create-space" aria-label="Create Space"><Icon name="plus" size={14} /></button></div>
          <SpaceGroup label="Personal" icon="user" spaces={personal} />
          <SpaceGroup label="Team" icon="users" spaces={team} />
          <div className="mt-5 space-y-0.5">
            <NavLink to="/dashboard/voro" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="nav-voro"><Icon name="sparkles" className="text-[#6e56f5]" /> <span className="nv-eyebrow !text-[12px] !tracking-wide" style={{ color: 'inherit' }}>VORO</span></NavLink>
            <NavLink to="/dashboard/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid="nav-settings"><Icon name="settings" /> Settings</NavLink>
          </div>
        </div>
        <div className="p-3 space-y-3">
          {ent?.plan === 'free' && (
            <button onClick={() => nav('/dashboard/settings?tab=billing')} className="w-full text-left nv-card p-3 bg-[#f1efff] border-[#e3defc] hover:border-[#c9bffb] transition-colors" data-testid="upgrade-card">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#5b43e6]"><Icon name="crown" size={14} /> Upgrade to Pro</div>
              <div className="text-[11px] nv-muted mt-0.5">Unlock more AI, sync, and collaboration.</div>
            </button>
          )}
          <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/70 text-left" onClick={() => nav('/dashboard/settings')} data-testid="sidebar-account">
            <Avatar user={user} size={34} />
            <div className="flex-1 min-w-0"><div className="text-[13px] font-bold truncate">{user?.name}</div><div className="text-[11px] nv-muted truncate">{user?.email}</div></div>
            <Icon name="chevron-down" size={14} className="nv-faint" />
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[var(--header-h)] shrink-0 flex items-center gap-3 px-6 border-b border-[var(--nv-border)] bg-white/70 backdrop-blur" data-testid="brain-header">
          <form className="flex-1 max-w-[480px]" onSubmit={(e) => { e.preventDefault(); nav(`/dashboard/search?q=${encodeURIComponent(q)}`); }}>
            <div className="relative"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} className="nv-input pl-9 pr-12 h-9" placeholder="Search anything in Notevoro…" data-testid="global-search-input" /><span className="kbd absolute right-3 top-1/2 -translate-y-1/2">⌘ K</span></div>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <QuickNewMenu />
            <NotificationsMenu />
            <button className="nv-btn nv-btn-ghost w-9 px-0" onClick={() => setVoroOpen(!voroOpen)} aria-label="Toggle Voro" data-testid="toggle-voro-button"><Icon name="users" size={17} /></button>
            <AccountMenu />
          </div>
        </header>
        <div className="flex-1 flex min-h-0">
          <main className="flex-1 min-w-0 overflow-auto nv-scroll"><Outlet /></main>
          {showVoro && <VoroPanel onClose={() => setVoroOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

function SpaceGroup({ label, icon, spaces }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button className="nav-item w-full" onClick={() => setOpen((o) => !o)} data-testid={`space-group-${label.toLowerCase()}`}><Icon name={icon} /> {label} <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} className="ml-auto nv-faint" /></button>
      {open && spaces.map((s) => (
        <NavLink key={s.id} to={`/dashboard/spaces/${s.id}`} className="nav-item !h-8 !pl-7 !font-medium" data-testid={`sidebar-space-${s.id}`}><SpaceIcon icon={s.icon} accent={s.accent} size={18} radius={5} /> <span className="truncate">{s.name}</span></NavLink>
      ))}
    </div>
  );
}
