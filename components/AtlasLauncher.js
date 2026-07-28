'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Wand2, GraduationCap, BookOpen, Lightbulb, HelpCircle, CheckCircle2, Trophy } from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTIONS = ['Newton’s Laws of Motion', 'Cell Division', 'Trigonometry Basics', 'World War II', 'Chemical Bonding', 'Introduction to Algebra']

export function AtlasLauncher() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function start(e) {
    e?.preventDefault?.()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/atlas/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Lesson ready! Let’s learn.')
      router.push(`/dashboard/atlas/${data.session.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
      <form onSubmit={start} className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to learn? e.g. Newton's Laws, French Revolution..."
            className="h-12 text-base"
            disabled={loading}
            autoFocus
          />
          <Button type="submit" size="lg" disabled={loading || !topic.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Planning lesson...</> : <><Wand2 className="w-4 h-4 mr-2" />Start lesson</>}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setTopic(s)} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition">
              {s}
            </button>
          ))}
        </div>
      </form>

      <div className="grid grid-cols-5 gap-2 mt-6 pt-6 border-t border-border">
        {[
          { icon: BookOpen, label: 'Teach' },
          { icon: Lightbulb, label: 'Analogy' },
          { icon: HelpCircle, label: 'Check-in' },
          { icon: GraduationCap, label: 'Mini-Quiz' },
          { icon: Trophy, label: 'Checkpoint' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="w-9 h-9 mx-auto rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-1">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
