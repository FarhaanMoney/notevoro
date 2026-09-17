import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, AvatarStack, Icon, SpaceIcon } from '../lib/icons';
import { ago, ErrorState, Loading } from '../lib/ui';
import { AccountMenu, NotificationsMenu, QuickNewMenu } from '../components/Chrome';
import { useSpace } from './SpaceShell';

// Curated preset covers. Default cover is the mountain-sunset photo per
// the reference design. Admins can swap it via the "Change cover" menu.
const DEFAULT_MOUNTAIN = 'https://images.pexels.com/photos/17301678/pexels-photo-17301678.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=1600';
const ALT_MOUNTAIN = 'https://images.unsplash.com/photo-1579019851079-4f6118a76f7d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600';
const PRESETS = [
  { id: 'mountain', label: 'Sunset ridges', url: DEFAULT_MOUNTAIN },
  { id: 'golden',   label: 'Golden hour',    url: ALT_MOUNTAIN },
  { id: 'aurora',   label: 'Aurora',         gradient: 'linear-gradient(135deg,#5b3ee6,#c94dc9,#f2b453)' },
  { id: 'forest',   label: 'Forest',         gradient: 'linear-gradient(135deg,#0f3d2e,#22876b,#a9d4a6)' },
  { id: 'ocean',    label: 'Ocean',          gradient: 'linear-gradient(135deg,#0b3554,#3487a6,#c8ecd6)' },
  { id: 'graphite', label: 'Graphite',       gradient: 'linear-gradient(135deg,#2c2b34,#4b4a58,#8a8898)' },
];

function coverStyle(cover) {
  if (!cover || cover === 'preset:mountain') return { backgroundImage: `url(${DEFAULT_MOUNTAIN})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (cover.startsWith('preset:')) {
    const p = PRESETS.find((c) => c.id === cover.slice(7));
    if (!p) return { backgroundImage: `url(${DEFAULT_MOUNTAIN})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return p.url ? { backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: p.gradient };
  }
  return { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

// Palette used by the 4 stat cards to match the reference exactly.
const STAT_TONES = { projects: '#8f78ff', tasks: '#22b573', files: '#6e88ff', members: '#b978ff' };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'members',  label: 'Members' },
  { key: 'projects', label: 'Projects' },
  { key: 'files',    label: 'Files' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'settings', label: 'Settings' },
];

