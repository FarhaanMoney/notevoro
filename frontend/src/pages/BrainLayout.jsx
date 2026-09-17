import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon } from '../lib/icons';
import { AccountMenu, NotificationsMenu, QuickNewMenu } from '../components/Chrome';
import VoroPanel from '../components/VoroPanel';
import { useEffect, useState } from 'react';

/**
 * The Notevoro global sidebar.
 * Kept intentionally compact (11 items) so the product can grow to hundreds
 * of features without navigation bloat. Individual features (Files, Datasets,
 * Whiteboards, Flashcards, Quizzes, etc.) are reachable from Tools, VoroHub,
 * Projects, contextual surfaces, Search and Quick Create — NOT from here.
 */

export function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2 select-none" data-testid="logo">
      <div className="grid place-items-center rounded-lg bg-[#6e56f5] text-white" style={{ width: size, height: size }}>
        <Icon name="sparkles" size={size * 0.55} />
      </div>
      <span className="font-extrabold tracking-tight" style={{ fontSize: size * 0.72 }}>
        note<span className="text-[#6e56f5]">voro</span>
      </span>
    </div>
  );
}

const PRIMARY_NAV = [
  { to: '/dashboard',              label: 'Home',        icon: 'home',       testid: 'nav-home',        end: true },
  { to: '/dashboard/inbox',        label: 'Inbox',       icon: 'inbox',      testid: 'nav-inbox',       hasUnread: true },
  { to: '/dashboard/spaces',       label: 'Spaces',      icon: 'grid-2x2',   testid: 'nav-spaces' },
  { to: '/dashboard/vorohub',      label: 'VoroHub',     icon: 'sparkles',   testid: 'nav-vorohub' },
  { to: '/dashboard/notes',        label: 'Notes',       icon: 'file-text',  testid: 'nav-notes' },
  { to: '/dashboard/projects',     label: 'Projects',    icon: 'layers',     testid: 'nav-projects' },
  { to: '/dashboard/transcriber',  label: 'Transcriber', icon: 'mic',        testid: 'nav-transcriber' },
  { to: '/dashboard/tools',        label: 'Tools',       icon: 'grid',       testid: 'nav-tools' },
  { to: '/dashboard/agents',       label: 'Agents',      icon: 'bot',        testid: 'nav-agents' },
];

const FOOTER_NAV = [
  { to: '/dashboard/progress', label: 'Progress', icon: 'trending-up', testid: 'nav-progress' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings',    testid: 'nav-settings' },
];

export default function BrainLayout() {
  const user = useApp((s) => s.user);
  const ent = useApp((s) => s.entitlements);
  const { voroOpen, setVoroOpen } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const { data: inbox } = useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => api.get('/inbox', { params: { limit: 1 } }).then((r) => r.data),
    refetchInterval: 45000,
  });
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); nav('/dashboard/search'); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);
  const showVoro = voroOpen && loc.pathname === '/dashboard';

  return (
    <div className="h-screen flex overflow-hidden" data-testid="brain-layout">
      <aside className="w-[220px] shrink-0 bg-[var(--nv-sidebar)] border-r border-[var(--nv-border)] flex flex-col" data-testid="brain-sidebar">
        <div className="px-5 h-[var(--header-h)] flex items-center"><Logo /></div>
        <nav className="px-3 flex-1 overflow-auto nv-scroll space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid={item.testid}
            >
              <Icon name={item.icon} /> {item.label}
              {item.hasUnread && inbox?.unread > 0 && (
                <span className="ml-auto text-[10.5px] font-bold text-[#5b43e6]" data-testid="inbox-unread-count">{inbox.unread}</span>
              )}
            </NavLink>
          ))}
          <div className="pt-3 mt-1 border-t border-[var(--nv-border)] space-y-0.5">
            {FOOTER_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-testid={item.testid}>
                <Icon name={item.icon} /> {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="p-3 space-y-3">
          {ent?.plan === 'free' && (
            <button onClick={() => nav('/dashboard/settings?tab=billing')} className="w-full text-left nv-card p-3 bg-[#f1efff] border-[#e3defc] hover:border-[#c9bffb] transition-colors" data-testid="upgrade-card">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#5b43e6]"><Icon name="crown" size={14} /> Upgrade to Pro</div>
              <div className="text-[11px] nv-muted mt-0.5">Unlock more AI, sync, and collaboration.</div>
            </button>
          )}
          <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/70 text-left" onClick={() => nav('/dashboard/settings')} data-testid="sidebar-account">
            <Avatar user={user} size={34} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate">{user?.name}</div>
              <div className="text-[11px] nv-muted truncate">{user?.email}</div>
            </div>
            <Icon name="chevron-down" size={14} className="nv-faint" />
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[var(--header-h)] shrink-0 flex items-center gap-3 px-6 border-b border-[var(--nv-border)] bg-white/70 backdrop-blur" data-testid="brain-header">
          <form className="flex-1 max-w-[480px]" onSubmit={(e) => { e.preventDefault(); nav(`/dashboard/search?q=${encodeURIComponent(q)}`); }}>
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="nv-input pl-9 pr-12 h-9" placeholder="Search anything in Notevoro…" data-testid="global-search-input" />
              <span className="kbd absolute right-3 top-1/2 -translate-y-1/2">⌘ K</span>
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <QuickNewMenu />
            <NotificationsMenu />
            <button className="nv-btn nv-btn-ghost w-9 px-0" onClick={() => setVoroOpen(!voroOpen)} aria-label="Toggle Voro" data-testid="toggle-voro-button">
              <Icon name="sparkles" size={17} />
            </button>
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
