'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Sparkles, Loader2, BookOpen, Layers, HelpCircle, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTIONS = [
  'Photosynthesis',
  'The French Revolution',
  'Newton’s Laws of Motion',
  'Quadratic Equations',
  'Cell Division — Mitosis vs Meiosis',
  'World War II causes',
]

export default function StudyPackPage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate(e) {
    e?.preventDefault?.()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/study-pack/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      toast.success('Study pack ready!')
      router.push(`/dashboard/study-pack/${data.pack.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3">
          <Sparkles className="w-3 h-3" /> AI-powered
        </div>
        <h1 className="text-3xl font-bold">Study Pack Generator</h1>
        <p className="text-muted-foreground mt-1">Type any topic. Get notes, flashcards, and a quiz in ~30 seconds.</p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
        <form onSubmit={generate} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, The French Revolution, Big-O notation..."
              className="h-12 text-base"
              disabled={loading}
              autoFocus
            />
            <Button type="submit" size="lg" disabled={loading || !topic.trim()} className="h-12 bg-gradient-to-r from-violet-500 to-pink-500">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
            </Button>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Try one of these:</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Card>

      {loading && (
        <div className="mt-6 space-y-3">
          {['Analyzing topic...', 'Writing structured notes...', 'Creating flashcards...', 'Building quiz questions...'].map((step, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/50">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3 mt-8">
        {[
          { icon: BookOpen, title: 'Rich notes', desc: 'Markdown-formatted with headings, examples, and a summary.' },
          { icon: Layers, title: '10 flashcards', desc: 'Ready to review, memorize, and quiz yourself.' },
          { icon: HelpCircle, title: '5-question quiz', desc: 'Test yourself instantly with explanations.' },
        ].map((f, i) => (
          <Card key={i} className="p-4 bg-card/40">
            <f.icon className="w-5 h-5 text-primary mb-2" />
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
