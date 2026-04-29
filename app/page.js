'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MessageSquare, Sparkles, Zap, BookOpen, Trophy, ArrowRight } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/browser';

function App() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const googleBtnRef = useRef(null); // kept for layout spacing (no-op)
  const googleBtnRef2 = useRef(null); // kept for layout spacing (no-op)

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession()
      .then(({ data }) => {
        if (data?.session) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  async function googleSignIn() {
    try {
      setLoading(true);
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      if (tab === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success('Welcome back!');
        router.push('/dashboard');
        return;
      }

      const { error } = await sb.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name || null } },
      });
      if (error) throw error;
      toast.success('Account created!');
      router.push('/dashboard');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0b0b12] to-[#0a0a0f] text-zinc-100 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-purple-500/20 blur-[120px]" />
          <div className="absolute top-[40%] right-[-10%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Notevoro <span className="text-purple-400">AI</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-zinc-300 hover:text-white" onClick={() => { setTab('login'); setAuthOpen(true); }}>Login</Button>
            <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => { setTab('signup'); setAuthOpen(true); }}>Get Started</Button>
          </div>
        </header>

        <main className="relative z-10 px-6 md:px-12 pt-16 md:pt-28 pb-24 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs text-zinc-300 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Powered by AI · Built for students
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Your AI Study Partner
            </h1>
            <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Chat with AI, generate quizzes from any topic, and build flashcards in seconds. Earn XP, keep your streak, and learn faster than ever.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" className="bg-white text-black hover:bg-zinc-200 h-12 px-6 text-base" onClick={() => { setTab('signup'); setAuthOpen(true); }}>
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white" onClick={() => { setTab('login'); setAuthOpen(true); }}>
                  Login
                </Button>
              </div>
              <Button disabled={loading} onClick={googleSignIn} variant="outline" className="mt-2 h-11 px-6 bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white">
                Continue with Google
              </Button>
            </div>
          </div>

          <div className="mt-24 grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: 'AI Chat', desc: 'ChatGPT-style streaming chat tuned for studying. Ask anything, get clear answers.' },
              { icon: Zap, title: 'Smart Quizzes', desc: 'Generate MCQs from any topic. Track accuracy, earn XP, level up.' },
              { icon: BookOpen, title: 'Flashcards', desc: 'Auto-generated cards with flip animation. Review anywhere.' },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 hover:bg-white/[0.04] transition">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 flex flex-col md:flex-row items-center justify-around gap-6">
            <Stat icon={Trophy} label="Earn XP" value="+5 / msg" />
            <div className="hidden md:block w-px h-10 bg-white/10" />
            <Stat icon={Zap} label="Quiz reward" value="+10 / correct" />
            <div className="hidden md:block w-px h-10 bg-white/10" />
            <Stat icon={BookOpen} label="Daily streak" value="Keep going!" />
          </div>

          {/* How it works */}
          <section className="mt-28">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-300 mb-3">How it works</div>
              <h2 className="text-3xl md:text-4xl font-bold">Learn smarter in 3 steps</h2>
              <p className="text-zinc-400 mt-3">From "I don&apos;t get it" to "Got it" — fast.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { n: '01', title: 'Pick a topic', desc: "Type any subject — biology, calculus, history, code. Anything you're studying." },
                { n: '02', title: 'Let AI work', desc: "Get clear explanations, MCQ quizzes, flashcards or exam-ready notes — instantly." },
                { n: '03', title: 'Track & level up', desc: 'XP, streaks, weak-topic detection. Watch your accuracy climb every day.' },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="text-purple-400 text-sm font-mono mb-3">{s.n}</div>
                  <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Plans teaser */}
          <section className="mt-28">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-300 mb-3">Pricing</div>
              <h2 className="text-3xl md:text-4xl font-bold">Simple, credit-based pricing</h2>
              <p className="text-zinc-400 mt-3">Start free. Upgrade anytime. Credits reset every month.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: 'Free', price: '₹0', credits: '50', features: ['Basic AI chat', 'Public notes view', 'Streaks & XP'], highlight: false },
                { name: 'Pro', price: '₹499', credits: '500', features: ['Everything in Free', 'AI Quizzes & Notes', 'Smart Study Plan', 'Contextual memory'], highlight: true },
                { name: 'Premium', price: '₹999', credits: '2000', features: ['Everything in Pro', 'Mock Tests', 'PDF/Image analysis', 'Priority support'], highlight: false },
              ].map((p) => (
                <div key={p.name} className={`rounded-2xl border p-6 ${p.highlight ? 'border-purple-500/40 bg-gradient-to-b from-purple-500/10 to-transparent relative' : 'border-white/10 bg-white/[0.02]'}`}>
                  {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] bg-purple-500 text-white">Most popular</div>}
                  <div className="text-sm text-zinc-400">{p.name}</div>
                  <div className="text-3xl font-bold mt-1">{p.price}<span className="text-sm font-normal text-zinc-500">/mo</span></div>
                  <div className="mt-2 text-xs text-yellow-300">{p.credits} credits / month</div>
                  <ul className="mt-4 space-y-1.5 text-sm text-zinc-300">
                    {p.features.map((f) => <li key={f}>• {f}</li>)}
                  </ul>
                  <Button className={`w-full mt-5 ${p.highlight ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`} onClick={() => { setTab('signup'); setAuthOpen(true); }}>Start with {p.name}</Button>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-28">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-300 mb-3">FAQ</div>
              <h2 className="text-3xl md:text-4xl font-bold">Questions, answered</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {[
                { q: 'How do credits work?', a: 'Each plan gives you a monthly credit pool. Chat = 1, Quiz = 5, Flashcards = 4, Notes = 3, Mock test = 10, File analysis = 8. Credits reset every month.' },
                { q: 'Can I cancel anytime?', a: 'Yes. You keep access until your billing period ends, then drop to Free. No questions asked.' },
                { q: 'What subjects does it cover?', a: 'Anything — STEM, humanities, languages, programming, exams. The AI adapts to whatever you throw at it.' },
                { q: 'Is my data private?', a: 'Your chats and notes are stored only for you and personalize your study experience. Public notes are only visible if you choose to share them.' },
                { q: 'How are payments processed?', a: 'Securely via Razorpay. UPI, cards, net banking — all in INR, no forex fees.' },
                { q: 'Can I share my notes?', a: 'Yes! Every note has a one-click "Share" button that creates a public link anyone can read.' },
              ].map((f) => (
                <div key={f.q} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h4 className="font-medium mb-1.5">{f.q}</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-28 mb-8">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent p-10 md:p-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">Ready to learn faster?</h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">Join students already studying with AI. Free to start, no card required.</p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button size="lg" onClick={() => { setTab('signup'); setAuthOpen(true); }} className="bg-white text-black hover:bg-zinc-200 h-12 px-7 text-base">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-10 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold tracking-tight">Notevoro <span className="text-purple-400">AI</span></div>
                <div className="text-[10px] text-zinc-500">Your AI study partner — Powered by AI</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
              <button onClick={() => { setTab('login'); setAuthOpen(true); }} className="hover:text-white">Login</button>
              <button onClick={() => { setTab('signup'); setAuthOpen(true); }} className="hover:text-white">Sign up</button>
              <a href="#" onClick={(e)=>{e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'});}} className="hover:text-white">Back to top</a>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
            <div>© {new Date().getFullYear()} Notevoro AI. All rights reserved.</div>
            <div>Made with ❤️ for students · Powered by AI</div>
          </div>
        </footer>

        <Dialog open={authOpen} onOpenChange={setAuthOpen}>
          <DialogContent className="sm:max-w-[420px] bg-zinc-950 border-white/10 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-xl">Welcome to Notevoro AI</DialogTitle>
              <DialogDescription className="text-zinc-400">Login or create an account to start studying.</DialogDescription>
            </DialogHeader>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-zinc-900 border border-white/5">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <form onSubmit={submit} className="space-y-3 mt-4">
                {tab === 'signup' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 border-white/10" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-zinc-900 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-zinc-900 border-white/10" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200">
                  {loading ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create account'}
                </Button>
              </form>
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-zinc-500">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="flex justify-center">
                <Button disabled={loading} onClick={googleSignIn} variant="outline" className="w-full bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white">
                  Continue with Google
                </Button>
              </div>
              <p className="text-[10px] text-center text-zinc-500 mt-2">
                Configure Google provider in Supabase Auth.
              </p>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-purple-300" />
      </div>
      <div>
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

export default App;
