'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const THEMES = [
  { id: 'violet', grad: 'from-violet-500 to-pink-500' },
  { id: 'blue', grad: 'from-blue-500 to-cyan-500' },
  { id: 'green', grad: 'from-emerald-500 to-teal-500' },
  { id: 'orange', grad: 'from-orange-500 to-amber-500' },
]

export function PresentationLauncher() {
  const [topic, setTopic] = useState('')
  const [theme, setTheme] = useState('violet')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function start(e) {
    e?.preventDefault?.()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/presentations/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, theme }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Deck ready!')
      router.push(`/dashboard/presentations/${data.presentation.id}`)
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
      <form onSubmit={start} className="space-y-4">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Presentation topic... e.g. Water Cycle, Introduction to ML, French Revolution"
            className="h-12 text-base" disabled={loading} autoFocus />
          <Button type="submit" size="lg" disabled={loading || !topic.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Designing slides...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate deck</>}
          </Button>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2">Theme</div>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} disabled={loading}
                className={`w-14 h-9 rounded-lg bg-gradient-to-br ${t.grad} transition ${theme === t.id ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-105' : 'opacity-70 hover:opacity-100'}`} />
            ))}
          </div>
        </div>
      </form>
    </Card>
  )
}
