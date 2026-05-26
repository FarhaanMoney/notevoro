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
  const [loading, setLoading] = useState(false);

  async function routeHomeAfterAuth(session) {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!response.ok) {
        router.replace('/dashboard');
        return;
      }
      const data = await response.json();
      const isOnboardingComplete = data.user?.personalization?.onboarding_completed || data.user?.onboardingStep === 'completed' || Boolean(data.user?.onboardingCompletedAt);
      if (!isOnboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Home route after auth failed:', error);
      router.replace('/dashboard');
    }
  }

  useEffect(() => {
    const sb = supabaseBrowser();
    
    // Check if user is already authenticated
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        routeHomeAfterAuth(session);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = () => {
    router.push('/auth');
  };

  async function googleSignIn() {
    try {
      setLoading(true);
      const sb = supabaseBrowser();
      const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${base}/auth/callback` },
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
        if (loginMethod === 'password') {
          const { error } = await sb.auth.signInWithPassword({ email: form.email, password: form.password });
          if (error) throw error;
          toast.success('Welcome back!');
          const { data: { session } } = await sb.auth.getSession();
          if (session) {
            await routeHomeAfterAuth(session);
          } else {
            router.push('/dashboard');
          }
          return;
        }
        await requestOtp();
        return;
      }
      setStep('personalize');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp() {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const googleRedirect = urlParams.get('google');
      const tempToken = localStorage.getItem('temp_token');
      
      // Handle Google OAuth user completing personalization
      if (googleRedirect === 'true' && tempToken) {
        const r = await fetch('/api/auth/complete-google-personalization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
          body: JSON.stringify({ personalization }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to complete setup');

        localStorage.removeItem('temp_token');
        toast.success('Welcome to Notevoro AI! Your 7-day free trial has started! 🎉');
        await routeHomeAfterAuth({ access_token: tempToken });
        return;
      }
      
      const r = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: tab === 'signup' ? form.name : null, personalization: tab === 'signup' ? personalization : {} }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to send code');
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: otp }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Verification failed');
      const { error } = await supabaseBrowser().auth.setSession({
        access_token: d.session.access_token,
        refresh_token: d.session.refresh_token,
      });
      if (error) throw error;
      toast.success(tab === 'signup' ? 'Verified! Welcome to Notevoro AI' : 'Logged in with OTP');
      await routeHomeAfterAuth(d.session);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function finishSignupWithPassword() {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/password-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          personalization,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Signup failed');
      const { error } = await supabaseBrowser().auth.setSession({
        access_token: d.session.access_token,
        refresh_token: d.session.refresh_token,
      });
      if (error) throw error;
      toast.success('Account created!');
      await routeHomeAfterAuth(d.session);
    } catch (e) {
      toast.error(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/40 to-zinc-900 text-zinc-100 overflow-hidden">
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Notevoro <span className="text-purple-400">AI</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-zinc-300 hover:text-white" onClick={handleLogin}>Login</Button>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={handleLogin}>Get Started</Button>
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
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-12 px-6 text-base" onClick={handleLogin}>
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base bg-transparent border-white/10 text-zinc-200 hover:bg-white/5 hover:text-white" onClick={handleLogin}>
                  Login
                </Button>
              </div>
                          </div>
          </div>

          <div className="mt-24 grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: 'AI Chat', desc: 'ChatGPT-style streaming chat tuned for studying. Ask anything, get clear answers.' },
              { icon: Zap, title: 'Smart Quizzes', desc: 'Generate MCQs from any topic. Track accuracy, earn XP, level up.' },
              { icon: BookOpen, title: 'Flashcards', desc: 'Auto-generated cards with flip animation. Review anywhere.' },
              { icon: Sparkles, title: 'Visual Explanations', desc: 'AI-generated diagrams and visual learning tools — generate study-ready visuals and summaries.' },
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
              <p className="text-zinc-400 mt-3">Start free. Upgrade anytime. AI Energy resets daily.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: 'Free', price: '₹0', credits: '20', features: ['Basic AI chat', 'Limited notes generation', 'File analysis', 'Standard response speed', 'No WhatsApp AI', 'No visual explanations'], highlight: false },
                { name: 'Pro', price: '₹299', credits: '250', features: ['Everything in Free', 'WhatsApp AI', 'Visual explanations', 'Advanced analytics', 'Priority queue', 'Faster responses'], highlight: true },
                { name: 'Premium', price: '₹499', credits: 'Unlimited', features: ['Everything in Pro', 'Unlimited AI Energy', 'Premium AI models', 'Priority support', 'Maximum limits'], highlight: false },
              ].map((p) => (
                <div key={p.name} className={`rounded-2xl border p-6 ${p.highlight ? 'border-purple-500/40 bg-gradient-to-b from-purple-500/10 to-transparent relative' : 'border-white/10 bg-white/[0.02]'}`}>
                  {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] bg-purple-500 text-white">Most popular</div>}
                  <div className="text-sm text-zinc-400">{p.name}</div>
                  <div className="text-3xl font-bold mt-1">{p.price}<span className="text-sm font-normal text-zinc-500">/mo</span></div>
                  <div className="mt-2 text-xs text-yellow-300">{p.credits} AI Energy / day</div>
                  <ul className="mt-4 space-y-1.5 text-sm text-zinc-300">
                    {p.features.map((f) => <li key={f}>• {f}</li>)}
                  </ul>
                  <Button className={`w-full mt-5 ${p.highlight ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`} onClick={() => router.push('/premium')}>Start with {p.name}</Button>
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
                { q: 'How do credits work?', a: 'Each plan gives you a daily AI Energy pool. Chat = 1, Quiz = 5, Flashcards = 4, Notes = 3, Mock test = 10, File analysis = 8. AI Energy resets every day.' },
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
                <Button size="lg" onClick={() => router.push('/premium')} className="bg-white text-black hover:bg-zinc-200 h-12 px-7 text-base">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
