import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';
import { ErrorState } from '../lib/ui';
import { useCrud } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

export default function Tools() {
  const { toolKey } = useParams();
  const { spaceId, space } = useSpace();
  const enabled = space.enabled_capabilities.includes(toolKey);
  if (!enabled) return <div className="p-7"><ErrorState error={{ code: 'FORBIDDEN', message: 'This tool is not enabled in this Space. Add it from the Space Library.' }} /></div>;
  const T = { pomodoro: Pomodoro, timer: Pomodoro, calculator: Calculator, converter: Converter, focus_mode: Focus, transcriber: Transcriber }[toolKey];
  return <div className="fade-up" data-testid={`tool-${toolKey}`}>{T ? <T spaceId={spaceId} /> : <ErrorState error={{ message: 'Unknown tool' }} />}</div>;
}

function Pomodoro() {
  const [len, setLen] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [run, setRun] = useState(false);
  const [sessions, setSessions] = useState(0);
  useEffect(() => { if (!run) return; const t = setInterval(() => setLeft((l) => { if (l <= 1) { setRun(false); setSessions((s) => s + 1); toast.success('Session complete. Take a break.'); return len * 60; } return l - 1; }), 1000); return () => clearInterval(t); }, [run, len]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0'); const ss = String(left % 60).padStart(2, '0');
  return (
    <><PageHeader icon="timer" title="Pomodoro" subtitle={`${sessions} sessions completed today`} />
      <div className="px-7 flex flex-col items-center py-8">
        <div className="relative w-64 h-64 grid place-items-center"><svg className="absolute inset-0" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#eeebfe" strokeWidth="5" /><circle cx="50" cy="50" r="46" fill="none" stroke="#6e56f5" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(left / (len * 60)) * 289} 289`} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s linear' }} /></svg><div className="text-[52px] font-extrabold tabular-nums" data-testid="pomodoro-time">{mm}:{ss}</div></div>
        <div className="flex gap-2 mt-6"><button className="nv-btn nv-btn-primary" onClick={() => setRun(!run)} data-testid="pomodoro-toggle"><Icon name={run ? 'pause' : 'play'} size={14} /> {run ? 'Pause' : 'Start'}</button><button className="nv-btn nv-btn-outline" onClick={() => { setRun(false); setLeft(len * 60); }} data-testid="pomodoro-reset"><Icon name="rotate-ccw" size={14} /> Reset</button></div>
        <div className="flex gap-2 mt-4">{[15, 25, 45, 60].map((m) => <button key={m} className={`nv-chip ${len === m ? '!bg-[#eeebfe] !border-[#c9bffb]' : ''}`} onClick={() => { setLen(m); setLeft(m * 60); setRun(false); }} data-testid={`pomodoro-len-${m}`}>{m} min</button>)}</div>
      </div></>
  );
}

function Calculator() {
  const [expr, setExpr] = useState('');
  const [res, setRes] = useState('');
  const calc = () => { try { if (!/^[\d\s+\-*/().%^]+$/.test(expr)) throw new Error(); const v = Function(`"use strict"; return (${expr.replace(/\^/g, '**')})`)(); setRes(String(v)); } catch { setRes('Invalid expression'); } };
  return (<><PageHeader icon="calculator" title="Calculator" subtitle="Quick arithmetic. Voro's AI Formula Helper covers the rest." /><div className="px-7 max-w-md"><div className="nv-card p-4"><input className="nv-input text-[18px] h-12 font-mono" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calc()} placeholder="(12 + 8) * 3 / 4" data-testid="calc-input" /><div className="text-[28px] font-extrabold mt-3 min-h-[36px]" data-testid="calc-result">{res}</div><div className="grid grid-cols-4 gap-2 mt-3">{['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '(', ')', '+', '%', '^', '='].map((k) => <button key={k} className={`nv-btn ${k === '=' ? 'nv-btn-primary' : 'nv-btn-outline'} h-10`} onClick={() => (k === '=' ? calc() : setExpr(expr + k))}>{k}</button>)}<button className="nv-btn nv-btn-ghost col-span-4" onClick={() => { setExpr(''); setRes(''); }}>Clear</button></div></div></div></>);
}

const UNITS = { length: { m: 1, km: 1000, cm: 0.01, mi: 1609.34, ft: 0.3048, in: 0.0254 }, mass: { kg: 1, g: 0.001, lb: 0.4536, oz: 0.02835 }, time: { s: 1, min: 60, h: 3600, day: 86400 }, data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 } };
function Converter() {
  const [cat, setCat] = useState('length'); const [v, setV] = useState('1'); const [from, setFrom] = useState('km'); const [to, setTo] = useState('mi');
  const units = Object.keys(UNITS[cat]); const out = (parseFloat(v) || 0) * (UNITS[cat][from] || 1) / (UNITS[cat][to] || 1);
  return (<><PageHeader icon="arrow-left-right" title="Converter" subtitle="Units of length, mass, time and data." /><div className="px-7 max-w-lg nv-card p-4 space-y-3"><div className="flex gap-2">{Object.keys(UNITS).map((c) => <button key={c} className={`nv-chip capitalize ${cat === c ? '!bg-[#eeebfe] !border-[#c9bffb]' : ''}`} onClick={() => { setCat(c); setFrom(Object.keys(UNITS[c])[0]); setTo(Object.keys(UNITS[c])[1]); }}>{c}</button>)}</div><div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"><input className="nv-input h-10" value={v} onChange={(e) => setV(e.target.value)} data-testid="conv-input" /><select className="nv-input h-10 w-24" value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select><Icon name="arrow-right" size={14} /><select className="nv-input h-10 w-24" value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></div><div className="text-[26px] font-extrabold" data-testid="conv-result">{Number.isFinite(out) ? out.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'} {to}</div></div></>);
}

function Focus({ spaceId }) {
  const tasks = useCrud(spaceId, 'tasks');
  const [i, setI] = useState(0);
  const open = tasks.items.filter((t) => t.status !== 'done');
  const t = open[i];
  return (<div className="min-h-[calc(100vh-var(--header-h))] grid place-items-center bg-[#16141f] text-white"><div className="text-center max-w-lg px-6" data-testid="focus-mode">{!t ? <div className="text-xl font-bold">Nothing open. Enjoy the quiet.</div> : <><div className="text-xs uppercase tracking-widest text-white/50">Focus · {i + 1} of {open.length}</div><div className="text-[34px] font-extrabold mt-4 leading-tight">{t.title}</div>{t.description && <div className="text-white/70 mt-3">{t.description}</div>}<div className="flex justify-center gap-2 mt-8"><button className="nv-btn bg-white text-[#16141f]" onClick={() => { tasks.update.mutate({ id: t.id, status: 'done' }); }} data-testid="focus-done"><Icon name="check" size={14} /> Done</button><button className="nv-btn nv-btn-ghost text-white hover:bg-white/10" onClick={() => setI((i + 1) % open.length)} data-testid="focus-skip">Skip</button></div></>}</div></div>);
}

function Transcriber({ spaceId }) {
  const inp = useRef(); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null); const [text, setText] = useState('');
  const run = async (file) => { setBusy(true); setErr(null); const fd = new FormData(); fd.append('file', file); try { const { data } = await api.post(`/spaces/${spaceId}/transcribe`, fd); setText(data.text); } catch (e) { setErr(e); } finally { setBusy(false); } };
  return (<><PageHeader icon="mic" title="Transcriber" subtitle="Upload audio → searchable transcript → notes, tasks, meetings and Voro." actions={<><input type="file" accept="audio/*" ref={inp} className="hidden" onChange={(e) => e.target.files[0] && run(e.target.files[0])} data-testid="transcriber-input" /><button className="nv-btn nv-btn-primary" disabled={busy} onClick={() => inp.current.click()} data-testid="transcriber-upload">{busy ? <Icon name="loader-2" size={14} className="spin" /> : <Icon name="upload" size={14} />} Upload audio</button></>} /><div className="px-7 pb-8">{err && <ErrorState error={err} compact onRetry={() => setErr(null)} />}{text && <textarea className="nv-input min-h-[300px] mt-4" value={text} onChange={(e) => setText(e.target.value)} data-testid="transcriber-text" />}{!text && !err && <div className="nv-card p-8 text-center text-xs nv-muted">Transcription runs server-side (OpenAI Whisper via your OPENAI_API_KEY) and counts toward your plan's transcription minutes.</div>}</div></>);
}
