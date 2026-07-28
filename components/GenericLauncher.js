'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function GenericLauncher({ endpoint, placeholder, suggestions = [], buttonLabel = 'Generate', loadingLabel = 'Generating...', redirectPath, includeCount = false, includeDifficulty = false }) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(includeCount ? 15 : 10)
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function start(e) {
    e?.preventDefault?.()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const payload = { topic }
      if (includeCount) payload.count = count
      if (includeDifficulty) payload.difficulty = difficulty
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Ready!')
      router.push(`${redirectPath}/${data.set?.id || data.pack?.id}`)
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
      <form onSubmit={start} className="space-y-4">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={placeholder} className="h-12 text-base" disabled={loading} autoFocus />
          <Button type="submit" size="lg" disabled={loading || !topic.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{loadingLabel}</> : <><Wand2 className="w-4 h-4 mr-2" />{buttonLabel}</>}
          </Button>
        </div>
        <div className="flex gap-3 items-center">
          {includeCount && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Count</span>
              <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5,10,15,20,25,30].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {includeDifficulty && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Difficulty</span>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-wrap gap-2 flex-1">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setTopic(s)} disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition">{s}</button>
            ))}
          </div>
        </div>
      </form>
    </Card>
  )
}
