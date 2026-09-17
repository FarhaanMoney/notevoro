import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon, SpaceIcon } from '../lib/icons';
import { Empty, Loading } from '../lib/ui';
import { FEATURES, featuresByCategory, resolveRoute } from '../lib/features';

/**
 * Tools — the scalable feature launcher.
 * All non-primary features (Files, Datasets, Forms, Whiteboards, Calendar,
 * Flashcards, Quizzes, Tests, Mind Maps, Automations, Transcriber, Meetings,
 * Research, Sources, Knowledge, Chat, …) live here, organized by category.
 * Adding a new feature to lib/features.js makes it appear here automatically
 * WITHOUT another global sidebar item.
 */
export default function ToolsHub() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => api.get('/spaces').then((r) => r.data) });
  const [spaceId, setSpaceId] = useState('');

  // Auto-select first Personal Space as default context if user hasn't chosen.
  const activeSpaceId = spaceId || (spaces.find((s) => s.type === 'personal')?.id) || spaces[0]?.id || '';

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return featuresByCategory();
    return featuresByCategory().map((cat) => ({
      ...cat,
      items: cat.items.filter((f) => f.name.toLowerCase().includes(term) || f.desc.toLowerCase().includes(term)),
    })).filter((c) => c.items.length);
  }, [q]);

  const open = (f) => {
    const route = resolveRoute(f, activeSpaceId);
    if (route) nav(route);
  };

  return (
    <div className="px-8 py-8 max-w-[1080px] mx-auto" data-testid="tools-hub">
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-slate" style={{ width: 46, height: 46 }}><Icon name="grid" size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">Tools</h1>
          <div className="text-[13px] nv-muted mt-1 max-w-[560px]">Every Notevoro capability, organized. Pick a Space to open a tool in — or search for one.</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 nv-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools" className="nv-input pl-8 h-9 w-[220px] text-[13px]" data-testid="tools-search" />
          </div>
          <SpacePicker spaces={spaces} value={activeSpaceId} onChange={setSpaceId} />
        </div>
      </div>

      {!spaces.length && <Empty icon="users" title="Create a Space first" hint="Tools open inside a Space so your work stays organized." action={<button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => nav('/dashboard/spaces/new')}>Create a Space</button>} />}

      {spaces.length > 0 && filtered.map((cat) => (
        <section key={cat.key} className="mb-8" data-testid={`tools-cat-${cat.key}`}>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider">{cat.label}</h2>
            <span className="text-[11.5px] nv-muted">{cat.hint}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {cat.items.map((f) => (
              <button key={f.id} onClick={() => open(f)} className="nv-card p-4 text-left hover:border-[#c9bffb] transition-colors group" data-testid={`tool-${f.id}`}>
                <div className="flex items-start gap-3">
                  <div className="stat-icon tone-slate group-hover:tone-violet" style={{ width: 34, height: 34 }}><Icon name={f.icon} size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13.5px] truncate">{f.name}</span>
                      {f.plan && <span className="nv-tag tone-violet text-[9px] uppercase font-bold">{f.plan}</span>}
                    </div>
                    <div className="text-[11.5px] nv-muted mt-0.5 line-clamp-2">{f.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SpacePicker({ spaces, value, onChange }) {
  const current = spaces.find((s) => s.id === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="nv-input h-9 text-[13px]" data-testid="tools-space-picker">
      {spaces.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.type}</option>)}
    </select>
  );
}
