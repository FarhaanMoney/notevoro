import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ago, ErrorState, Loading } from '../lib/ui';
import { useSpace } from './SpaceShell';

// Curated Notevoro landscape covers — reusable, no external requests.
// Uses CSS gradients so no image assets need to ship.
const PRESET_COVERS = [
  { id: 'aurora',   label: 'Aurora',   css: 'linear-gradient(135deg,#5b3ee6 0%,#c94dc9 50%,#f2b453 100%)' },
  { id: 'graphite', label: 'Graphite', css: 'linear-gradient(135deg,#2c2b34 0%,#4b4a58 50%,#8a8898 100%)' },
  { id: 'forest',   label: 'Forest',   css: 'linear-gradient(135deg,#0f3d2e 0%,#22876b 50%,#a9d4a6 100%)' },
  { id: 'sunset',   label: 'Sunset',   css: 'linear-gradient(135deg,#f26c3d 0%,#c94dc9 50%,#5b43e6 100%)' },
  { id: 'ocean',    label: 'Ocean',    css: 'linear-gradient(135deg,#0b3554 0%,#3487a6 50%,#c8ecd6 100%)' },
  { id: 'sand',     label: 'Sand',     css: 'linear-gradient(135deg,#e0c9a7 0%,#c0996e 50%,#7c5636 100%)' },
];

