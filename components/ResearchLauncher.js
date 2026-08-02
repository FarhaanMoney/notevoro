'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wand2, Loader2, Globe, Youtube, Image as ImageIcon, BookMarked } from 'lucide-react'
import { toast } from 'sonner'
import { VoroStatus } from '@/components/voro/VoroStatus'

const SUGGESTIONS = ['Climate change causes', 'History of Silk Road', 'Quantum computing basics', 'Renaissance art movement', 'Ancient Roman government']

export function ResearchLauncher() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function start(e) {
    e?.preventDefault?.()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/research/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Voro finished your research report!')
      router.push(`/dashboard/research/${data.report.id}`)
    } catch (err) {
      toast.error('Hmm... Voro couldn\'t finish that. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
      <form onSubmit={start} className="space-y-4">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Research any topic... e.g. Climate change, Renaissance art, quantum computing"
            className="h-12 text-base" disabled={loading} autoFocus />
          <Button type="submit" size="lg" disabled={loading || !topic.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
            {loading ? <VoroStatus type="research" className="text-white" /> : <><Wand2 className="w-4 h-4 mr-2" />Research</>}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setTopic(s)} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition">{s}</button>
          ))}
        </div>
      </form>
      <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
        {[
          { icon: BookMarked, label: 'Cited sources' },
          { icon: Globe, label: 'Multi-perspective' },
          { icon: Youtube, label: 'Video refs (soon)' },
          { icon: ImageIcon, label: 'Images (soon)' },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2"><f.icon className="w-3.5 h-3.5 text-primary" />{f.label}</div>
        ))}
      </div>
    </Card>
  )
}
