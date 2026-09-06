import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Icon, SpaceIcon } from '../lib/icons';
import { ErrorState } from '../lib/ui';

const AGENT_TONES = { atlas: 'blue', nova: 'teal', astra: 'pink', luna: 'violet', voro: 'violet' };
const AGENT_ICONS = { atlas: 'graduation-cap', nova: 'microscope', astra: 'zap', luna: 'moon', voro: 'sparkles' };

export function useVoro(spaceId) {
  const qc = useQueryClient();
  const key = ['voro', spaceId || 'brain'];
  const { data: history = [] } = useQuery({ queryKey: key, queryFn: () => api.get('/voro/history', { params: { space_id: spaceId } }).then((r) => r.data) });
  const [local, setLocal] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const messages = [...history, ...local];
  const ask = async (message, agent = 'voro') => {
    if (!message.trim()) return;
    setError(null);
    setLocal((l) => [...l, { id: `l-${Date.now()}`, role: 'user', content: message, agent }]);
    setBusy(true);
    try {
      const { data } = await api.post('/voro/ask', { message, space_id: spaceId, agent });
      setLocal([]);
      setActions((a) => [...a, ...data.actions]);
      qc.invalidateQueries({ queryKey: key });
      useApp.getState().setEntitlements({ ...useApp.getState().entitlements, usage: data.usage });
    } catch (e) {
      setError(e);
      setLocal((l) => l.slice(0, -1));
    } finally { setBusy(false); }
  };
  const confirm = async (id) => {
    try {
      const { data } = await api.post(`/voro/actions/${id}/confirm`);
      setActions((a) => a.map((x) => (x.id === id ? data : x)));
      toast.success('Voro completed the action');
      qc.invalidateQueries({ queryKey: ['home', spaceId] });
      qc.invalidateQueries({ queryKey: ['tasks', spaceId] });
      qc.invalidateQueries({ queryKey: ['notes', spaceId] });
      qc.invalidateQueries({ queryKey: ['calendar_events', spaceId] });
    } catch (e) { toast.error(e.message); }
  };
  const reject = async (id) => { await api.post(`/voro/actions/${id}/reject`); setActions((a) => a.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x))); };
  return { messages, ask, busy, error, actions, confirm, reject, clearError: () => setError(null) };
}

export function VoroComposer({ onSend, busy, placeholder = 'Ask Voro anything…', large, testId = 'voro-input' }) {
  const [v, setV] = useState('');
  const submit = () => { if (!v.trim() || busy) return; onSend(v); setV(''); };
  return (
    <div className={`flex items-center gap-2 nv-card ${large ? 'px-4 py-2' : 'px-3 py-1.5'} focus-within:border-[#c9bffb] transition-colors`}>
      {large && <div className="w-8 h-8 rounded-full bg-[#eeebfe] grid place-items-center text-[#6e56f5]"><Icon name="sparkles" size={15} /></div>}
      <input data-testid={testId} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={placeholder} className={`flex-1 bg-transparent outline-none ${large ? 'text-[15px] h-10' : 'text-[13px] h-8'}`} />
      <button onClick={submit} disabled={busy} data-testid={`${testId}-send`} className={`grid place-items-center rounded-lg ${large ? 'w-9 h-9 bg-[#6e56f5] text-white hover:bg-[#5b43e6]' : 'w-8 h-8 text-[#6e56f5] hover:bg-[#eeebfe]'} transition-colors`} aria-label="Send">
        <Icon name={busy ? 'loader-2' : large ? 'arrow-right' : 'send'} size={15} className={busy ? 'spin' : ''} />
      </button>
    </div>
  );
}

export function VoroThread({ voro, className = '' }) {
  const ref = useRef();
  useEffect(() => { ref.current?.scrollTo({ top: 1e9 }); }, [voro.messages.length, voro.busy]);
  if (!voro.messages.length && !voro.error) return null;
  return (
    <div ref={ref} className={`overflow-auto nv-scroll space-y-3 ${className}`} data-testid="voro-thread">
      {voro.messages.map((m) => (
        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bubble-me' : 'bubble-them'}`} data-testid={`voro-message-${m.role}`}>{m.content}</div>
        </div>
      ))}
      {voro.actions.filter((a) => a.status === 'pending').map((a) => (
        <div key={a.id} className="nv-card p-3 border-[#d9d4f5] bg-[#faf9ff]" data-testid="voro-action-card">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5b43e6]"><Icon name="shield-check" size={14} /> Confirm action · {a.action_type.replace('_', ' ')}</div>
          <div className="text-xs nv-muted mt-1 break-words">{Object.entries(a.context).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
          <div className="flex gap-2 mt-2"><button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => voro.confirm(a.id)} data-testid="voro-action-confirm">Confirm</button><button className="nv-btn nv-btn-outline nv-btn-sm" onClick={() => voro.reject(a.id)} data-testid="voro-action-reject">Not now</button></div>
        </div>
      ))}
      {voro.busy && <div className="flex items-center gap-2 text-xs nv-muted"><Icon name="loader-2" size={13} className="spin" /> Voro is thinking…</div>}
      {voro.error && <ErrorState error={voro.error} compact onRetry={voro.clearError} />}
    </div>
  );
}

