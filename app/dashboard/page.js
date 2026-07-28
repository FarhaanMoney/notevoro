import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, MessagesSquare, BookOpen, ArrowRight, Zap, Flame, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: recentPacks } = await supabase.from('study_packs').select('id, topic, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4)
  const { data: recentChats } = await supabase.from('chats').select('id, title, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4)

  const name = profile?.display_name || profile?.full_name || 'Student'

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">Ready to learn something new today?</p>
      </div>

      {/* Hero CTAs */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link href="/dashboard/study-pack">
          <Card className="p-6 bg-gradient-to-br from-violet-500/15 to-pink-500/15 border-primary/30 hover:border-primary/60 transition cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-semibold">Generate a Study Pack</h3>
            <p className="text-sm text-muted-foreground mt-1">Turn any topic into notes + flashcards + quiz in 30 seconds.</p>
          </Card>
        </Link>
        <Link href="/dashboard/chat">
          <Card className="p-6 bg-card/60 hover:border-primary/40 transition cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                <MessagesSquare className="w-5 h-5 text-primary" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-semibold">Ask AI Tutor</h3>
            <p className="text-sm text-muted-foreground mt-1">Chat with a personalized AI tutor. Get explanations, code, examples.</p>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Flame, label: 'Streak', value: '1 day', color: 'text-orange-400' },
          { icon: Clock, label: 'Study Hours', value: '0.0h', color: 'text-blue-400' },
          { icon: Zap, label: 'Study Packs', value: recentPacks?.length ?? 0, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i} className="p-5 bg-card/50">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold">{s.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Study Packs</h2>
          <div className="space-y-2">
            {(recentPacks?.length ?? 0) === 0 ? (
              <Card className="p-6 text-center bg-card/40 border-dashed">
                <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No study packs yet.</p>
                <Link href="/dashboard/study-pack"><Button size="sm" className="mt-3">Create your first</Button></Link>
              </Card>
            ) : recentPacks.map((p) => (
              <Link key={p.id} href={`/dashboard/study-pack/${p.id}`}>
                <Card className="p-3 hover:border-primary/40 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{p.topic}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Chats</h2>
          <div className="space-y-2">
            {(recentChats?.length ?? 0) === 0 ? (
              <Card className="p-6 text-center bg-card/40 border-dashed">
                <MessagesSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No chats yet.</p>
                <Link href="/dashboard/chat"><Button size="sm" className="mt-3">Start a chat</Button></Link>
              </Card>
            ) : recentChats.map((c) => (
              <Link key={c.id} href={`/dashboard/chat?id=${c.id}`}>
                <Card className="p-3 hover:border-primary/40 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessagesSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{c.title}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
