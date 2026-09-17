import { useNavigate } from 'react-router-dom';
import { Icon } from '../lib/icons';

/**
 * Agents — the four Notevoro AI personas.
 * Each opens the shared VoroPage which handles all AI conversation (the
 * backend has one /voro router that will 503 gracefully when OPENAI_API_KEY
 * is blank). Adding a new agent here is metadata only — no new sidebar.
 */
const AGENTS = [
  { id: 'atlas', name: 'Prof Atlas', role: 'Tutor',        desc: 'Explains, teaches, quizzes and reviews your mistakes step by step.', icon: 'graduation-cap' },
  { id: 'nova',  name: 'Dr Nova',   role: 'Researcher',   desc: 'Digs into sources, compares evidence, and builds research briefs.', icon: 'microscope' },
  { id: 'astra', name: 'Astra',     role: 'Task-doer',    desc: 'Turns intent into tasks, projects and drafts you can review.', icon: 'wand-2' },
  { id: 'luna',  name: 'Luna',      role: 'Explainer',    desc: 'Rewrites, summarises and simplifies content in a friendly voice.', icon: 'moon' },
];

export default function AgentsHub() {
  const nav = useNavigate();
  return (
    <div className="px-8 py-8 max-w-[980px] mx-auto" data-testid="agents-hub">
      <div className="flex items-start gap-4 mb-6">
        <div className="stat-icon tone-violet" style={{ width: 46, height: 46 }}><Icon name="sparkles" size={20} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">Agents</h1>
          <div className="text-[13px] nv-muted mt-1 max-w-[560px]">Four Notevoro AI personas that can read your authorized objects and propose actions before applying them.</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {AGENTS.map((a) => (
          <button key={a.id} onClick={() => nav(`/dashboard/voro?agent=${a.id}`)} className="nv-card p-5 text-left hover:border-[#c9bffb] transition-colors group" data-testid={`agent-${a.id}`}>
            <div className="flex items-start gap-4">
              <div className="stat-icon tone-violet" style={{ width: 44, height: 44 }}><Icon name={a.icon} size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[15.5px] font-extrabold">{a.name}</div>
                <div className="text-[11px] nv-muted uppercase tracking-wider font-bold">{a.role}</div>
                <div className="text-[12.5px] nv-muted mt-2 leading-relaxed">{a.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