export default function VoroPanel({ space, onClose }) {
  const user = useApp((s) => s.user);
  const nav = useNavigate();
  const voro = useVoro(space?.id);
  const { data: ctx } = useQuery({ queryKey: ['voro-context', space?.id], queryFn: () => api.get('/voro/context', { params: { space_id: space?.id } }).then((r) => r.data), enabled: !!space });
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/voro/agents').then((r) => r.data) });
  const first = (user?.name || '').split(' ')[0];
  const suggestions = space
    ? [['layout-list', 'Summarize this space'], ['file-search', 'Find relevant notes'], ['sparkles', "What's next on my tasks?"], ['calendar-check', 'Help me plan my day']]
    : [['search', 'Research'], ['align-left', 'Summarize'], ['plus', 'Plan'], ['pen-line', 'Create']];
  const suggested = space ? ['Create a project plan for the next sprint', 'Summarize recent team discussions', 'Find related documents', 'Show upcoming deadlines'] : [];
  return (
    <aside className="voro-panel-bg border-l border-[var(--nv-border)] flex flex-col h-full" style={{ width: 340 }} data-testid="voro-panel">
      <div className="flex items-center justify-between px-5" style={{ height: 'var(--header-h)' }}>
        <div className="flex items-center gap-2 font-bold"><Icon name="sparkles" size={18} className="text-[#6e56f5]" /> Voro {!space && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#22b573] ml-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22b573]" /> Online</span>}</div>
        {onClose && <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={onClose} data-testid="voro-panel-close" aria-label="Close Voro"><Icon name="x" size={16} /></button>}
      </div>
      <div className="flex-1 overflow-auto nv-scroll px-4 pb-4 space-y-4">
        <div className="nv-card p-4 bg-[#f4f2ff] border-[#e6e1fb]">
          <div className="flex items-center gap-2 font-bold text-[15px]"><span className="w-7 h-7 rounded-full bg-white grid place-items-center text-[#6e56f5]"><Icon name="sparkles" size={14} /></span> {space ? `Hi ${first}, I'm Voro` : `Hello ${first}!`}</div>
          <div className="text-xs nv-muted mt-2 leading-relaxed">{space ? "Ask me anything about your space, your notes, your tasks, or what you're working on." : 'I can help you with research, planning, writing, analysis, and much more. What would you like to work on today?'}</div>
          <div className="mt-3"><VoroComposer onSend={(m) => voro.ask(m)} busy={voro.busy} testId="voro-panel-input" /></div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {suggestions.map(([ic, s]) => <button key={s} className="nv-chip" onClick={() => voro.ask(s)} data-testid="voro-suggestion"><Icon name={ic} size={12} /> {s}</button>)}
          </div>
        </div>
        <VoroThread voro={voro} className="max-h-[320px]" />
        {space && ctx && (
          <div>
            <div className="text-xs font-bold mb-2">Space Context</div>
            <div className="nv-card p-3 flex items-center gap-3">
              <SpaceIcon icon={space.icon} accent={space.accent} size={34} />
              <div className="flex-1 min-w-0"><div className="text-[13px] font-bold truncate">{space.name}</div><div className="text-[11px] nv-muted capitalize">{space.type} Space</div></div>
              <Icon name="chevron-right" size={14} className="nv-faint" />
            </div>
            <div className="text-[11px] nv-muted mt-2 leading-relaxed">I can see {ctx.counts?.tasks ?? 0} tasks, {ctx.counts?.projects ?? 0} projects, {ctx.counts?.notes ?? 0} notes, and {ctx.counts?.documents ?? 0} documents in this space.</div>
          </div>
        )}
        {space && (
          <div>
            <div className="text-xs font-bold mb-2">Suggested Actions</div>
            <div className="space-y-1">
              {suggested.map((s) => <button key={s} className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg hover:bg-white transition-colors" onClick={() => voro.ask(s)} data-testid="voro-suggested-action"><Icon name="sparkle" size={12} className="nv-faint" /><span className="flex-1">{s}</span><Icon name="arrow-right" size={12} className="nv-faint" /></button>)}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2"><div className="text-xs font-bold flex items-center gap-1.5"><Icon name="bot" size={13} /> AI Agents</div><button className="nv-link" onClick={() => nav(space ? `/dashboard/spaces/${space.id}/voro` : '/dashboard/voro')} data-testid="voro-agents-view-all">View all</button></div>
          <div className="space-y-1">
            {agents.filter((a) => a.key !== 'voro').map((a) => (
              <button key={a.key} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white text-left transition-colors" onClick={() => nav((space ? `/dashboard/spaces/${space.id}/voro` : '/dashboard/voro') + `?agent=${a.key}`)} data-testid={`agent-${a.key}`}>
                <div className={`stat-icon tone-${AGENT_TONES[a.key]}`} style={{ width: 32, height: 32, borderRadius: 999 }}><Icon name={AGENT_ICONS[a.key]} size={14} /></div>
                <div className="flex-1"><div className="text-[13px] font-bold">{a.name}</div><div className="text-[11px] nv-muted">{a.role}</div></div>
                <Icon name="chevron-right" size={13} className="nv-faint" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