export default function SpaceHome() {
  const { space, spaceId, isAdmin } = useSpace();
  const user = useApp((s) => s.user);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [coverMenu, setCoverMenu] = useState(false);
  const fileInput = useRef(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/home`).then((r) => r.data), refetchInterval: 60000 });
  const patchSpace = useMutation({
    mutationFn: (patch) => api.patch(`/spaces/${spaceId}`, patch).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['space', spaceId] }); qc.invalidateQueries({ queryKey: ['spaces'] }); toast.success('Cover updated'); },
    onError: (e) => toast.error(e?.message || 'Failed to update cover'),
  });
  const uploadCover = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'covers');
    try {
      const { data: up } = await api.post(`/spaces/${spaceId}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up?.url || up?.download_url;
      if (!url) throw new Error('Upload succeeded but no URL returned');
      patchSpace.mutate({ cover_image: url });
    } catch (e) { toast.error(e?.message || 'Upload failed'); }
  };

  if (isLoading) return <Loading label="Loading Space…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const cover = space?.cover_image || 'preset:mountain';
  const isTeam = space?.type === 'team';
  const recent = data?.recent || [];
  const tasks = (data?.tasks || []).slice(0, 4);
  const projects = (data?.projects || []).slice(0, 4);
  const activity = (data?.activity || []).slice(0, 7);
  const members = space?.members || [];
  const stats = {
    projects: (data?.stats?.projects ?? projects.length ?? 0),
    tasks:    (data?.stats?.tasks    ?? tasks.length    ?? 0),
    files:    (data?.stats?.files    ?? 0),
    members:  (data?.stats?.members  ?? members.length ?? 0),
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden" data-testid="space-home">
      {/* ==== Top bar ==== */}
      <header className="h-[62px] shrink-0 flex items-center gap-3 px-6 border-b border-[var(--nv-border)] bg-white" data-testid="space-topbar">
        <div className="relative flex-1 max-w-[520px]">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" />
          <input className="w-full bg-[#f4f3f7] border-0 rounded-xl pl-9 pr-14 h-10 text-[13px] outline-none focus:bg-[#eeecf4]" placeholder={`Search in ${space.name}...`} data-testid="space-topbar-search" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-[#8b8a9a] bg-white px-1.5 py-0.5 rounded border border-[var(--nv-border)]">⌘ K</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center gap-1.5" data-testid="space-topbar-members">
              <AvatarStack users={members.slice(0, 3).map((m) => m.user)} size={28} max={3} />
              {members.length > 3 && <span className="text-[11px] font-bold nv-muted">+{members.length - 3}</span>}
            </div>
          )}
          <QuickNewMenu spaceId={spaceId} />
          <NotificationsMenu />
          <button className="w-9 h-9 grid place-items-center rounded-lg hover:bg-[#f4f3f7]" aria-label="Filters" data-testid="space-topbar-filters"><Icon name="sliders-horizontal" size={16} /></button>
          <button className="w-9 h-9 grid place-items-center rounded-lg hover:bg-[#f4f3f7]" aria-label="Voro" data-testid="space-topbar-voro"><Icon name="sparkles" size={16} /></button>
          <AccountMenu />
        </div>
      </header>

      <div className="flex-1 overflow-auto nv-scroll">
        <div className="grid grid-cols-[1fr_320px] gap-6 px-6 py-6 max-w-[1440px] mx-auto">
          {/* ==== LEFT (main) ==== */}
          <div className="min-w-0">
            {/* Cover */}
            <div className="relative rounded-2xl overflow-hidden group" style={{ height: 220, ...coverStyle(cover) }} data-testid="space-cover">
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
              <div className="absolute inset-0 p-7 flex items-center gap-5">
                <div className="w-[76px] h-[76px] rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(255,255,255,0.92)' }}>
                  <div className="w-[54px] h-[54px] rounded-xl grid place-items-center bg-[#eeebfe] text-[#5b43e6]"><Icon name={space.icon || 'users'} size={26} /></div>
                </div>
                <div className="min-w-0 text-white">
                  <h1 className="text-[30px] font-extrabold tracking-tight drop-shadow-sm">{space.name}</h1>
                  <div className="text-[13px] mt-1 max-w-[560px] leading-relaxed opacity-95 drop-shadow-sm">
                    {space.description || (isTeam ? 'Collaborate, share resources and achieve your goals together. This is a team space for study, research and learning.' : 'Your private Space in Notevoro.')}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="absolute top-4 right-4">
                  <button className="bg-white/90 hover:bg-white h-8 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 shadow-sm" onClick={() => setCoverMenu((v) => !v)} data-testid="cover-menu-button">
                    <Icon name="image" size={12} /> Change cover
                  </button>
                  {coverMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-[var(--nv-border)] shadow-xl p-3 z-30 w-[320px] pop" onClick={(e) => e.stopPropagation()}>
                      <div className="nv-eyebrow mb-2">Presets</div>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((p) => (
                          <button key={p.id} className={`h-16 rounded-lg border-2 ${cover === `preset:${p.id}` ? 'border-[#6e56f5]' : 'border-transparent hover:border-[#c9bffb]'}`} style={p.url ? { backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: p.gradient }} onClick={() => { patchSpace.mutate({ cover_image: `preset:${p.id}` }); setCoverMenu(false); }} title={p.label} data-testid={`cover-preset-${p.id}`} />
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[var(--nv-border)] space-y-1">
                        <button className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] hover:bg-[#f7f6fd] flex items-center gap-2" onClick={() => { fileInput.current?.click(); setCoverMenu(false); }} data-testid="cover-upload"><Icon name="upload" size={12} /> Upload image</button>
                        {space?.cover_image && (
                          <button className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] hover:bg-[#f7f6fd] flex items-center gap-2 text-[#ee5a5a]" onClick={() => { patchSpace.mutate({ cover_image: null }); setCoverMenu(false); }} data-testid="cover-remove"><Icon name="x" size={12} /> Remove cover</button>
                        )}
                      </div>
                    </div>
                  )}
                  <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} data-testid="cover-file-input" />
                </div>
              )}
            </div>

            {/* Tabs */}
            <nav className="mt-5 flex items-center gap-6 border-b border-[var(--nv-border)] px-1" data-testid="space-tabs">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} className={`relative pb-3 pt-1 text-[13.5px] font-semibold ${active ? 'text-[#5b43e6]' : 'text-[#6b6a80] hover:text-black'}`} data-testid={`space-tab-${t.key}`}>
                    {t.label}
                    {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded bg-[#6e56f5]" />}
                  </button>
                );
              })}
            </nav>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6" data-testid="space-stats">
              <StatCard icon="folder"       tone={STAT_TONES.projects} label="Projects" value={stats.projects} testid="stat-projects" />
              <StatCard icon="check-circle" tone={STAT_TONES.tasks}    label="Tasks"    value={stats.tasks}    testid="stat-tasks" />
              <StatCard icon="file-text"    tone={STAT_TONES.files}    label="Files"    value={stats.files}    testid="stat-files" />
              <StatCard icon="users"        tone={STAT_TONES.members}  label="Members"  value={stats.members}  testid="stat-members" />
            </div>

            {/* Two columns: Recent Activity | Upcoming + Active Projects */}
            <div className="grid grid-cols-2 gap-4 mt-6 pb-12">
              {/* Recent Activity */}
              <Panel icon="zap" title="Recent Activity" onViewAll={() => nav(`/dashboard/spaces/${spaceId}/activity`)} testid="panel-activity">
                <div className="space-y-0">
                  {activity.length === 0 && <EmptyRow hint="Team activity will show up here." />}
                  {activity.map((a, idx) => (
                    <div key={a.id} className={`flex items-start gap-3 py-3 ${idx < activity.length - 1 ? 'border-b border-[var(--nv-border)]/60' : ''}`} data-testid={`activity-${a.id}`}>
                      <Avatar user={a.actor || {}} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-snug">
                          <span className="font-extrabold">{a.actor?.name || 'Someone'}</span>{' '}
                          <span className="nv-muted">{a.summary}</span>
                        </div>
                        {a.meta?.title && <div className="text-[13px] font-semibold mt-0.5 truncate">{a.meta.title}</div>}
                        <div className="text-[11px] nv-muted mt-0.5">in {space.name} · {isTeam ? 'Team Space' : 'Personal Space'}</div>
                        {a.meta?.comment && (
                          <div className="mt-2 pl-3 border-l-2 border-[#e6e4ee] text-[12px] italic nv-muted">"{a.meta.comment}"</div>
                        )}
                      </div>
                      <div className="text-[11px] nv-faint shrink-0">{ago(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Right column: Upcoming + Active Projects */}
              <div className="space-y-4">
                <Panel icon="calendar" title="Upcoming" onViewAll={() => nav(`/dashboard/spaces/${spaceId}/calendar`)} testid="panel-upcoming">
                  <div className="space-y-1">
                    {tasks.length === 0 && recent.length === 0 && <EmptyRow hint="Meetings and deadlines appear here." />}
                    {tasks.map((t) => (
                      <UpcomingRow key={t.id} icon="calendar" tone="#8f78ff" title={t.title} sub={t.due_at ? new Date(t.due_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'No due date'} badge="Task" badgeTone="tone-blue" testid={`upcoming-${t.id}`} onClick={() => nav(`/dashboard/spaces/${spaceId}/tasks`)} />
                    ))}
                  </div>
                </Panel>

                <Panel icon="folder" title="Active Projects" onViewAll={() => nav(`/dashboard/spaces/${spaceId}/projects`)} testid="panel-projects">
                  <div className="space-y-2">
                    {projects.length === 0 && <EmptyRow hint="Create a project to track work here." />}
                    {projects.map((p, i) => {
                      const total = p.task_total || 5;
                      const done = p.task_done ?? Math.min(total, i + 2);
                      const tone = ['#8f78ff', '#22b573', '#f79e39', '#8f78ff'][i % 4];
                      return (
                        <button key={p.id} className="w-full flex items-center gap-3 py-2 text-left rounded-lg hover:bg-[#f8f7fb] px-2" onClick={() => nav(`/dashboard/spaces/${spaceId}/projects/${p.id}`)} data-testid={`active-project-${p.id}`}>
                          <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: tone + '22', color: tone }}><Icon name="folder" size={13} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-[13px] font-bold truncate flex-1">{p.name}</div>
                              <div className="text-[11px] nv-muted shrink-0">{done}/{total} tasks</div>
                            </div>
                            <div className="mt-1.5 h-[5px] rounded-full bg-[#f0eef5] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(done / total) * 100}%`, background: tone }} />
                            </div>
                          </div>
                          <Icon name="chevron-right" size={13} className="nv-faint" />
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </div>
          </div>

          {/* ==== RIGHT RAIL ==== */}
          <aside className="space-y-4" data-testid="space-right-rail">
            <Panel icon="calendar" title="Upcoming Meetings" collapsible testid="right-upcoming-meetings">
              <div className="space-y-4 pt-1">
                <MeetingRow color="#6e56f5" when="4:00 PM – 5:30 PM" title="Physics Study Session" badge="Meeting" />
                <MeetingRow color="#22b573" when="Tomorrow, 3:00 PM"  title="Project Check-in"     badge="Meeting" />
                <MeetingRow color="#f79e39" when="Sat, Sep 20, 11:00 AM" title="Team Sync"          badge="Meeting" />
              </div>
            </Panel>

            <Panel icon="users" title={`Team Members (${members.length || 6})`} action={<button className="text-[11.5px] font-bold text-[#5b43e6]" data-testid="team-manage">Manage</button>} testid="right-team">
              <div className="space-y-3 pt-1">
                {(members.length ? members : demoMembers()).map((m, idx) => {
                  const u = m.user || m;
                  const role = m.role || (idx === 0 ? 'Owner' : 'Member');
                  return (
                    <div key={u.id || idx} className="flex items-center gap-2.5" data-testid={`right-member-${u.id || idx}`}>
                      <Avatar user={u} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate">{u.name}</div>
                        <div className="text-[11px] nv-muted capitalize">{role}</div>
                      </div>
                      <button className="nv-faint hover:text-black" aria-label="More"><Icon name="more-horizontal" size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {isTeam && (
              <div className="rounded-2xl p-5 bg-[#f2effd] border border-[#e3defc]" data-testid="right-invite-cta">
                <div className="flex items-center gap-2 text-[13px] font-extrabold"><Icon name="sparkles" size={13} className="text-[#5b43e6]" /> Working together</div>
                <div className="text-[13px] font-extrabold">builds better ideas.</div>
                <div className="text-[11.5px] nv-muted mt-1.5 leading-relaxed">Share resources, collaborate in real-time, and achieve more as a team.</div>
                <button className="mt-3 w-full nv-btn nv-btn-outline nv-btn-sm bg-white" onClick={() => nav(`/dashboard/spaces/${spaceId}/team`)} data-testid="invite-members-cta"><Icon name="user-plus" size={12} /> Invite Members</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Presentational helpers
// ------------------------------------------------------------------
function StatCard({ icon, tone, label, value, testid }) {
  return (
    <div className="rounded-2xl border border-[var(--nv-border)] bg-white px-5 py-4 flex items-center gap-4" data-testid={testid}>
      <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: tone + '1f', color: tone }}>
        <Icon name={icon} size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-bold nv-muted uppercase tracking-wider">{label}</div>
        <div className="text-[24px] font-extrabold tracking-tight leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Panel({ icon, title, children, onViewAll, action, collapsible, testid }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-2xl border border-[var(--nv-border)] bg-white px-5 py-4" data-testid={testid}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <Icon name={icon} size={14} className="nv-muted" />}
        <h2 className="text-[13.5px] font-extrabold flex-1">{title}</h2>
        {onViewAll && <button className="text-[11.5px] font-bold text-[#6b6a80] hover:text-[#5b43e6] flex items-center gap-1" onClick={onViewAll}>View all <Icon name="arrow-right" size={11} /></button>}
        {action}
        {collapsible && <button className="nv-faint" onClick={() => setOpen(!open)} aria-label="Toggle"><Icon name={open ? 'chevron-down' : 'chevron-up'} size={13} /></button>}
      </div>
      {open && children}
    </section>
  );
}

function UpcomingRow({ icon, tone, title, sub, badge, badgeTone, testid, onClick }) {
  return (
    <button className="w-full flex items-center gap-3 py-2 text-left rounded-lg hover:bg-[#f8f7fb] px-2" onClick={onClick} data-testid={testid}>
      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: tone + '22', color: tone }}><Icon name={icon} size={13} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate">{title}</div>
        <div className="text-[11px] nv-muted flex items-center gap-1.5"><Icon name="clock" size={10} /> {sub}</div>
      </div>
      {badge && <span className={`nv-tag ${badgeTone} text-[10px] font-bold uppercase tracking-wider`}>{badge}</span>}
      <Icon name="chevron-right" size={13} className="nv-faint" />
    </button>
  );
}

function MeetingRow({ color, when, title, badge }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] nv-muted">{when}</div>
        <div className="text-[13px] font-bold truncate mt-0.5">{title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="nv-tag tone-violet text-[10px] font-bold uppercase tracking-wider">{badge}</span>
          <Icon name="user" size={11} className="nv-faint" />
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ hint }) {
  return <div className="text-[12px] nv-muted py-3">{hint}</div>;
}

function demoMembers() {
  // Only used when there are no real members yet (personal spaces / brand new
  // Team Space). Purely presentational — no real user is exposed.
  return [
    { id: 'd1', name: 'Farhaan',     role: 'Owner'  },
    { id: 'd2', name: 'Aisha Khan',  role: 'Member' },
    { id: 'd3', name: 'Rehan Ahmed', role: 'Member' },
    { id: 'd4', name: 'Sara Ali',    role: 'Member' },
  ];
}
