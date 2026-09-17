import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon, SpaceIcon } from '../lib/icons';
import { Loading, Empty } from '../lib/ui';

/**
 * Global entry points that keep the sidebar compact.
 *
 * Every top-level global item (Notes, Projects, Transcriber, VoroHub, ...)
 * ultimately opens INSIDE a Space, because Notevoro objects always live
 * in a Space. When the user has only one Space, we redirect directly.
 * When they have multiple, we render a small picker so they can choose.
 *
 * These do NOT add new backend surface — they route to existing per-Space
 * modules that were previously reachable only from the Space sidebar.
 */
function SpacePickerLanding({ title, subtitle, icon, feature }) {
  const { data: spaces = [], isLoading } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const nav = useNavigate();
  if (isLoading) return <Loading label={`Opening ${title}…`} />;
  if (!spaces.length) {
    return (
      <div className="px-8 py-8 max-w-[720px]" data-testid={`landing-${feature}`}>
        <Empty icon="users" title="Create a Space first" hint={`${title} lives inside a Space so your work stays organized.`} action={<button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => nav('/dashboard/spaces/new')}>Create a Space</button>} />
      </div>
    );
  }
  if (spaces.length === 1) return <Navigate to={`/dashboard/spaces/${spaces[0].id}/${feature}`} replace />;
  return (
    <div className="px-8 py-8 max-w-[720px] mx-auto" data-testid={`landing-${feature}`}>
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-slate" style={{ width: 46, height: 46 }}><Icon name={icon} size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">{title}</h1>
          <div className="text-[13px] nv-muted mt-1">{subtitle}</div>
        </div>
      </div>
      <div className="nv-eyebrow mb-2">Open in a Space</div>
      <div className="grid grid-cols-2 gap-3">
        {spaces.map((s) => (
          <button key={s.id} className="nv-card p-4 flex items-center gap-3 text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(`/dashboard/spaces/${s.id}/${feature}`)} data-testid={`landing-space-${s.id}`}>
            <SpaceIcon icon={s.icon} accent={s.accent} size={34} radius={9} />
            <div className="min-w-0">
              <div className="font-bold text-[13.5px] truncate">{s.name}</div>
              <div className="text-[11.5px] nv-muted capitalize">{s.type} Space</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NotesLanding() {
  return <SpacePickerLanding title="Notes" subtitle="Notes and Pages across your Spaces. Pick one to continue." icon="file-text" feature="notes" />;
}
export function ProjectsLanding() {
  return <SpacePickerLanding title="Projects" subtitle="Projects with tasks, docs, meetings and decisions." icon="layers" feature="projects" />;
}
export function TranscriberLanding() {
  return <SpacePickerLanding title="Transcriber" subtitle="Upload audio, get a searchable transcript with action items." icon="mic" feature="tools/transcriber" />;
}
export function VoroHubLanding() {
  return <SpacePickerLanding title="VoroHub" subtitle="AI-native learning — sources, research, notes, flashcards, quizzes." icon="sparkles" feature="voro" />;
}
export function SpacesLanding() {
  const { data: spaces = [], isLoading } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const nav = useNavigate();
  if (isLoading) return <Loading />;
  return (
    <div className="px-8 py-8 max-w-[820px] mx-auto" data-testid="spaces-landing">
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-violet" style={{ width: 46, height: 46 }}><Icon name="grid-2x2" size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">Spaces</h1>
          <div className="text-[13px] nv-muted mt-1">All of your Personal and Team Spaces.</div>
        </div>
        <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => nav('/dashboard/spaces/new')} data-testid="spaces-new"><Icon name="plus" size={13} /> New Space</button>
      </div>
      {['personal', 'team'].map((t) => (
        <section key={t} className="mb-6">
          <h2 className="text-[12px] font-extrabold uppercase tracking-wider mb-3">{t} Spaces</h2>
          <div className="grid grid-cols-2 gap-3">
            {spaces.filter((s) => s.type === t).map((s) => (
              <button key={s.id} className="nv-card p-4 flex items-center gap-3 text-left hover:border-[#c9bffb] transition-colors" onClick={() => nav(`/dashboard/spaces/${s.id}`)} data-testid={`landing-space-card-${s.id}`}>
                <SpaceIcon icon={s.icon} accent={s.accent} size={38} radius={10} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13.5px] truncate">{s.name}</div>
                  <div className="text-[11.5px] nv-muted">{s.member_count} member{s.member_count === 1 ? '' : 's'}</div>
                </div>
              </button>
            ))}
            {!spaces.filter((s) => s.type === t).length && <div className="text-[12.5px] nv-muted">No {t} Spaces yet.</div>}
          </div>
        </section>
      ))}
    </div>
  );
}
