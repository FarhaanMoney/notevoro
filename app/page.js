'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Globe,
  LogIn,
  Heart,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  User,
  Zap,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/browser';

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#social-proof' },
  { label: 'FAQ', href: '#faq' },
];

const worldSections = [
  {
    id: 'ai-chat',
    title: 'AI Chat',
    subtitle: 'A virtual tutor that answers, explains, and guides every study session in real time.',
    accent: 'cyan',
    icon: MessageCircle,
    details: [
      'Live streaming responses with typing glow',
      'Context-aware learning suggestions',
      'Homework, revision, concept walkthroughs',
    ],
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'Flip, stack, and muscle memory your way through every topic with intelligent recall sequencing.',
    accent: 'purple',
    icon: BookOpen,
    details: [
      'Smart deck animations',
      'Study sessions that adapt to your pace',
      'Swipe gestures for fast reviews',
    ],
  },
  {
    id: 'quizzes',
    title: 'Quizzes',
    subtitle: 'A fast paced knowledge arena with instant feedback, progress tracking, and streak momentum.',
    accent: 'blue',
    icon: Zap,
    details: [
      'Adaptive difficulty engine',
      'Score feedback in real time',
      'Progress bars that keep you motivated',
    ],
  },
  {
    id: 'mock-tests',
    title: 'Mock Tests',
    subtitle: 'Simulate real examinations with analytics, timers, and insights that mimic the real thing.',
    accent: 'slate',
    icon: Rocket,
    details: [
      'Countdown mode for exam pacing',
      'Score analytics and leaderboard preview',
      'Detailed review after every attempt',
    ],
  },
  {
    id: 'visual-learning',
    title: 'Visual Learning',
    subtitle: 'Turn abstract ideas into glowing diagrams, concept maps, and immersive mind flows.',
    accent: 'teal',
    icon: Globe,
    details: [
      'AI whiteboard sketches',
      'Animated connections and glowing nodes',
      'Visual summaries for deep recall',
    ],
  },
  {
    id: 'smart-notes',
    title: 'Smart Notes',
    subtitle: 'Capture insights, auto-highlight key points, and turn messy notes into study-ready summaries.',
    accent: 'pink',
    icon: Brain,
    details: [
      'AI-generated summaries',
      'Indexed note layouts',
      'Search-ready study logs',
    ],
  },
];

const testimonials = [
  {
    name: 'Amina Patel',
    role: 'Biomedical student',
    quote: 'Notevoro turned my revision into a cinematic learning ritual. The AI chat feels like a tutor at my desk.',
    rating: 5,
  },
  {
    name: 'Noah Lin',
    role: 'Design analyst',
    quote: 'The flashcard world is addictive. I can feel the concepts sticking faster and the interface is pure premium.',
    rating: 5,
  },
  {
    name: 'Sofia Cruz',
    role: 'ACT prep coach',
    quote: 'Mock tests with live analytics made my students ready for the real exam. It’s a smooth, polished study machine.',
    rating: 5,
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '₹0',
    accent: 'from-slate-700 to-slate-900',
    features: ['Limited AI energy', 'Core chat access', '10 flashcards / week', 'Basic notes & quizzes'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹299',
    accent: 'from-violet-500 to-cyan-500',
    features: ['Visual learning', 'More AI energy', 'Advanced quizzes', 'Premium summaries'],
    cta: 'Go Pro',
    popular: true,
  },
  {
    name: 'Premium',
    price: '₹499',
    accent: 'from-slate-800 to-violet-900',
    features: ['Unlimited access', 'Priority AI', 'All tools unlocked', 'Fast response queue'],
    cta: 'Upgrade',
    popular: false,
  },
];

const faqs = [
  {
    q: 'Can I start with the free tier and upgrade later?',
    a: 'Absolutely. Your study history and AI preferences carry over instantly when you upgrade.',
  },
  {
    q: 'Does AI create notes from my existing material?',
    a: 'Yes. Notevoro ingests your prompts and transforms them into summaries, flashcards, quizzes, and visuals.',
  },
  {
    q: 'How does visual learning work here?',
    a: 'Our AI converts concepts into glowing diagrams, mind maps, and animated concept flows for deeper retention.',
  },
  {
    q: 'Is Google login secure?',
    a: 'Yes. Sign in with Google uses secure OAuth and keeps your credentials safe with industry-standard protections.',
  },
];

const animatedStats = [
  { label: 'Students helped', value: 58200 },
  { label: 'AI explanations generated', value: 1240000 },
  { label: 'Flashcards created', value: 74000 },
  { label: 'Hours studied', value: 628000 },
];

const motionFade = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: 'easeOut' } },
};