function coverStyle(cover) {
  if (!cover) return { background: PRESET_COVERS[0].css };
  if (cover.startsWith('preset:')) {
    const p = PRESET_COVERS.find((c) => c.id === cover.slice(7));
    return { background: (p || PRESET_COVERS[0]).css };
  }
  return { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

export default function SpaceHome() {
  const { space, spaceId, isAdmin } = useSpace();
  const user = useApp((s) => s.user);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/home`).then((r) => r.data), refetchInterval: 60000 });
  const [coverMenu, setCoverMenu] = useState(false);
  const fileInput = useRef(null);

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
    } catch (e) {
      toast.error(e?.message || 'Upload failed');
    }
  };

  if (isLoading) return <Loading label="Loading your Space…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const cover = space?.cover_image || 'preset:aurora';
  const isTeam = space?.type === 'team';
  const recent = data?.recent || [];
  const tasks = (data?.tasks || []).slice(0, 5);
  const projects = (data?.projects || []).slice(0, 4);
  const activity = (data?.activity || []).slice(0, 6);
  const members = space?.members || [];

  return (
    <div className="fade-up" data-testid="space-home">
      {/* Cover */}
      <div className="relative group" style={{ height: 220, ...coverStyle(cover) }} data-testid="space-cover">
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="absolute top-4 right-4">
          {isAdmin && (
            <div className="relative">
              <button className="nv-btn nv-btn-ghost bg-white/85 hover:bg-white h-8 px-3 text-[12px] font-semibold" onClick={() => setCoverMenu((v) => !v)} data-testid="cover-menu-button">
                <Icon name="image" size={13} /> Change cover
              </button>
              {coverMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white nv-card p-3 z-30 w-[300px] pop" onClick={(e) => e.stopPropagation()}>
                  <div className="nv-eyebrow mb-2">Preset covers</div>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_COVERS.map((p) => (
                      <button key={p.id} className={`h-14 rounded-lg border ${cover === `preset:${p.id}` ? 'border-[#6e56f5] ring-2 ring-[#c9bffb]' : 'border-transparent hover:border-[#c9bffb]'}`} style={{ background: p.css }} onClick={() => { patchSpace.mutate({ cover_image: `preset:${p.id}` }); setCoverMenu(false); }} title={p.label} data-testid={`cover-preset-${p.id}`} />
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--nv-border)] space-y-1">
                    <button className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] hover:bg-[#f7f6fd]" onClick={() => { fileInput.current?.click(); setCoverMenu(false); }} data-testid="cover-upload">
                      <Icon name="upload" size={12} /> Upload image
                    </button>
                    {space?.cover_image && (
                      <button className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] hover:bg-[#f7f6fd] text-[#ee5a5a]" onClick={() => { patchSpace.mutate({ cover_image: null }); setCoverMenu(false); }} data-testid="cover-remove">
                        <Icon name="x" size={12} /> Remove cover
                      </button>
                    )}
                  </div>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} data-testid="cover-file-input" />
            </div>
          )}
        </div>
      </div>

      {/* Space header */}
      <div className="max-w-[1080px] mx-auto px-8 -mt-8 relative">
        <div className="flex items-end gap-4">
          <SpaceIcon icon={space.icon} accent={space.accent} size={64} radius={16} className="shadow-lg ring-4 ring-white" />
          <div className="flex-1 min-w-0 pb-2">
            <h1 className="text-[28px] font-extrabold tracking-tight">{space.name}</h1>
            <div className="text-[12.5px] nv-muted">{space.type === 'team' ? 'Team Space' : 'Personal Space'}{space.description ? ` · ${space.description}` : ''}</div>
          </div>
          {isTeam && (
            <button className="nv-btn nv-btn-outline nv-btn-sm" onClick={() => nav(`/dashboard/spaces/${spaceId}/team`)} data-testid="space-home-invite"><Icon name="user-plus" size={12} /> Invite</button>
          )}
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-3 gap-6 mt-8 pb-12">
          <section className="col-span-2 space-y-6">
            <Panel title="Continue working" icon="rotate-cw" empty={!recent.length} emptyHint="Recently edited objects will appear here.">
              <div className="grid grid-cols-2 gap-3">
                {recent.slice(0, 6).map((r) => (
                  <button key={`${r.kind}-${r.id}`} className="nv-card p-3 flex items-start gap-3 text-left hover:border-[#c9bffb]" onClick={() => nav(`/dashboard/spaces/${spaceId}/${r.kind}s/${r.id}`)} data-testid={`recent-${r.id}`}>
                    <div className="stat-icon tone-slate" style={{ width: 30, height: 30 }}><Icon name={iconFor(r.kind)} size={13} /></div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">{r.title || 'Untitled'}</div>
                      <div className="text-[11px] nv-muted capitalize">{r.kind} · {ago(r.updated_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Active projects" icon="layers" empty={!projects.length} emptyHint="Create a project to track work here.">
              <div className="space-y-2">
                {projects.map((p) => (
                  <button key={p.id} className="nv-card p-3 flex items-center gap-3 text-left w-full hover:border-[#c9bffb]" onClick={() => nav(`/dashboard/spaces/${spaceId}/projects/${p.id}`)} data-testid={`project-${p.id}`}>
                    <div className="stat-icon tone-violet" style={{ width: 30, height: 30 }}><Icon name="layers" size={13} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{p.name}</div>
                      <div className="text-[11px] nv-muted capitalize">{p.status} · updated {ago(p.updated_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </section>

          <aside className="space-y-6">
            <Panel title="Upcoming" icon="calendar" empty={!tasks.length} emptyHint="Meetings, deadlines and tasks appear here.">
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="nv-card p-3">
                    <div className="text-[12.5px] font-bold truncate">{t.title}</div>
                    <div className="text-[11px] nv-muted">{t.due_at ? `Due ${ago(t.due_at)}` : 'No due date'}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent activity" icon="activity" empty={!activity.length} emptyHint="Team activity shows up here.">
              <div className="space-y-2">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[12px]">
                    <Avatar user={a.actor || {}} size={22} />
                    <div className="min-w-0"><span className="font-semibold">{a.actor?.name || 'Someone'}</span> <span className="nv-muted">{a.summary}</span><div className="text-[10.5px] nv-faint">{ago(a.created_at)}</div></div>
                  </div>
                ))}
              </div>
            </Panel>

            {isTeam && members.length > 0 && (
              <Panel title={`Team · ${members.length}`} icon="users" empty={false}>
                <div className="flex flex-wrap gap-1.5">
                  {members.slice(0, 12).map((m) => <Avatar key={m.user.id} user={m.user} size={26} />)}
                </div>
              </Panel>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children, empty, emptyHint }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} size={13} className="nv-muted" />
        <h2 className="text-[12px] font-extrabold uppercase tracking-wider">{title}</h2>
      </div>
      {empty ? (
        <div className="nv-card p-4 text-[12px] nv-muted">{emptyHint}</div>
      ) : children}
    </section>
  );
}

function iconFor(kind) {
  return { note: 'file-text', document: 'file', project: 'layers', task: 'check-square', page: 'file-stack', file: 'folder', meeting: 'video' }[kind] || 'circle';
}
