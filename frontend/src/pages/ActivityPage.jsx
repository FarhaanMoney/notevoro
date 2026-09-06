import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Avatar, Icon } from '../lib/icons';
import { ago, Empty, ErrorState, Loading } from '../lib/ui';
import { PageHeader, useSpace } from './SpaceShell';

export default function ActivityPage() {
  const { spaceId } = useSpace();
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['activity', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/activity`).then((r) => r.data) });
  return (
    <div className="fade-up" data-testid="activity-page">
      <PageHeader icon="activity" title="Activity" subtitle="Everything happening in this Space — auditable, in order." />
      <div className="px-7 pb-8 max-w-[800px]">
        {isLoading && <Loading />}{error && <ErrorState error={error} onRetry={refetch} />}
        {!isLoading && !data.length && <Empty icon="activity" title="Quiet so far" hint="Activity appears as people create, edit and collaborate." />}
        <div className="relative pl-6">{data.length > 0 && <div className="absolute left-[17px] top-3 bottom-3 w-px bg-[var(--nv-border)]" />}
          {data.map((a) => <div key={a.id} className="relative flex items-start gap-3 py-2.5" data-testid="activity-row"><div className="absolute -left-6 top-3 w-6 h-6 rounded-full ring-4 ring-[var(--nv-bg)]"><Avatar user={a.actor} size={24} /></div><div className="ml-3 flex-1"><div className="text-[13px]">{a.summary}</div><div className="text-[11px] nv-faint flex items-center gap-1.5 mt-0.5"><Icon name="clock" size={10} /> {ago(a.created_at)} · {a.type}</div></div></div>)}
        </div>
      </div>
    </div>
  );
}
