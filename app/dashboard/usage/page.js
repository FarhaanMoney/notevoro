'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, MessagesSquare, GraduationCap, BookOpen, Layers, HelpCircle, FileText, Presentation as PresIcon, Search, StickyNote, Folder, HardDrive, Zap, Loader2 } from 'lucide-react'

const FEATURES = [
  { key: 'chats', label: 'AI Chats', icon: MessagesSquare, limitKey: 'chats_per_day' },
  { key: 'atlas', label: 'Atlas Sessions', icon: GraduationCap, limitKey: 'atlas_per_day' },
  { key: 'study_packs', label: 'Study Packs', icon: BookOpen, limitKey: null },
  { key: 'flashcards', label: 'Flashcard Sets', icon: Layers, limitKey: 'flashcards_per_day' },
  { key: 'quizzes', label: 'Quizzes', icon: HelpCircle, limitKey: 'quizzes_per_day' },
  { key: 'tests', label: 'Practice Tests', icon: FileText, limitKey: 'tests_per_day' },
  { key: 'presentations', label: 'Presentations', icon: PresIcon, limitKey: 'presentations_per_day' },
  { key: 'research', label: 'Research', icon: Search, limitKey: 'research_per_day' },
]

export default function UsagePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/usage')
        const d = await res.json()
        if (d.preview) {
          // Preview mode: seed some sample data
          setData({
            preview: true,
            plan: 'free',
            limits: d.limits,
            usage: {
              today: { chats: 12, atlas: 1, study_packs: 3, flashcards: 2, quizzes: 1, tests: 0, presentations: 1, research: 0 },
              all_time: { chats: 47, atlas: 4, study_packs: 12, flashcards: 8, quizzes: 6, tests: 2, presentations: 5, research: 3, notes: 9, folders: 2 },
            },
          })
        } else {
          setData(d)
        }
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <div className="p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
  if (!data) return null

  const { plan, limits, usage } = data
  const planLabel = plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Premium'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="text-muted-foreground mt-1">Your daily activity, limits, and storage.</p>
      </div>

      {/* Plan card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-primary font-semibold">Current plan</div>
              <div className="text-2xl font-bold">{planLabel}</div>
            </div>
          </div>
          {plan === 'free' && <Button className="bg-gradient-to-r from-violet-500 to-pink-500">Upgrade to Pro</Button>}
        </div>
      </Card>

      {/* Today usage grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" />Today’s usage</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {FEATURES.map((f) => {
            const used = usage.today?.[f.key] || 0
            const limit = f.limitKey ? limits?.[f.limitKey] : null
            const pct = limit && limit < 999 ? Math.min(100, Math.round((used / limit) * 100)) : (used > 0 ? 100 : 0)
            const isNearLimit = limit && limit < 999 && used >= limit * 0.8
            const overLimit = limit && limit < 999 && used >= limit
            return (
              <Card key={f.key} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {limit && limit < 999 ? <>{used} / {limit} today</> : <>{used} today · unlimited</>}
                    </div>
                  </div>
                  {overLimit && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">Limit reached</span>}
                  {!overLimit && isNearLimit && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Near limit</span>}
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full transition-all ${overLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-pink-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* All-time counts */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">All-time totals</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Chats', key: 'chats', icon: MessagesSquare },
            { label: 'Atlas', key: 'atlas', icon: GraduationCap },
            { label: 'Study Packs', key: 'study_packs', icon: BookOpen },
            { label: 'Flashcard Sets', key: 'flashcards', icon: Layers },
            { label: 'Quizzes', key: 'quizzes', icon: HelpCircle },
            { label: 'Tests', key: 'tests', icon: FileText },
            { label: 'Presentations', key: 'presentations', icon: PresIcon },
            { label: 'Research', key: 'research', icon: Search },
            { label: 'Notes', key: 'notes', icon: StickyNote },
            { label: 'Folders', key: 'folders', icon: Folder },
          ].map((s) => (
            <Card key={s.key} className="p-4 bg-card/50">
              <s.icon className="w-4 h-4 text-primary mb-2" />
              <div className="text-2xl font-bold">{usage.all_time?.[s.key] || 0}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Storage */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Storage</span>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xs text-muted-foreground">Approx. content stored</div>
          <div className="text-xs font-mono">~ 0 MB / {limits?.storage_mb ? (limits.storage_mb >= 1024 ? `${limits.storage_mb/1024} GB` : `${limits.storage_mb} MB`) : '—'}</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: '2%' }} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">File uploads coming soon.</div>
      </Card>
    </div>
  )
}