function GlowBadge({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-xs text-cyan-100 shadow-[0_0_60px_rgba(34,211,238,0.08)]">
      <Icon className="h-4 w-4 text-cyan-300" />
      <span>{label}</span>
    </div>
  );
}

function StatCounter({ label, value, active }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1500;
    const increment = Math.ceil(value / (duration / 30));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [active, value]);

  return (
    <div className="flex flex-col gap-2 text-center">
      <p className="text-4xl font-semibold text-white">{count.toLocaleString()}</p>
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">{label}</p>
    </div>
  );
}

function DecoratedList({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
          <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.15)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  const router = useRouter();
  const [faqIndex, setFaqIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [quizState, setQuizState] = useState({ selected: null, answered: false, correct: false });
  const [noteGenerated, setNoteGenerated] = useState(false);
  const [demoNote, setDemoNote] = useState('');
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStatsActive(entry.isIntersecting),
      { rootMargin: '-120px 0px' }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const quizOptions = useMemo(
    () => [
      { id: 'a', label: 'Neural pathway reinforcement' },
      { id: 'b', label: 'Story-based memorization' },
      { id: 'c', label: 'Spaced retrieval practice' },
      { id: 'd', label: 'Passive highlighting' },
    ],
    []
  );

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      const sb = supabaseBrowser();
      const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${base}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setLoadingGoogle(false);
    }
  };

  const toggleFaq = (index) => {
    setFaqIndex(index === faqIndex ? -1 : index);
  };

  const submitQuiz = (option) => {
    const correct = option === 'c';
    setQuizState({ selected: option, answered: true, correct });
  };

  const generateNote = () => {
    setDemoNote(
      'AI Summary: Convert complex ideas into crisp study cards. Notevoro highlights every key concept, maps relationships, and creates a review plan in seconds.'
    );
    setNoteGenerated(true);
  };

  return (
    <main id="home" className="relative isolate overflow-hidden bg-[#07070f] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="star-field" />
        <div className="nebula-layer" />
        <div className="nebula-layer nebula-layer-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-6 pb-24 pt-6 sm:px-8 lg:px-12">
        <motion.nav
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="sticky top-5 z-30 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl shadow-[0_40px_120px_rgba(15,23,42,0.22)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-glow-purple">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/90">Notevoro</p>
                <p className="text-sm font-semibold text-white tracking-tight">Future learning</p>
              </div>
            </div>

            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="text-sm text-zinc-300 transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setAuthPanelOpen(true)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-cyan-300/40 hover:bg-white/10"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_24px_80px_rgba(96,165,250,0.24)] transition hover:brightness-110"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.nav>

        <section className="relative mt-14 grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={motionFade}
            className="space-y-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-100 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
                New launch · AI study universe
              </div>
              <GlowBadge icon={Heart} label="Premium space UI" />
            </div>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Learning, Reimagined by AI
              </h1>
              <p className="max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
                Notevoro transforms studying into a cinematic, intelligent experience. AI chat, flashcards, quizzes, mock tests, visual learning, smart notes, and an always-on companion — all in one premium space.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-8 py-4 text-sm font-semibold text-slate-950 shadow-[0_24px_80px_rgba(59,130,246,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_120px_rgba(59,130,246,0.28)]"
              >
                Start Learning Free
                <ArrowRight className="ml-3 h-4 w-4 text-slate-950" />
              </button>
              <button
                type="button"
                onClick={() => document.querySelector('#try')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition duration-300 hover:border-cyan-300/40 hover:bg-white/10"
              >
                Watch Demo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'AI tutor', value: 'Instant answers' },
                { label: 'Visual mode', value: 'Immersive diagrams' },
                { label: 'Smart review', value: 'Flashcard boost' },
                { label: 'Exam ready', value: 'Mock test flow' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-300 shadow-[0_0_40px_rgba(255,255,255,0.04)]">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-400">{item.label}</p>
                  <p className="mt-2 font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="relative isolate mx-auto max-w-2xl"
          >
            <div className="absolute -left-10 top-10 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute right-0 top-20 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#090a12]/90 p-6 shadow-[0_80px_180px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(34,211,238,0.14),_transparent_28%)]" />
              <div className="relative grid gap-5 rounded-[2rem] border border-white/10 bg-slate-950/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/90">Live study preview</p>
                    <h2 className="text-xl font-semibold text-white">Study flow in motion</h2>
                  </div>
                  <div className="rounded-full border border-cyan-400/20 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100">Beta</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-cyan-200/80">
                      <span>Quiz burst</span>
                      <span>95%</span>
                    </div>
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-sm text-zinc-300">Which strategy helps long-term recall?</p>
                      <div className="mt-4 grid gap-2 text-sm text-white/90">
                        {['Spaced retrieval', 'Passive review', 'Multitasking'].map((option) => (
                          <div key={option} className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2">{option}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-purple-200/80">
                      <span>Flashcards</span>
                      <span>Rapid recall</span>
                    </div>
                    <div className="mt-4 rounded-3xl border border-white/10 bg-[#06070d]/80 p-4">
                      <div className="text-sm text-zinc-300">Swipe to reveal insights</div>
                      <div className="mt-3 space-y-2">
                        <div className="h-10 rounded-2xl bg-gradient-to-r from-violet-700/70 via-cyan-500/20 to-slate-950/10 p-3 text-sm text-white shadow-[0_10px_40px_rgba(56,189,248,0.18)]">
                          Physics formula recall
                        </div>
                        <div className="h-10 rounded-2xl bg-white/5 p-3 text-sm text-zinc-300">Energy, motion, momentum</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-4">
                  <div className="absolute -right-10 top-6 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-zinc-400">
                      <span>Visual Learning</span>
                      <span>92%</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div className="space-y-2">
                        <div className="h-3 rounded-full bg-white/10">
                          <div className="h-3 w-3/4 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
                        </div>
                        <p className="text-sm text-zinc-300">Concept flow with glowing nodes</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 right-4 hidden h-24 rounded-[2.2rem] border border-white/5 bg-white/5 blur-2xl md:block" />
            <div className="absolute -bottom-10 right-8 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
          </motion.div>
        </section>

        <section id="try" className="mt-24 space-y-10 rounded-[2.5rem] border border-white/10 bg-[#08101f]/80 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="space-y-4 text-center"
          >
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">Try Notevoro</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Interactive study demo, no backend required</h2>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Flip a flashcard, answer a quick quiz, and generate a preview note instantly. It’s a fast, addictive demo that shows Notevoro’s premium study flow.
            </p>
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="glass-card group relative overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(34,211,238,0.08)]">
                <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-cyan-400/10 blur-2xl" />
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Flashcard Mode</p>
                    <h3 className="text-lg font-semibold text-white">Flip to reveal the answer</h3>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">Memory boost</span>
                </div>
                <div
                  className="relative mx-auto h-52 w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#070d18]/90 p-5 shadow-[0_30px_70px_rgba(15,23,42,0.35)]"
                  onClick={() => setFlashFlipped((value) => !value)}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={flashFlipped ? 'back' : 'front'}
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: -90 }}
                      transition={{ duration: 0.45 }}
                      className="absolute inset-0 flex flex-col justify-between rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/70 to-slate-950/90 p-6 text-white"
                    >
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Flashcard</div>
                        <h4 className="text-xl font-semibold">What is spaced retrieval practice?</h4>
                        <p className="max-w-xl text-sm leading-6 text-zinc-300">Tap the card to reveal how Notevoro turns science-backed learning into unforgettable study sessions.</p>
                      </div>
                      <div className="text-sm text-zinc-400">
                        {flashFlipped ? 'Spaced retrieval practice is recalling information at increasing intervals to strengthen long-term memory.' : 'Tap to reveal the premium AI answer and feel the knowledge click into place.'}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-zinc-500">Tap the flashcard to flip</p>
              </div>

              <div className="glass-card rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(124,58,237,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-violet-200/80">Mini quiz</p>
                    <h3 className="text-lg font-semibold text-white">Pick the smartest study strategy</h3>
                  </div>
                  <div className="rounded-full bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-violet-100">Instant feedback</div>
                </div>
                <div className="mt-5 space-y-4">
                  {quizOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => submitQuiz(option.id)}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                        quizState.selected === option.id
                          ? quizState.correct
                            ? 'border-emerald-400/90 bg-emerald-500/10 text-emerald-100'
                            : 'border-rose-400/90 bg-rose-500/10 text-rose-100'
                          : 'border-white/10 bg-white/5 text-zinc-200 hover:border-cyan-300/40 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">{option.id.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-sm text-zinc-300">
                  {quizState.answered
                    ? quizState.correct
                      ? 'Correct — spaced retrieval is the science-backed way to build durable memory.'
                      : 'Almost there. Try the answer that prioritizes spaced recall over passive review.'
                    : 'Choose an answer to see how Notevoro coaches you instantly.'}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(59,130,246,0.14)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">AI notes</p>
                    <h3 className="text-lg font-semibold text-white">Generate a premium study note</h3>
                  </div>
                  <button
                    type="button"
                    onClick={generateNote}
                    className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 shadow-[0_20px_80px_rgba(59,130,246,0.2)] transition hover:brightness-110"
                  >
                    Generate
                  </button>
                </div>
                <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-5 text-sm leading-7 text-zinc-300 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                  {noteGenerated ? (
                    <p>{demoNote}</p>
                  ) : (
                    <p>Press generate to see how Notevoro turns a topic into a concise, structured, and glowing study note.</p>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(124,58,237,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-violet-200/80">Visual learning</p>
                    <h3 className="text-lg font-semibold text-white">Preview glowing concept maps</h3>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">Immersive</span>
                </div>
                <div className="mt-6 grid gap-3 rounded-[1.75rem] border border-white/10 bg-[#070b13]/80 p-5">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="h-3 w-3 rounded-full bg-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                    <span>AI creates relationships between ideas.</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="h-3 w-3 rounded-full bg-violet-400/70 shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                    <span>Every concept becomes a vivid node in your study map.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mt-32 space-y-24">
          {worldSections.map((world, index) => (
            <motion.section
              key={world.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07101c]/80 px-8 py-16 shadow-[0_40px_120px_rgba(0,0,0,0.28)]"
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_60%)]" />
              <div className="relative grid gap-10 lg:grid-cols-[0.55fr_0.45fr]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.06)]">
                    <world.icon className="h-4 w-4" />
                    <span>{world.title}</span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-semibold text-white">{world.title}</h3>
                    <p className="max-w-xl text-base leading-8 text-zinc-300">{world.subtitle}</p>
                  </div>
                  <div className="max-w-xl text-sm text-zinc-400">
                    <DecoratedList items={world.details} />
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/auth')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                  >
                    Explore {world.title}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative grid gap-5">
                  <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
                  <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-900/60 to-slate-950/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>{world.title} module</span>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs uppercase tracking-[0.3em] text-cyan-100">Live</span>
                    </div>
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="rounded-[1.75rem] border border-white/10 bg-[#07101a]/90 p-4 text-sm text-zinc-300">
                        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-zinc-500">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                          {world.title} preview
                        </div>
                        <div className="space-y-2">
                          <div className="h-3.5 w-3/5 rounded-full bg-white/10" />
                          <div className="h-3 w-4/5 rounded-full bg-white/5" />
                          <div className="h-3 w-2/5 rounded-full bg-white/10" />
                        </div>
                      </div>
                      <div className="rounded-[1.75rem] border border-white/10 bg-[#07101a]/90 p-4 text-sm text-zinc-300">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-zinc-500">
                          <span>Core flow</span>
                          <span>{world.id === 'mock-tests' ? 'Exam' : 'Live'}</span>
                        </div>
                        <div className="mt-4 grid gap-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                          <div className="h-2 rounded-full bg-white/10" />
                          <div className="h-2 rounded-full bg-white/5" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[2rem] border border-white/10 bg-[#05070f]/90 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-zinc-500">
                      <span>Studio</span>
                      <span className="text-cyan-200">Active</span>
                    </div>
                    <div className="mt-5 grid gap-3">
                      <div className="h-12 rounded-3xl bg-white/5 p-4 text-sm text-zinc-300">Interactive node cluster</div>
                      <div className="h-12 rounded-3xl bg-white/5 p-4 text-sm text-zinc-300">Progress analytics</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ))}
        </section>

        <section id="social-proof" className="mt-32">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1fr] lg:items-end">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">Trusted by modern learners</p>
              <h2 className="text-4xl font-semibold text-white sm:text-5xl">A study ecosystem that feels alive and luxurious.</h2>
              <p className="max-w-xl text-base leading-8 text-zinc-400">
                Real students and coaches rave about the immersive interface, the intelligence behind every recommendation, and the way studying becomes effortless.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="glass-card rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_90px_rgba(59,130,246,0.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-glow-purple">
                      <span className="text-sm font-semibold">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-zinc-300">{testimonial.quote}</div>
                  <div className="mt-5 flex items-center gap-1 text-amber-300">
                    {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4" />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section ref={statsRef} id="stats" className="mt-32 rounded-[3rem] border border-white/10 bg-[#08111f]/80 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="grid gap-10 lg:grid-cols-4">
            {animatedStats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                animate={statsActive ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="rounded-[2rem] border border-white/10 bg-[#07101c]/80 p-7"
              >
                <StatCounter label={stat.label} value={stat.value} active={statsActive} />
              </motion.div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mt-32 space-y-10">
          <div className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">Pricing</p>
            <h2 className="text-4xl font-semibold text-white sm:text-5xl">Flexible tiers for every learner</h2>
            <p className="mx-auto max-w-2xl text-base leading-8 text-zinc-400">
              Start free, upgrade to Pro for immersive visuals and more AI energy, or unlock everything with Premium for unlimited study power.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {pricingTiers.map((tier) => (
              <motion.div
                key={tier.name}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                className={`group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#07111f]/90 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.28)] ${tier.popular ? 'ring-1 ring-cyan-300/20' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 shadow-[0_20px_60px_rgba(59,130,246,0.2)]">
                    Most popular
                  </div>
                )}
                <div className="mb-8 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100">{tier.name}</div>
                  <div>
                    <p className="text-5xl font-semibold tracking-tight text-white">{tier.price}</p>
                    <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">per month</p>
                  </div>
                </div>
                <div className="space-y-4 text-sm text-zinc-300">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/auth')}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${tier.popular ? 'bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-32 rounded-[3rem] border border-white/10 bg-[#07101c]/80 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">FAQ</p>
            <h2 className="text-4xl font-semibold text-white sm:text-5xl">Your questions answered</h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((faq, index) => {
              const open = faqIndex === index;
              return (
                <div key={faq.q} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08111f]/90">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-white transition hover:bg-white/5"
                  >
                    <span className="text-base font-semibold">{faq.q}</span>
                    <motion.div animate={{ rotate: open ? 180 : 0 }}>
                      <ChevronDown className="h-5 w-5 text-cyan-300" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="px-6 pb-5 text-sm leading-7 text-zinc-300"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-32 rounded-[3rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.9),_rgba(7,12,22,0.95))] px-10 py-16 shadow-[0_40px_120px_rgba(0,0,0,0.28)]">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_0.3fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">Final call</p>
              <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">The Future of Learning Starts Here</h2>
              <p className="max-w-2xl text-base leading-8 text-zinc-300">
                Step into the next generation of study tools designed to feel cinematic, effortless, and deeply effective. Start free or unlock Pro and learn at the speed of the future.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-8 py-4 text-base font-semibold text-slate-950 shadow-[0_28px_90px_rgba(59,130,246,0.28)] transition hover:-translate-y-0.5"
              >
                Start Free
              </button>
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {authPanelOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-[#070a14]/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/90">Authentication</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Sign in with Google or continue to full auth.</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthPanelOpen(false)}
                  className="text-zinc-400 transition hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center justify-center gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/10"
                >
                  <LogIn className="h-5 w-5 text-cyan-300" />
                  {loadingGoogle ? 'Opening Google...' : 'Continue with Google'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/auth')}
                  className="inline-flex items-center justify-center gap-3 rounded-[1.75rem] bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_24px_80px_rgba(59,130,246,0.25)] transition hover:brightness-110"
                >
                  <User className="h-5 w-5" />
                  Open full sign up / login
                </button>
              </div>
              <div className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  <span>Secure Google OAuth login with encrypted sessions.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-violet-300" />
                  <span>Premium auth screens are built into the experience.</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
