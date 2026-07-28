'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wand2, Loader2, Clock, ListChecks } from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTIONS = ['Physics: Kinematics', 'Algebra Fundamentals', 'World History 1900-1950', 'Biology: Cell Structure', 'Organic Chemistry Basics']

export function TestLauncher() {
  const [subject, setSubject] = useState('')
  const [count, setCount] = useState(15)
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function start(e) {
    e?.preventDefault?.()
    if (!subject.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, count, duration_minutes: duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Test ready. Good luck!')
      router.push(`/dashboard/tests/${data.test.id}`)
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
      <form onSubmit={start} className="space-y-4">
        <div className="flex gap-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject or chapter... e.g. Physics: Kinematics, Algebra, World History"
            className="h-12 text-base" disabled={loading} autoFocus />
          <Button type="submit" size="lg" disabled={loading || !subject.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building test...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate test</>}
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Questions</span>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[10,15,20,25,30].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Duration</span>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[15,30,45,60,90,120].map((n) => <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setSubject(s)} disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition">{s}</button>
            ))}
          </div>
        </div>
      </form>
    </Card>
  )
}
