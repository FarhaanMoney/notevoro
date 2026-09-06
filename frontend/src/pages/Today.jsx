import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../lib/api';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ago, dueLabel, Empty, ErrorState, fmtTime, Loading, priorityTone, Tag } from '../lib/ui';

export default function Today() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['brain'], queryFn: () => api.get('/brain').then((r) => r.data) });
  const { data: activity = [] } = useQuery({ queryKey: ['activity', 'me'], queryFn: () => api.get('/activity').then((r) => r.data) });
  const tasksQ = useQuery({ queryKey: ['today-tasks', data?.spaces?.map((s) => s.id).join()], enabled: !!data, queryFn: async () => (await Promise.all(data.spaces.map((s) => api.get(`/spaces/${s.id}/tasks`, { params: { limit: 100 } }).then((r) => r.data.map((t) => ({ ...t, space: s })))))).flat() });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const tasks = (tasksQ.data || []).filter((t) => t.status !== 'done' && (!t.due_at || dayjs(t.due_at).isBefore(dayjs().endOf('day').add(1, 'day')))).sort((a, b) => (a.due_at || 'z').localeCompare(b.due_at || 'z')).slice(0, 12);
  return (
    <div className="px-8 py-7 max-w-[1100px] fade-up" data-testid="today-page">
      <h1 className="nv-h1 text-[28px]">{dayjs().format('dddd, MMMM D')}</h1><p className="nv-muted text-sm mt-1">Across all your Spaces — what matters today.</p>
      <div className="grid grid-cols-[1.2fr_1fr] gap-5 mt-6">
        <div className="space-y-5">
          <div className="nv-card p-4" data-testid="today-schedule"><div className="nv-h2 flex items-center gap-2 mb-3"><Icon name="calendar" size={15} className="text-[#6e56f5]" /> Schedule</div>{!data.today.length ? <Empty icon="calendar" title="Nothing scheduled today" /> : data.today.map((e) => <button key={e.id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#faf9ff] text-left" onClick={() => nav(`/dashboard/spaces/${e.space_id}/calendar`)}><span className={`w-1.5 h-1.5 rounded-full bg-${e.color || 'violet'}`} /><span className="text-xs nv-muted w-20">{fmtTime(e.start_at)}</span><span className="text-[13px] font-semibold flex-1">{e.title}</span><span className="text-[11px] nv-muted">{e.space.name}</span></button>)}</div>
          <div className="nv-card p-4" data-testid="today-tasks"><div className="nv-h2 flex items-center gap-2 mb-3"><Icon name="check-square" size={15} className="text-[#22b573]" /> Tasks due soon</div>{tasksQ.isLoading ? <Loading /> : !tasks.length ? <Empty icon="check-square" title="Nothing due" /> : tasks.map((t) => <button key={t.id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#faf9ff] text-left" onClick={() => nav(`/dashboard/spaces/${t.space.id}/tasks`)}><SpaceIcon icon={t.space.icon} accent={t.space.accent} size={20} radius={6} /><span className="text-[13px] font-semibold flex-1 truncate">{t.title}</span><Tag tone={priorityTone(t.priority)}>{t.priority}</Tag><span className="text-[11px] nv-muted w-16 text-right">{dueLabel(t.due_at) || 'No date'}</span></button>)}</div>
        </div>
        <div className="nv-card p-4" data-testid="today-activity"><div className="nv-h2 flex items-center gap-2 mb-3"><Icon name="activity" size={15} className="text-[#6e56f5]" /> Recent across Spaces</div>{!activity.length ? <Empty icon="activity" title="No activity yet" /> : activity.map((a) => <div key={a.id} className="flex items-start gap-2.5 py-2"><Avatar user={a.actor} size={26} /><div className="min-w-0"><div className="text-[12.5px]">{a.summary}</div><div className="text-[10.5px] nv-faint">{a.space.name} · {ago(a.created_at)}</div></div></div>)}</div>
      </div>
    </div>
  );
}
