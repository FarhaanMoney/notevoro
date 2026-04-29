'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  MessageSquare, Plus, Send, Trash2, Pencil, LogOut, Search, Zap, BookOpen, FileText, Calendar,
  LayoutDashboard, Trophy, Flame, Target, Sparkles, ChevronLeft, ChevronRight, Crown, Loader2, Menu,
  Coins, Lock, NotebookPen, Share2, Copy, Upload, ClipboardList, AlarmClock, X, Route
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { PLAN_CREDITS, FEATURE_COSTS, FEATURE_TIERS, getLevel } from '@/lib/plans';
import { supabaseBrowser } from '@/lib/supabase/browser';

function App() {
  const router = useRouter();
  const [token, setToken] = useState(null); // Supabase access_token
  const [user, setUser] = useState(null);
  const [view, setView] = useState('chat');
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    let unsub = null;
    sb.auth.getSession()
      .then(({ data }) => {
        const t = data?.session?.access_token || null;
        if (!t) { router.replace('/'); return; }
        setToken(t);
        refreshUser(t).then((u) => {
          if (u?.weekly_reward_granted) toast.success('🔥 7-Day Streak! You earned +10 credits');
          if (u) { setUser(u); setLoading(false); }
          else { router.replace('/'); }
        });
      })
      .catch(() => router.replace('/'));

    unsub = sb.auth.onAuthStateChange((_event, session) => {
      const t = session?.access_token || null;
      if (!t) { setToken(null); setUser(null); router.replace('/'); return; }
      setToken(t);
      refreshUser(t).then((u) => {
        if (u?.weekly_reward_granted) toast.success('🔥 7-Day Streak! You earned +10 credits');
      });
    }).data?.subscription;

    return () => unsub?.unsubscribe?.();
  }, [router]);

  async function refreshUser(t = token) {
    try {
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) return null;
      const d = await r.json();
      setUser(d.user);
      return d.user;
    } catch { return null; }
  }

  async function logout() {
    try { await supabaseBrowser().auth.signOut(); } catch {}
    setToken(null); setUser(null);
    router.replace('/');
  }

  if (loading || !token || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>;
  }

  const plan = user.plan || 'free';
  const isPro = plan === 'pro' || plan === 'premium';
  const isPremium = plan === 'premium';

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="h-screen flex bg-[#0a0a0f] text-zinc-100 overflow-hidden pb-16 md:pb-0">
        {/* Left rail */}
        <aside className="hidden md:flex w-16 border-r border-white/5 flex-col items-center py-4 gap-2 bg-[#08080d] shrink-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-2 shadow-lg shadow-purple-500/30">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <RailBtn active={view==='chat'} onClick={()=>setView('chat')} icon={MessageSquare} label="Chat" />
          <RailBtn active={view==='quiz'} onClick={()=>setView('quiz')} icon={Zap} label="Quiz" locked={false} />
          <RailBtn active={view==='flashcards'} onClick={()=>setView('flashcards')} icon={BookOpen} label="Cards" locked={!isPro} />
          <RailBtn active={view==='notes'} onClick={()=>setView('notes')} icon={NotebookPen} label="Notes" locked={!isPro} />
          <RailBtn active={view==='plan'} onClick={()=>setView('plan')} icon={Calendar} label="Plan" locked={!isPro} />
          <RailBtn active={view==='campaign'} onClick={()=>setView('campaign')} icon={Route} label="Campaign" locked={false} />
          <RailBtn active={view==='mock'} onClick={()=>setView('mock')} icon={ClipboardList} label="Mock" locked={!isPremium} />
          <RailBtn active={view==='file'} onClick={()=>setView('file')} icon={Upload} label="Files" locked={!isPremium} />
          <RailBtn active={view==='dashboard'} onClick={()=>setView('dashboard')} icon={LayoutDashboard} label="Stats" />
          <div className="flex-1" />
          <button onClick={logout} className="h-10 w-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <Topbar user={user} onUpgrade={()=>setShowPlans(true)} />
          <div className="flex-1 min-h-0 flex flex-col">
            {view === 'chat' && <ChatView token={token} user={user} refreshUser={refreshUser} setShowPlans={setShowPlans} setView={setView} logout={logout} />}
            {view === 'quiz' && <QuizView token={token} user={user} refreshUser={refreshUser} setShowPlans={setShowPlans} />}
            {view === 'flashcards' && (isPro ? <FlashcardsView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} /> : <LockedView feature="Flashcards" need="Pro" onUpgrade={()=>setShowPlans(true)} />)}
            {view === 'notes' && (isPro ? <NotesView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} /> : <LockedView feature="AI Notes" need="Pro" onUpgrade={()=>setShowPlans(true)} />)}
            {view === 'plan' && (isPro ? <StudyPlanView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} setView={setView} /> : <LockedView feature="Smart Study Plan" need="Pro" onUpgrade={()=>setShowPlans(true)} />)}
            {view === 'campaign' && <CampaignView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} />}
            {view === 'mock' && (isPremium ? <MockTestView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} /> : <LockedView feature="Mock Tests" need="Premium" onUpgrade={()=>setShowPlans(true)} />)}
            {view === 'file' && (isPremium ? <FileView token={token} refreshUser={refreshUser} setShowPlans={setShowPlans} /> : <LockedView feature="File Analysis" need="Premium" onUpgrade={()=>setShowPlans(true)} />)}
            {view === 'dashboard' && <DashboardView token={token} user={user} refreshUser={refreshUser} setView={setView} setShowPlans={setShowPlans} />}
          </div>
        </main>
      </div>
      <div className="md:hidden fixed bottom-0 inset-x-0 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'quiz', icon: Zap, label: 'Quiz' },
            { id: 'campaign', icon: Route, label: 'Road' },
            { id: 'notes', icon: NotebookPen, label: 'Notes' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Stats' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`h-12 rounded-xl flex flex-col items-center justify-center text-[10px] gap-1 ${view === item.id ? 'bg-white/10 text-white' : 'text-zinc-400'}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PlansModal open={showPlans} onOpenChange={setShowPlans} user={user} token={token} refreshUser={refreshUser} />
    </>
  );
}

