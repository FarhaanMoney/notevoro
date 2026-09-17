import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ago, Loading, Empty } from '../lib/ui';

/**
 * Progress — lightweight overview across all authorized Spaces.
 * Reuses the existing /api/v1/brain endpoint (recent activity + entitlements)
 * so no new backend surface is introduced. Intentionally NOT a giant
 * dashboard — just a scannable orientation view.
 */
export default function ProgressPage() {
  const { data, isLoading } = useQuery({ queryKey: ['brain'], queryFn: () => api.get('/brain').then((r) => r.data) });
  if (isLoading) return <Loading label="Loading progress…" />;
  const spaces = data?.spaces || [];
  const recent = data?.recent || [];
  return (
    <div className="px-8 py-8 max-w-[980px] mx-auto" data-testid="progress-page">
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-green" style={{ width: 46, height: 46 }}><Icon name="trending-up" size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">Progress</h1>
          <div className="text-[13px] nv-muted mt-1 max-w-[560px]">Where your work stands across every authorized Space.</div>
        </div>
      </div>
      {!recent.length && !spaces.length ? (
        <Empty icon="activity" title="Nothing to report yet" hint="As you create and update objects, they show up here." />
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <section>
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider mb-3">Recent work</h2>
            <div className="space-y-1">
              {recent.map((r) => (
                <div key={`${r.kind}-${r.id}`} className="nv-card p-3 flex items-center gap-3">
                  <div className="stat-icon tone-slate" style={{ width: 30, height: 30 }}><Icon name={iconFor(r.kind)} size={13} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate">{r.title || 'Untitled'}</div>
                    <div className="text-[11px] nv-muted truncate">{r.space?.name} · {ago(r.updated_at)}</div>
                  </div>
                </div>
              ))}
              {!recent.length && <div className="text-[12px] nv-muted">No recent updates.</div>}
            </div>
          </section>
          <section>
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider mb-3">Your Spaces</h2>
            <div className="space-y-1">
              {spaces.map((s) => (
                <div key={s.id} className="nv-card p-3 flex items-center gap-3">
                  <div className="stat-icon tone-violet" style={{ width: 30, height: 30 }}><Icon name={s.type === 'team' ? 'users' : 'user'} size={13} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate">{s.name}</div>
                    <div className="text-[11px] nv-muted truncate">{s.member_count} member{s.member_count === 1 ? '' : 's'} · last active {ago(s.last_active_at) || 'a while ago'}</div>
                  </div>
                </div>
              ))}
              {!spaces.length && <div className="text-[12px] nv-muted">No Spaces yet.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function iconFor(kind) {
  return { note: 'file-text', document: 'file', project: 'layers', task: 'check-square' }[kind] || 'circle';
}
