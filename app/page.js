import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Brain, Zap, BookOpen, MessagesSquare, GraduationCap, ArrowRight, Check } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Nav */}
      <nav className="container mx-auto flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Notevoro</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Login</Button></Link>
          <Link href="/signup"><Button className="bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90">Get started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 backdrop-blur mb-8">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Powered by GPT-4o · Built for students</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Turn any topic into a <span className="gradient-text">complete study pack</span> in seconds.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Notevoro generates polished notes, flashcards, and quizzes on demand — personalized to your grade and curriculum. Study smarter, not harder.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-base h-12 px-8 glow">
              Start learning free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">I have an account</Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Free plan · No credit card required</p>
      </section>

      {/* Feature grid */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: 'Instant Study Packs', desc: 'One topic in. Notes, flashcards, and a quiz out. All personalized to your grade & curriculum.' },
            { icon: MessagesSquare, title: 'AI Chat Tutor', desc: 'Ask anything, get instant explanations with markdown, code, and step-by-step reasoning.' },
            { icon: GraduationCap, title: 'Made for Every Board', desc: 'CBSE, ICSE, IGCSE, IB, College — Notevoro speaks your syllabus language.' },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border bg-card/40 backdrop-blur hover:border-primary/40 transition">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bento demo */}
      <section className="container mx-auto px-4 pb-24">
        <div className="rounded-3xl border border-border bg-card/40 backdrop-blur p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-primary mb-3"><Zap className="w-3.5 h-3.5" /> The magic moment</div>
            <h2 className="text-3xl md:text-4xl font-bold">Type &ldquo;Photosynthesis&rdquo;. Get a full lesson.</h2>
            <p className="mt-4 text-muted-foreground">In 30 seconds, Notevoro creates structured notes, 10 flashcards to memorize the key facts, and a 5-question quiz to test yourself. Everything saves to your dashboard automatically.</p>
            <ul className="mt-6 space-y-2 text-sm">
              {['Grade-aware explanations', 'Curriculum-matched depth', 'Beautiful markdown notes', 'Ready-to-study flashcards', 'Auto-graded quizzes'].map((t, i) => (
                <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Brain className="w-3.5 h-3.5" /> Study Pack Generator</div>
            <div className="px-4 py-3 rounded-lg bg-muted text-sm">Topic: <span className="text-foreground font-medium">The French Revolution</span></div>
            <div className="px-4 py-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-primary/20 text-sm">
              <div className="font-semibold mb-1">Notes generated ✓</div>
              <div className="text-xs text-muted-foreground">10 flashcards · 5-question quiz · saved to dashboard</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground border-t border-border">
        © 2025 Notevoro · Made for curious minds
      </footer>
    </div>
  )
}