/* ============ TOPBAR ============ */
function Topbar({ user, onUpgrade }) {
  const lvl = user.level || getLevel(user.xp || 0);
  const credits = user.credits ?? PLAN_CREDITS[user.plan || 'free'];
  const max = user.credits_max ?? PLAN_CREDITS[user.plan || 'free'];
  const sub = user.subscription_status || 'inactive';
  return (
    <div className="border-b border-white/5 px-4 md:px-6 h-14 flex items-center justify-between bg-[#0a0a0f]/80 backdrop-blur shrink-0">
      <div className="flex items-center gap-3">
        {sub === 'past_due' && (
          <button onClick={onUpgrade} className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
            Payment failed · Update plan
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
          <Trophy className={`h-4 w-4 ${lvl.color}`} />
          <span className="text-xs font-medium">{lvl.name}</span>
          <span className="text-[10px] text-zinc-500">·</span>
          <span className="text-[10px] text-zinc-400">{lvl.xp} XP</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-xs">{user.streak || 0}d</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onUpgrade} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 hover:border-purple-400/50 transition">
          <Coins className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-semibold">{credits}<span className="text-zinc-500"> / {max}</span></span>
          <span className="text-[10px] text-zinc-400 hidden sm:inline">credits</span>
        </button>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 capitalize">{user.plan}</Badge>
        <Button size="sm" onClick={onUpgrade} className="bg-white text-black hover:bg-zinc-200 hidden md:flex"><Crown className="h-3.5 w-3.5 mr-1.5" />Upgrade</Button>
      </div>
    </div>
  );
}

function RailBtn({ active, onClick, icon: Icon, label, locked }) {
  return (
    <button onClick={onClick} title={label + (locked ? ' (locked)' : '')}
      className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition ${active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
      <Icon className="h-4 w-4" />
      {locked && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-zinc-500" />}
    </button>
  );
}

function LockedView({ feature, need, onUpgrade }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-white/[0.02] border-white/10 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-purple-300" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{feature} is locked</h2>
        <p className="text-sm text-zinc-400 mb-6">Upgrade to <span className="text-purple-300 font-medium">{need}</span> to unlock {feature.toLowerCase()} and many more features.</p>
        <Button onClick={onUpgrade} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"><Crown className="h-4 w-4 mr-2" />Upgrade now</Button>
      </Card>
    </div>
  );
}

function MD({ children }) {
  return (
    <div className="prose-nv">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h1: ({node, ...p}) => <h1 className="text-xl font-bold mt-3 mb-2" {...p} />,
        h2: ({node, ...p}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...p} />,
        h3: ({node, ...p}) => <h3 className="text-base font-semibold mt-2 mb-1" {...p} />,
        p: ({node, ...p}) => <p className="my-2 leading-relaxed" {...p} />,
        ul: ({node, ...p}) => <ul className="list-disc pl-6 my-2 space-y-1" {...p} />,
        ol: ({node, ...p}) => <ol className="list-decimal pl-6 my-2 space-y-1" {...p} />,
        li: ({node, ...p}) => <li className="leading-relaxed" {...p} />,
        code: ({inline, children, ...p}) => inline
          ? <code className="px-1.5 py-0.5 rounded bg-white/10 text-purple-300 text-[13px]" {...p}>{children}</code>
          : <pre className="rounded-lg bg-black/40 border border-white/10 p-3 my-2 overflow-x-auto text-[13px]"><code {...p}>{children}</code></pre>,
        a: ({node, ...p}) => <a className="text-purple-400 hover:underline" target="_blank" rel="noreferrer" {...p} />,
        blockquote: ({node, ...p}) => <blockquote className="border-l-2 border-purple-500/40 pl-3 my-2 text-zinc-300 italic" {...p} />,
        table: ({node, ...p}) => <div className="overflow-x-auto"><table className="my-2 border-collapse w-full text-sm" {...p} /></div>,
        th: ({node, ...p}) => <th className="border border-white/10 px-2 py-1 bg-white/5 text-left" {...p} />,
        td: ({node, ...p}) => <td className="border border-white/10 px-2 py-1" {...p} />,
        strong: ({node, ...p}) => <strong className="text-white font-semibold" {...p} />,
        em: ({node, ...p}) => <em className="text-zinc-200" {...p} />,
        hr: () => <hr className="my-3 border-white/10" />,
      }}>{children || ''}</ReactMarkdown>
    </div>
  );
}

/* ============ CHAT ============ */
function ChatView({ token, user, refreshUser, setShowPlans, setView, logout }) {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadChats = useCallback(async (q='') => {
    const r = await fetch('/api/chats' + (q ? `?q=${encodeURIComponent(q)}` : ''), { headers: auth() });
    const d = await r.json(); setChats(d.chats || []);
  }, [auth]);

  useEffect(() => { loadChats(); }, [loadChats]);

  async function loadMessages(id) {
    const r = await fetch(`/api/chats/${id}/messages`, { headers: auth() });
    const d = await r.json(); setMessages(d.messages || []);
  }

  async function newChat() {
    const r = await fetch('/api/chats', { method: 'POST', headers: auth() });
    const d = await r.json(); await loadChats();
    setActiveId(d.chat.id); setMessages([]); setMobileOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function selectChat(id) { setActiveId(id); await loadMessages(id); setMobileOpen(false); }

  async function delChat(id) {
    if (!confirm('Delete this chat?')) return;
    await fetch(`/api/chats/${id}`, { method: 'DELETE', headers: auth() });
    if (activeId === id) { setActiveId(null); setMessages([]); }
    loadChats();
  }

  async function renameChat(id, currentTitle) {
    const t = prompt('Rename chat', currentTitle); if (!t) return;
    await fetch(`/api/chats/${id}`, { method: 'PATCH', headers: { ...auth(), 'Content-Type':'application/json' }, body: JSON.stringify({ title: t }) });
    loadChats();
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming, thinking]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    let chatId = activeId;
    if (!chatId) {
      const r = await fetch('/api/chats', { method: 'POST', headers: auth() });
      const d = await r.json(); chatId = d.chat.id; setActiveId(chatId); await loadChats();
    }
    setInput('');
    const userMsg = { id: 'tmp-u-'+Date.now(), role: 'user', content: text };
    const aiMsg = { id: 'tmp-a-'+Date.now(), role: 'assistant', content: '' };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setStreaming(true); setThinking(true);
    let fullText = '';
    let displayedLen = 0;
    let streamDone = false;
    let rafId = null;
    let lastTs = null;

    // Smooth typing animation without blocking the UI thread.
    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;

      const targetLen = fullText.length;
      if (displayedLen < targetLen) {
        // Lower chars/sec => slower reveal; requestAnimationFrame => smoother updates.
        const charsPerSec = streamDone ? 160 : 95;
        const step = Math.max(1, Math.ceil((charsPerSec * dt) / 1000));
        displayedLen = Math.min(targetLen, displayedLen + step);
        const visible = fullText.slice(0, displayedLen);
        setMessages((m) => m.map((x) => x.id === aiMsg.id ? { ...x, content: visible } : x));
      }

      if (!streamDone || displayedLen < targetLen) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: text }),
      });
      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        if (errData.upgrade) { setShowPlans(true); }
        throw new Error(errData.error || 'Chat failed');
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const delta = dec.decode(value, { stream: true });
        if (delta) {
          if (fullText.length === 0) setThinking(false); // stop typing dots on first token
          fullText += delta;
        }
      }
      streamDone = true;

      // Let the user type again immediately after the server finishes streaming.
      loadChats(); refreshUser();

      // Ensure the "thinking" indicator never gets stuck if the animation falls behind.
      setThinking(false);

      // Force-stop the raf loop once we have caught up (or quickly give up).
      setTimeout(() => {
        if (displayedLen < fullText.length) {
          displayedLen = fullText.length;
          setMessages((m) => m.map((x) => x.id === aiMsg.id ? { ...x, content: fullText } : x));
        }
        if (rafId) cancelAnimationFrame(rafId);
      }, 2500);
    } catch (e) {
      streamDone = true;
      toast.error(e.message);
      setMessages((m) => m.map((x) => x.id === aiMsg.id ? { ...x, content: '⚠️ ' + e.message } : x));
    } finally {
      setStreaming(false); setThinking(false);
    }
  }

  async function convertToNotes() {
    if (!activeId) return toast.error('Open a chat first');
    if (!FEATURE_TIERS.notes.includes(user.plan)) { setShowPlans(true); return toast.error('Notes requires Pro+'); }
    const tId = toast.loading('Generating notes…');
    try {
      const r = await fetch('/api/notes/generate', {
        method: 'POST', headers: { ...auth(), 'Content-Type':'application/json' },
        body: JSON.stringify({ chat_id: activeId }),
      });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      toast.success('Notes saved!', { id: tId });
      refreshUser(); setView('notes');
    } catch (e) { toast.error(e.message, { id: tId }); }
  }

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0c0c12]">
      <div className="p-3 border-b border-white/5">
        <Button onClick={newChat} className="w-full justify-start bg-white text-black hover:bg-zinc-200">
          <Plus className="h-4 w-4 mr-2" /> New chat
        </Button>
        <div className="relative mt-3">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <Input value={search} onChange={(e)=>{ setSearch(e.target.value); loadChats(e.target.value); }} placeholder="Search chats" className="pl-8 bg-zinc-900/60 border-white/5 h-8 text-sm" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.length === 0 && <div className="text-xs text-zinc-500 text-center py-8">No chats yet</div>}
          {chats.map((c) => (
            <div key={c.id} className={`group rounded-md px-2 py-2 cursor-pointer flex items-center gap-2 ${activeId===c.id ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => selectChat(c.id)}>
              <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="text-sm truncate flex-1">{c.title}</span>
              <button onClick={(e)=>{e.stopPropagation();renameChat(c.id, c.title);}} className="md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-white p-1"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={(e)=>{e.stopPropagation();delChat(c.id);}} className="md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          {user.avatar
            ? <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            : <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">{(user.name||'U').slice(0,1).toUpperCase()}</div>}
          <div className="flex-1 min-w-0">
            <div className="truncate text-zinc-200 text-sm">{user.name}</div>
            <div className="truncate text-zinc-500 text-[10px]">{user.email}</div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 capitalize text-[10px]">{user.plan}</Badge>
        </div>
        <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-yellow-400" />{user.credits}</div>
          <div className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-yellow-400" />{user.xp} XP</div>
          <button onClick={logout} className="flex items-center gap-1 hover:text-red-400"><LogOut className="h-3.5 w-3.5" /> Logout</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex min-h-0">
      <div className="hidden md:flex w-72 border-r border-white/5 flex-col">{SidebarContent}</div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-80 bg-[#0c0c12] border-white/10 [&>button]:text-zinc-400">{SidebarContent}</SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="border-b border-white/5 px-4 md:px-6 py-3 flex items-center justify-between bg-[#0a0a0f]/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button onClick={()=>setMobileOpen(true)} className="md:hidden h-8 w-8 -ml-1 rounded-md flex items-center justify-center text-zinc-300 hover:bg-white/5"><Menu className="h-4 w-4" /></button>
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium">Notevoro AI</span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">· Powered by AI</span>
          </div>
          {activeId && messages.length > 0 && (
            <Button size="sm" variant="outline" onClick={convertToNotes} className="bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white text-xs h-8">
              <NotebookPen className="h-3.5 w-3.5 mr-1.5" />Convert to Notes
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">How can I help you study today?</h2>
                <p className="text-sm text-zinc-400 mb-6">Ask me anything — I&apos;ll explain concepts, summarize topics, or quiz you.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Explain photosynthesis simply','Summarize WW2 in 10 points','Quiz me on JavaScript basics','Help me understand calculus'].map((p) => (
                    <button key={p} onClick={()=>setInput(p)} className="text-left text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">{p}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => {
              const isLastAssistant = i === messages.length - 1 && m.role === 'assistant';
              const showThinking = isLastAssistant && thinking && !m.content;
              return (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 max-w-[85%] break-words text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-white text-black whitespace-pre-wrap' : 'bg-white/[0.04] border border-white/10'}`}>
                    {showThinking && <ThinkingDots />}
                    {!showThinking && (m.role === 'user' ? m.content : (<><MD>{m.content}</MD>{isLastAssistant && streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-zinc-300 align-middle animate-pulse" />}</>))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5 bg-[#0a0a0f] px-4 md:px-8 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-white/20 transition">
              <Textarea
                ref={inputRef} value={input} onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                placeholder="Message Notevoro AI…  (Enter to send · Shift+Enter for newline)"
                rows={1}
                className="resize-none bg-transparent border-0 focus-visible:ring-0 pr-12 max-h-40"
              />
              <Button size="icon" onClick={send} disabled={streaming || !input.trim()} className="absolute right-2 bottom-2 h-8 w-8 bg-white text-black hover:bg-zinc-200 disabled:opacity-30">
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-[10px] text-zinc-500 text-center mt-2">1 credit per message · Notevoro AI may produce inaccurate info.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      <span className="text-xs text-zinc-500 ml-2">Thinking…</span>
    </div>
  );
}

/* ============ QUIZ ============ */
function QuizView({ token, refreshUser, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [topic, setTopic] = useState(''); const [difficulty, setDifficulty] = useState('medium'); const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState(null); const [answers, setAnswers] = useState({}); const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false); const [idx, setIdx] = useState(0);

  async function generate() {
    if (!topic.trim()) return toast.error('Enter a topic');
    setLoading(true); setResult(null); setAnswers({}); setIdx(0);
    try {
      const r = await fetch('/api/quiz/generate', { method: 'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ topic, difficulty, count }) });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      setQuiz(d); refreshUser();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function submit() {
    setLoading(true);
    try {
      const r = await fetch('/api/quiz/submit', { method: 'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ quiz_id: quiz.id, answers: quiz.questions.map((_,i)=> answers[i] ?? -1) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setResult(d); refreshUser();
      toast.success(`+${d.xp_gained} XP earned!`);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  function reset() { setQuiz(null); setResult(null); setAnswers({}); setIdx(0); }

  if (!quiz) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-6 bg-white/[0.02] border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Zap className="h-5 w-5 text-purple-300" /></div>
          <div><h2 className="font-semibold text-lg">Start Quiz</h2><p className="text-xs text-zinc-400">5 credits · AI-generated MCQs</p></div>
        </div>
        <div className="space-y-3">
          <div><Label>Topic</Label><Input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. Photosynthesis" className="bg-zinc-900 border-white/10 mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-zinc-900 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
              </Select></div>
            <div><Label>Questions</Label>
              <Select value={String(count)} onValueChange={(v)=>setCount(parseInt(v))}>
                <SelectTrigger className="bg-zinc-900 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[3,5,10].map(n=> <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Quiz
          </Button>
        </div>
      </Card>
    </div>
  );

  if (result) return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 text-center mb-6">
          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-3xl font-bold">{result.correct} / {result.total}</h2>
          <p className="text-zinc-400 mt-1">Accuracy: {Math.round(result.correct/result.total*100)}%</p>
          <Badge className="mt-3 bg-purple-500/20 text-purple-300 border-purple-500/30">+{result.xp_gained} XP earned</Badge>
          <div className="mt-5"><Button onClick={reset} className="bg-white text-black hover:bg-zinc-200">New Quiz</Button></div>
        </Card>
        <div className="space-y-3">
          {result.results.map((r, i) => (
            <Card key={i} className={`p-4 border-white/10 ${r.is_correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex gap-2 items-start">
                <Badge className={r.is_correct ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}>{r.is_correct ? 'Correct' : 'Wrong'}</Badge>
                <span className="font-medium">{i+1}. {r.question}</span>
              </div>
              <div className="mt-2 text-sm space-y-1 pl-2">
                {r.options.map((opt, oi) => (
                  <div key={oi} className={`px-2 py-1 rounded ${oi === r.correct_index ? 'text-emerald-300' : oi === r.user_index ? 'text-red-300' : 'text-zinc-400'}`}>
                    {oi === r.correct_index ? '✓ ' : oi === r.user_index ? '✗ ' : '  '}{opt}
                  </div>
                ))}
                {r.explanation && <div className="text-xs text-zinc-400 mt-2 italic">{r.explanation}</div>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const q = quiz.questions[idx];
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-zinc-400">Question {idx+1} of {quiz.questions.length}</div>
          <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{quiz.difficulty}</Badge>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 mb-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${((idx+1)/quiz.questions.length)*100}%` }} />
        </div>
        <Card className="p-6 bg-white/[0.02] border-white/10">
          <h3 className="text-lg font-medium mb-5">{q.question}</h3>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={()=>setAnswers({...answers, [idx]: oi})} className={`w-full text-left px-4 py-3 rounded-lg border transition ${answers[idx] === oi ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                <span className="text-zinc-400 mr-3">{String.fromCharCode(65+oi)}.</span>{opt}
              </button>
            ))}
          </div>
        </Card>
        <div className="flex justify-between mt-5">
          <Button variant="outline" disabled={idx===0} onClick={()=>setIdx(idx-1)} className="bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          {idx < quiz.questions.length-1
            ? <Button onClick={()=>setIdx(idx+1)} className="bg-white text-black hover:bg-zinc-200">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            : <Button onClick={submit} disabled={loading} className="bg-purple-500 hover:bg-purple-600 text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Submit</Button>}
        </div>
      </div>
    </div>
  );
}

/* ============ FLASHCARDS ============ */
function FlashcardsView({ token, refreshUser, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [decks, setDecks] = useState([]); const [topic, setTopic] = useState(''); const [count, setCount] = useState(8);
  const [active, setActive] = useState(null); const [idx, setIdx] = useState(0); const [flipped, setFlipped] = useState(false); const [loading, setLoading] = useState(false);

  async function load() { const r = await fetch('/api/flashcards', { headers: auth }); const d = await r.json(); setDecks(d.decks || []); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function generate() {
    if (!topic.trim()) return toast.error('Enter a topic');
    setLoading(true);
    try {
      const r = await fetch('/api/flashcards/generate', { method: 'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ topic, count }) });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      toast.success('Flashcards ready!'); setTopic(''); await load(); setActive(d); setIdx(0); setFlipped(false); refreshUser();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function del(id) { await fetch(`/api/flashcards/${id}`, { method:'DELETE', headers: auth }); if (active?.id === id) setActive(null); load(); }

  if (active) {
    const card = active.cards[idx];
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={()=>setActive(null)} className="text-zinc-300"><ChevronLeft className="h-4 w-4 mr-1" /> All decks</Button>
            <div className="text-sm text-zinc-400">{idx+1} / {active.cards.length}</div>
          </div>
          <div className="text-center mb-2 text-sm text-zinc-300">{active.topic}</div>
          <div onClick={()=>setFlipped(!flipped)} className="relative h-72 cursor-pointer" style={{ perspective: '1000px' }}>
            <div className="absolute inset-0 transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
              <div className="absolute inset-0 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-8 flex items-center justify-center text-center text-xl font-medium" style={{ backfaceVisibility: 'hidden' }}>{card.front}</div>
              <div className="absolute inset-0 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-8 flex items-center justify-center text-center text-base leading-relaxed" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{card.back}</div>
            </div>
          </div>
          <div className="text-center text-xs text-zinc-500 mt-3">Click card to flip</div>
          <div className="flex justify-between mt-5">
            <Button variant="outline" disabled={idx===0} onClick={()=>{setIdx(idx-1);setFlipped(false);}} className="bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
            <Button disabled={idx===active.cards.length-1} onClick={()=>{setIdx(idx+1);setFlipped(false);}} className="bg-white text-black hover:bg-zinc-200">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><BookOpen className="h-5 w-5 text-purple-300" /></div>
            <div><h2 className="font-semibold text-lg">Generate Flashcards</h2><p className="text-xs text-zinc-400">4 credits · AI-built cards</p></div>
          </div>
          <div className="flex gap-2">
            <Input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="Enter a topic" className="bg-zinc-900 border-white/10 flex-1" />
            <Select value={String(count)} onValueChange={(v)=>setCount(parseInt(v))}>
              <SelectTrigger className="bg-zinc-900 border-white/10 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{[5,8,10,15].map(n=> <SelectItem key={n} value={String(n)}>{n} cards</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={generate} disabled={loading} className="bg-white text-black hover:bg-zinc-200">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
          </div>
        </Card>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Your decks</h3>
        {decks.length === 0 && <div className="text-sm text-zinc-500 text-center py-12">No decks yet. Generate your first one above.</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          {decks.map((d) => (
            <Card key={d.id} className="p-4 bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition group cursor-pointer" onClick={()=>{setActive(d);setIdx(0);setFlipped(false);}}>
              <div className="flex justify-between items-start">
                <div><h4 className="font-medium">{d.topic}</h4><p className="text-xs text-zinc-400 mt-1">{d.cards.length} cards</p></div>
                <button onClick={(e)=>{e.stopPropagation();del(d.id);}} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ NOTES ============ */
function NotesView({ token, refreshUser, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [notes, setNotes] = useState([]); const [active, setActive] = useState(null); const [topic, setTopic] = useState(''); const [loading, setLoading] = useState(false);

  async function load() { const r = await fetch('/api/notes', { headers: auth }); const d = await r.json(); setNotes(d.notes || []); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function generate() {
    if (!topic.trim()) return toast.error('Enter a topic');
    setLoading(true);
    try {
      const r = await fetch('/api/notes/generate', { method:'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ topic }) });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      toast.success('Notes generated!'); setTopic(''); await load(); setActive(d); refreshUser();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function del(id) { if (!confirm('Delete this note?')) return; await fetch(`/api/notes/${id}`, { method: 'DELETE', headers: auth }); if (active?.id === id) setActive(null); load(); }

  async function share(note) {
    const r = await fetch(`/api/notes/${note.id}/share`, { method: 'POST', headers: auth });
    const d = await r.json();
    const url = `${window.location.origin}/n/${d.slug}`;
    await navigator.clipboard.writeText(url).catch(()=>{});
    toast.success('Public link copied!');
    load(); if (active?.id === note.id) setActive({ ...note, public_slug: d.slug, is_public: true });
  }

  if (active) return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={()=>setActive(null)} className="text-zinc-300"><ChevronLeft className="h-4 w-4 mr-1" /> All notes</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={()=>share(active)} className="bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white"><Share2 className="h-3.5 w-3.5 mr-1.5" />Share</Button>
            <Button size="sm" variant="outline" onClick={()=>del(active.id)} className="bg-transparent border-red-500/20 text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <Card className="p-6 bg-white/[0.02] border-white/10">
          <h1 className="text-2xl font-bold mb-4">{active.title}</h1>
          {active.is_public && active.public_slug && (
            <div className="text-xs mb-4 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <Share2 className="h-3.5 w-3.5" /> Public link: <code className="text-emerald-200">{`/n/${active.public_slug}`}</code>
            </div>
          )}
          <MD>{active.content}</MD>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><NotebookPen className="h-5 w-5 text-purple-300" /></div>
            <div><h2 className="font-semibold text-lg">AI Notes Generator</h2><p className="text-xs text-zinc-400">3 credits · Exam-ready notes from any topic</p></div>
          </div>
          <div className="flex gap-2">
            <Input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. Newton's Laws of Motion" className="bg-zinc-900 border-white/10 flex-1" />
            <Button onClick={generate} disabled={loading} className="bg-white text-black hover:bg-zinc-200">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" />Generate</>}</Button>
          </div>
        </Card>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Your notes</h3>
        {notes.length === 0 && <div className="text-sm text-zinc-500 text-center py-12">No notes yet. Generate one above or convert a chat.</div>}
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className="p-4 bg-white/[0.02] border-white/10 hover:bg-white/[0.04] cursor-pointer" onClick={()=>setActive(n)}>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h4 className="font-medium truncate">{n.title}</h4>
                  <p className="text-xs text-zinc-400 mt-1 truncate">{n.content?.slice(0, 120).replace(/[#*`]/g, '')}…</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.is_public && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Public</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ STUDY PLAN ============ */
function StudyPlanView({ token, refreshUser, setShowPlans, setView }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [plan, setPlan] = useState(null); const [goal, setGoal] = useState(''); const [loading, setLoading] = useState(false); const [loaded, setLoaded] = useState(false);

  async function load() { const r = await fetch('/api/study-plan', { headers: auth }); const d = await r.json(); setPlan(d.plan); setLoaded(true); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function generate() {
    if (!goal.trim()) return toast.error('What do you want to study?');
    setLoading(true);
    try {
      const r = await fetch('/api/study-plan/generate', { method: 'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ goal }) });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      setPlan(d); refreshUser(); toast.success('Study plan ready!');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  if (!loaded) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-400" /></div>;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Calendar className="h-5 w-5 text-purple-300" /></div>
            <div><h2 className="font-semibold text-lg">Smart Study Plan</h2><p className="text-xs text-zinc-400">2 credits · Personalized 7-day plan</p></div>
          </div>
          <div className="flex gap-2">
            <Input value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="e.g. Prepare for JEE Physics in 1 week" className="bg-zinc-900 border-white/10 flex-1" />
            <Button onClick={generate} disabled={loading} className="bg-white text-black hover:bg-zinc-200">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" />Generate</>}</Button>
          </div>
        </Card>
        {plan ? (
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Goal: <span className="text-white">{plan.goal}</span></h3>
            <div className="space-y-2">
              {(plan.days || []).map((day, i) => (
                <Card key={i} className="p-4 bg-white/[0.02] border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{day.day}: <span className="text-zinc-300 font-normal">{day.title}</span></h4>
                  </div>
                  <ul className="space-y-1">
                    {(day.tasks || []).map((t, ti) => (
                      <li key={ti} className="flex items-center gap-2 text-sm">
                        <TaskIcon type={t.type} /><span className="text-zinc-200">{t.label}</span>
                        {t.topic && <Badge className="bg-white/5 text-zinc-300 border-white/10 text-[10px]">{t.topic}</Badge>}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 text-center py-12">No plan yet. Tell us your goal above to generate one.</div>
        )}
      </div>
    </div>
  );
}

function TaskIcon({ type }) {
  const map = { chat: MessageSquare, quiz: Zap, flashcards: BookOpen, notes: NotebookPen };
  const I = map[type] || MessageSquare;
  return <I className="h-3.5 w-3.5 text-purple-300 shrink-0" />;
}

/* ============ CAMPAIGN ============ */
function CampaignView({ token, refreshUser }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('map'); // map | generating | quiz | flashcards | result
  const [level, setLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [cards, setCards] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [result, setResult] = useState(null);

  async function load() {
    const r = await fetch('/api/campaign', { headers: auth });
    const d = await r.json();
    setData(d);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function startLevel(lvl) {
    if (!lvl.unlocked) return toast.error('Complete previous levels first');
    setMode('generating');
    setLoading(true);
    setLevel(lvl);
    setQuestions([]); setCards([]); setQIdx(0); setAnswers([]); setCardIdx(0); setFlipped(false); setResult(null);
    try {
      const r = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json', 'x-idempotency-key': `campaign:start:${lvl.level_number}` },
        body: JSON.stringify({ level_number: lvl.level_number }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.upgrade) throw new Error(d.error || 'Out of credits');
        throw new Error(d.error || 'Failed to generate level');
      }
      setLevel(d.level);
      if (d.kind === 'quiz') {
        setQuestions(d.questions || []);
        setMode('quiz');
      } else {
        setCards(d.cards || []);
        setMode('flashcards');
      }
      refreshUser();
    } catch (e) {
      toast.error(e.message);
      setMode('map');
    } finally {
      setLoading(false);
    }
  }

  async function completeLevel(finalScore) {
    if (!level?.level_number) return;
    setLoading(true);
    try {
      const r = await fetch('/api/campaign/complete', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_number: level.level_number, score: finalScore ?? 0 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to save progress');
      setResult({ score: finalScore ?? null });
      setMode('result');
      await load();
      refreshUser();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetToMap() {
    setMode('map');
    setLevel(null);
    setQuestions([]); setCards([]); setQIdx(0); setAnswers([]); setCardIdx(0); setFlipped(false); setResult(null);
  }

  if (!data) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-400" /></div>;

  if (mode === 'generating') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-6 bg-white/[0.02] border-white/10 text-center max-w-md w-full">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400 mx-auto mb-3" />
          <div className="font-semibold">Generating your level…</div>
          <div className="text-sm text-zinc-400 mt-1">This takes a few seconds.</div>
          <Button onClick={resetToMap} disabled={loading} variant="outline" className="mt-4 h-12 bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white">
            Back
          </Button>
        </Card>
      </div>
    );
  }

  if (mode === 'quiz') {
    return (
      <CampaignLevelQuizView
        level={level}
        questions={questions}
        qIdx={qIdx}
        setQIdx={setQIdx}
        answers={answers}
        setAnswers={setAnswers}
        onBack={resetToMap}
        onComplete={completeLevel}
        loading={loading}
      />
    );
  }

  if (mode === 'flashcards') {
    return (
      <CampaignLevelFlashcardView
        level={level}
        cards={cards}
        idx={cardIdx}
        setIdx={setCardIdx}
        flipped={flipped}
        setFlipped={setFlipped}
        onBack={resetToMap}
        onComplete={() => completeLevel(0)}
        loading={loading}
      />
    );
  }

  if (mode === 'result') {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <Card className="p-6 bg-white/[0.02] border-white/10 text-center">
            <div className="text-xl font-semibold">Level complete</div>
            {result?.score !== null && level?.type === 'quiz' && (
              <div className="text-sm text-zinc-400 mt-2">Score: <span className="text-white font-semibold">{result.score}%</span></div>
            )}
            <div className="mt-5 space-y-2">
              <Button onClick={resetToMap} className="w-full h-12 bg-white text-black hover:bg-zinc-200">Back to Campaign</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="p-5 bg-white/[0.02] border-white/10">
          <h2 className="text-xl font-semibold">Campaign Roadmap</h2>
          <p className="text-sm text-zinc-400 mt-1">Each level costs 5 credits. Complete levels in sequence.</p>
        </Card>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[860px] px-2 py-4">
            <div className="relative">
              <svg className="absolute inset-0 w-full h-32" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden>
                <path d="M20,65 C120,5 220,125 320,65 C420,5 520,125 620,65 C720,5 820,125 980,65" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="4" />
              </svg>
              <div className="relative flex items-center justify-between gap-4 h-32">
                {data.levels.map((level) => (
                  <button
                    key={level.level_number}
                    onClick={() => startLevel(level)}
                    disabled={!level.unlocked || loading}
                    className={`h-14 w-14 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition ${
                      level.completed
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : level.unlocked
                          ? 'bg-purple-500/20 border-purple-400 text-white hover:scale-105'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400'
                    }`}
                    title={`Level ${level.level_number} • ${level.type} • ${level.difficulty}`}
                  >
                    {level.level_number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.levels.map((level) => (
            <Card key={level.level_number} className="p-4 bg-white/[0.02] border-white/10">
              <div className="flex items-center justify-between">
                <div className="font-medium">Level {level.level_number}</div>
                <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{level.type}</Badge>
              </div>
              <div className="text-xs text-zinc-400 mt-2 capitalize">Difficulty: {level.difficulty}</div>
              <div className="text-xs text-zinc-400 mt-1">Reward: {level.reward}</div>
              <Button
                onClick={() => startLevel(level)}
                disabled={!level.unlocked || loading}
                className="w-full h-12 mt-3 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {level.completed ? `Score ${level.score ?? 0}` : level.unlocked ? 'Start level (5 credits)' : 'Locked'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CampaignLevelQuizView({ level, questions, qIdx, setQIdx, answers, setAnswers, onBack, onComplete, loading }) {
  const total = questions?.length || 0;
  const q = questions?.[qIdx];
  if (!q || total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-6 bg-white/[0.02] border-white/10 text-center max-w-md w-full">
          <div className="font-semibold">No questions generated</div>
          <div className="text-sm text-zinc-400 mt-1">Please go back and retry.</div>
          <Button onClick={onBack} className="mt-4 h-12 w-full bg-white text-black hover:bg-zinc-200">Back</Button>
        </Card>
      </div>
    );
  }

  function selectAnswer(idx) {
    const nextAnswers = [...answers];
    nextAnswers[qIdx] = idx;
    setAnswers(nextAnswers);
    if (qIdx < total - 1) setQIdx(qIdx + 1);
  }

  async function finish() {
    let correct = 0;
    for (let i = 0; i < total; i++) {
      if (answers[i] === questions[i]?.answer_index) correct++;
    }
    const score = Math.round((correct / Math.max(total, 1)) * 100);
    await onComplete(score);
  }

  const answered = answers[qIdx] !== undefined;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-5 bg-white/[0.02] border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Campaign · Level {level?.level_number}</div>
            <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{level?.difficulty}</Badge>
          </div>
          <div className="text-sm text-zinc-400 mt-1">Question {qIdx + 1}/{total}</div>
        </Card>

        <Card className="p-6 bg-white/[0.02] border-white/10">
          <div className="text-lg font-medium">{q.question}</div>
          <div className="mt-4 space-y-2">
            {(q.options || []).slice(0, 4).map((opt, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  answers[qIdx] === i ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-zinc-400 mr-3">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1 h-12 bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white">
            Back
          </Button>
          {qIdx === total - 1 ? (
            <Button onClick={finish} disabled={!answered || loading} className="flex-1 h-12 bg-white text-black hover:bg-zinc-200">
              Finish
            </Button>
          ) : (
            <Button onClick={() => setQIdx(qIdx + 1)} disabled={!answered} className="flex-1 h-12 bg-white text-black hover:bg-zinc-200">
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignLevelFlashcardView({ level, cards, idx, setIdx, flipped, setFlipped, onBack, onComplete, loading }) {
  const total = cards?.length || 0;
  const card = cards?.[idx];
  if (!card || total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-6 bg-white/[0.02] border-white/10 text-center max-w-md w-full">
          <div className="font-semibold">No flashcards generated</div>
          <div className="text-sm text-zinc-400 mt-1">Please go back and retry.</div>
          <Button onClick={onBack} className="mt-4 h-12 w-full bg-white text-black hover:bg-zinc-200">Back</Button>
        </Card>
      </div>
    );
  }

  async function next() {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setFlipped(false);
      return;
    }
    await onComplete();
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-5 bg-white/[0.02] border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Campaign · Level {level?.level_number}</div>
            <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{level?.difficulty}</Badge>
          </div>
          <div className="text-sm text-zinc-400 mt-1">Card {idx + 1}/{total}</div>
        </Card>

        <Card
          className="p-6 bg-white/[0.02] border-white/10 cursor-pointer select-none"
          onClick={() => setFlipped(!flipped)}
        >
          <div className="text-xs text-zinc-500 mb-2">{flipped ? 'Answer' : 'Question'}</div>
          <div className="text-lg font-medium leading-relaxed">
            {flipped ? card.back : card.front}
          </div>
          <div className="text-[11px] text-zinc-500 mt-4">Tap to flip</div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1 h-12 bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white">
            Back
          </Button>
          <Button onClick={next} disabled={loading} className="flex-1 h-12 bg-white text-black hover:bg-zinc-200">
            {idx < total - 1 ? 'Next' : 'Finish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ MOCK TEST ============ */
function MockTestView({ token, refreshUser, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [topic, setTopic] = useState(''); const [count, setCount] = useState(15); const [duration, setDuration] = useState(20);
  const [test, setTest] = useState(null); const [answers, setAnswers] = useState({}); const [idx, setIdx] = useState(0);
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [seconds, setSeconds] = useState(0); const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => {
      if (s <= 1) { clearInterval(t); submit(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function generate() {
    if (!topic.trim()) return toast.error('Enter a topic');
    setLoading(true);
    try {
      const r = await fetch('/api/mock-test/generate', { method: 'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ topic, count, duration_minutes: duration }) });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      setTest(d); setAnswers({}); setIdx(0); setResult(null);
      setSeconds(duration * 60); setRunning(true); refreshUser();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function submit() {
    setRunning(false);
    if (!test) return;
    setLoading(true);
    try {
      const time_taken = duration * 60 - seconds;
      const r = await fetch('/api/mock-test/submit', { method:'POST', headers: { ...auth, 'Content-Type':'application/json' }, body: JSON.stringify({ test_id: test.id, answers: test.questions.map((_,i)=> answers[i] ?? -1), time_taken_seconds: time_taken }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setResult(d); refreshUser();
      toast.success(`+${d.xp_gained} XP earned!`);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  function reset() { setTest(null); setResult(null); setAnswers({}); setIdx(0); setSeconds(0); setRunning(false); }

  if (!test) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-6 bg-white/[0.02] border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-yellow-300" /></div>
          <div><h2 className="font-semibold text-lg">Mock Test</h2><p className="text-xs text-zinc-400">10 credits · Premium · Timed test</p></div>
        </div>
        <div className="space-y-3">
          <div><Label>Topic</Label><Input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. Class 12 Chemistry" className="bg-zinc-900 border-white/10 mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Questions</Label>
              <Select value={String(count)} onValueChange={(v)=>setCount(parseInt(v))}>
                <SelectTrigger className="bg-zinc-900 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[10,15,20,25].map(n=> <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Duration (min)</Label>
              <Select value={String(duration)} onValueChange={(v)=>setDuration(parseInt(v))}>
                <SelectTrigger className="bg-zinc-900 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[10,15,20,30,45].map(n=> <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:opacity-90">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}Start Mock Test</Button>
        </div>
      </Card>
    </div>
  );

  if (result) return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 text-center mb-6">
          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-3xl font-bold">{result.correct} / {result.total}</h2>
          <p className="text-zinc-400 mt-1">Accuracy: {Math.round(result.correct/result.total*100)}% · Time: {Math.floor((result.time_taken_seconds||0)/60)}:{String((result.time_taken_seconds||0)%60).padStart(2,'0')}</p>
          <Badge className="mt-3 bg-purple-500/20 text-purple-300 border-purple-500/30">+{result.xp_gained} XP earned</Badge>
          <div className="mt-5"><Button onClick={reset} className="bg-white text-black hover:bg-zinc-200">New Test</Button></div>
        </Card>
        <div className="space-y-3">
          {result.results.map((r, i) => (
            <Card key={i} className={`p-4 border-white/10 ${r.is_correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex gap-2 items-start"><Badge className={r.is_correct ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}>{r.is_correct ? 'Correct' : 'Wrong'}</Badge><span className="font-medium">{i+1}. {r.question}</span></div>
              <div className="mt-2 text-sm space-y-1 pl-2">
                {r.options.map((opt, oi) => (<div key={oi} className={`px-2 py-1 rounded ${oi === r.correct_index ? 'text-emerald-300' : oi === r.user_index ? 'text-red-300' : 'text-zinc-400'}`}>{oi === r.correct_index ? '✓ ' : oi === r.user_index ? '✗ ' : '  '}{opt}</div>))}
                {r.explanation && <div className="text-xs text-zinc-400 mt-2 italic">{r.explanation}</div>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const q = test.questions[idx];
  const mins = Math.floor(seconds/60); const secs = seconds % 60;
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-zinc-400">Q {idx+1} of {test.questions.length}</div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono"><AlarmClock className="h-3.5 w-3.5" />{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>
        </div>
        <Card className="p-6 bg-white/[0.02] border-white/10">
          <h3 className="text-lg font-medium mb-5">{q.question}</h3>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={()=>setAnswers({...answers, [idx]: oi})} className={`w-full text-left px-4 py-3 rounded-lg border transition ${answers[idx] === oi ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                <span className="text-zinc-400 mr-3">{String.fromCharCode(65+oi)}.</span>{opt}
              </button>
            ))}
          </div>
        </Card>
        <div className="flex flex-wrap gap-2 mt-3">
          {test.questions.map((_, i) => (
            <button key={i} onClick={()=>setIdx(i)} className={`h-7 w-7 rounded text-xs ${i===idx ? 'bg-purple-500 text-white' : answers[i] !== undefined ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-zinc-400'}`}>{i+1}</button>
          ))}
        </div>
        <div className="flex justify-between mt-5">
          <Button variant="outline" disabled={idx===0} onClick={()=>setIdx(idx-1)} className="bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          {idx < test.questions.length-1
            ? <Button onClick={()=>setIdx(idx+1)} className="bg-white text-black hover:bg-zinc-200">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            : <Button onClick={submit} disabled={loading} className="bg-purple-500 hover:bg-purple-600 text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Submit Test</Button>}
        </div>
      </div>
    </div>
  );
}

/* ============ FILE ANALYSIS ============ */
function FileView({ token, refreshUser, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [file, setFile] = useState(null); const [action, setAction] = useState('summarize'); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null);

  async function analyze() {
    if (!file) return toast.error('Select a file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File too large (max 10 MB)');
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('action', action);
      const r = await fetch('/api/file-analyze', { method: 'POST', headers: auth, body: fd });
      const d = await r.json();
      if (!r.ok) { if (d.upgrade) setShowPlans(true); throw new Error(d.error || 'Failed'); }
      setResult(d); refreshUser(); toast.success('Analysis ready!');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 bg-white/[0.02] border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"><Upload className="h-5 w-5 text-yellow-300" /></div>
            <div><h2 className="font-semibold text-lg">File Analysis</h2><p className="text-xs text-zinc-400">8 credits · Premium · PDF or image up to 10MB</p></div>
          </div>
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center px-4 py-8 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition">
              <Upload className="h-6 w-6 text-zinc-400 mb-2" />
              <span className="text-sm text-zinc-300">{file ? file.name : 'Click to upload PDF or image'}</span>
              <span className="text-[11px] text-zinc-500 mt-1">{file ? `${(file.size/1024).toFixed(1)} KB` : 'PDF, PNG, JPG, WEBP'}</span>
              <input type="file" accept=".pdf,image/*" onChange={(e)=>setFile(e.target.files[0])} className="hidden" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['summarize','explain','extract'].map((a) => (
                <button key={a} onClick={()=>setAction(a)} className={`px-3 py-2 rounded-lg text-sm border transition capitalize ${action === a ? 'border-purple-400 bg-purple-500/10 text-purple-200' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>{a}</button>
              ))}
            </div>
            <Button onClick={analyze} disabled={!file || loading} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:opacity-90">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Analyze</Button>
          </div>
        </Card>
        {result && (
          <Card className="p-6 bg-white/[0.02] border-white/10">
            <h3 className="font-semibold mb-3">Result for <span className="text-purple-300">{result.filename}</span></h3>
            <MD>{result.result}</MD>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function DashboardView({ token, user, refreshUser, setView, setShowPlans }) {
  const auth = { Authorization: `Bearer ${token}` };
  const [data, setData] = useState(null);
  async function load() { const r = await fetch('/api/dashboard', { headers: auth }); const d = await r.json(); setData(d); refreshUser(); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  if (!data) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-400" /></div>;
  const lvl = user.level || getLevel(user.xp || 0);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.name} 👋</h1>
            <p className="text-zinc-400 text-sm mt-1">Level <span className={lvl.color}>{lvl.name}</span> · {user.xp} XP {lvl.next && `· ${lvl.next_at - user.xp} XP to ${lvl.next}`}</p>
          </div>
          <Button onClick={()=>setShowPlans(true)} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"><Crown className="h-4 w-4 mr-2" />Upgrade</Button>
        </div>

        {lvl.next && (
          <Card className="p-4 bg-white/[0.02] border-white/10 mb-6">
            <div className="flex items-center justify-between text-xs mb-2"><span className={`font-medium ${lvl.color}`}>{lvl.name}</span><span className="text-zinc-400">{lvl.next} at {lvl.next_at} XP</span></div>
            <Progress value={lvl.progress} className="h-2" />
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Coins} color="text-yellow-400" label="Credits" value={`${user.credits}/${user.credits_max}`} />
          <StatCard icon={Flame} color="text-orange-400" label="Day Streak" value={user.streak} />
          <StatCard icon={Target} color="text-emerald-400" label="Accuracy" value={`${data.accuracy}%`} />
          <StatCard icon={Zap} color="text-purple-400" label="Quizzes" value={user.quizzes_taken} />
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <QuickAction icon={MessageSquare} label="New Chat" onClick={()=>setView('chat')} />
          <QuickAction icon={Zap} label="Start Quiz" onClick={()=>setView('quiz')} />
          <QuickAction icon={NotebookPen} label="AI Notes" onClick={()=>setView('notes')} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <Card className="p-5 bg-white/[0.02] border-white/10">
            <h3 className="text-sm font-medium mb-4">XP earned (last 7 days)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.xp_series}>
                  <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip contentStyle={{ background:'#0a0a0f', border:'1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color:'#a1a1aa' }} />
                  <Line type="monotone" dataKey="xp" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5 bg-white/[0.02] border-white/10">
            <h3 className="text-sm font-medium mb-4">Weak topics <span className="text-[10px] text-zinc-500">(needs practice)</span></h3>
            {data.weak_topics.length === 0 ? <div className="text-sm text-zinc-500">Take more quizzes to see analysis.</div> : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weak_topics} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} domain={[0,100]} />
                    <YAxis dataKey="topic" type="category" stroke="#71717a" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ background:'#0a0a0f', border:'1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="accuracy" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-5 bg-white/[0.02] border-white/10">
            <h3 className="text-sm font-medium mb-3">Recent quizzes</h3>
            {data.recent_attempts.length === 0 && <div className="text-sm text-zinc-500">No attempts yet.</div>}
            {data.recent_attempts.slice(0,5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="text-sm truncate">{a.topic}</div>
                <Badge className="bg-white/5 text-zinc-300 border-white/10">{a.correct}/{a.total}</Badge>
              </div>
            ))}
          </Card>
          <Card className="p-5 bg-white/[0.02] border-white/10">
            <h3 className="text-sm font-medium mb-3">Recent chats</h3>
            {data.recent_chats.length === 0 && <div className="text-sm text-zinc-500">No chats yet.</div>}
            {data.recent_chats.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0 cursor-pointer" onClick={()=>setView('chat')}>
                <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                <div className="text-sm truncate flex-1">{c.title}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <Card className="p-4 bg-white/[0.02] border-white/10">
      <Icon className={`h-5 w-5 ${color} mb-2`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition text-left flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center"><Icon className="h-5 w-5 text-purple-300" /></div>
      <div className="font-medium">{label}</div>
    </button>
  );
}

/* ============ PLANS MODAL ============ */
function PlansModal({ open, onOpenChange, user, token, refreshUser }) {
  async function pay(plan) {
    try {
      const r = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ plan }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Order creation failed');
      if (!window.Razorpay) throw new Error('Razorpay SDK still loading');
      if (!d.key_id) throw new Error('Razorpay not configured');
      const opts = {
        key: d.key_id,
        order_id: d.order_id,
        name: 'Notevoro AI', description: `${plan.toUpperCase()} plan`,
        theme: { color: '#a855f7' },
        prefill: { name: user.name, email: user.email },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async (resp) => {
          const vr = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              plan,
            }),
          });
          const vd = await vr.json();
          if (!vr.ok) throw new Error(vd.error || 'Payment verification failed');
          toast.success('Payment successful. Plan upgraded!');
          await refreshUser();
          onOpenChange(false);
        },
      };
      new window.Razorpay(opts).open();
    } catch (e) { toast.error(e.message); }
  }

  const plans = [
    { id:'free', name:'Free', price:'₹0', credits: PLAN_CREDITS.free, features: ['Chat (2 credits/msg)', 'Quizzes (5 credits)', 'Basic AI'] },
    { id:'pro', name:'Pro', price:'₹499', credits: PLAN_CREDITS.pro, highlighted: true, features: ['Everything in Free', 'Quizzes (5 credits)', 'Flashcards (5 credits)', 'AI Notes (4 credits)', 'Study planner (3 credits)', 'Chat memory', 'Better AI'] },
    { id:'premium', name:'Premium', price:'₹999', credits: PLAN_CREDITS.premium, features: ['Everything in Pro', 'Mock tests (15 credits)', 'File analysis (8 credits)', 'Advanced AI', 'Faster responses + priority processing'] },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose your plan</DialogTitle>
          <DialogDescription className="text-zinc-400">Credits reset every month. Cancel anytime.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-xl border p-5 flex flex-col ${p.highlighted ? 'border-purple-500/50 bg-purple-500/5 relative' : 'border-white/10 bg-white/[0.02]'}`}>
              {p.highlighted && <Badge className="absolute -top-2 right-3 bg-purple-500 text-white border-purple-400">Most popular</Badge>}
              <div className="font-semibold">{p.name}</div>
              <div className="text-2xl font-bold mt-1">{p.price}<span className="text-sm font-normal text-zinc-400">/mo</span></div>
              <div className="mt-2 flex items-center gap-1.5 text-yellow-300 text-sm font-medium"><Coins className="h-4 w-4" />{p.credits} credits/mo</div>
              <ul className="text-xs text-zinc-300 space-y-1.5 my-4 flex-1">
                {p.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
              {user.plan === p.id ? (
                <Button disabled className="bg-white/5 text-zinc-300">Current plan</Button>
              ) : p.id === 'free' ? (
                <Button disabled className="bg-white/5 text-zinc-400">Free</Button>
              ) : (
                <Button onClick={()=>pay(p.id)} className={p.highlighted ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}>Get {p.name}</Button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-zinc-500 text-center">Costs: chat 2c · quiz 5c · campaign 5c · flashcards 5c · notes 4c · study plan 3c · mock test 15c · file analysis 8c</div>
      </DialogContent>
    </Dialog>
  );
}

export default App;
