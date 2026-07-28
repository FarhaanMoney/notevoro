'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Check, X, Sparkles, ChevronLeft, ChevronRight, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export function TestRunner({ test }) {
  const questions = test.questions || []
  const [started, setStarted] = useState(!!test.result)
  const [answers, setAnswers] = useState(test.result?.answers || {})
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState(test.result || null)
  const [remaining, setRemaining] = useState((test.duration_minutes || 30) * 60)
  const [submitting, setSubmitting] = useState(false)
  const startedAt = useRef(null)

  useEffect(() => {
    if (!started || result) return
    startedAt.current = startedAt.current || Date.now()
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000)
      const left = Math.max(0, (test.duration_minutes || 30) * 60 - elapsed)
      setRemaining(left)
      if (left === 0) { clearInterval(t); submit(true) }
    }, 1000)
    return () => clearInterval(t)
  }, [started, result])

  async function submit(auto = false) {
    if (submitting) return
    setSubmitting(true)
    try {
      const elapsed = Math.floor((Date.now() - (startedAt.current || Date.now())) / 1000)
      const res = await fetch(`/api/tests/${test.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, time_taken_seconds: elapsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.result)
      toast.success(auto ? 'Time up — auto-submitted' : 'Submitted!')
    } catch (err) {
      toast.error(err.message)
    } finally { setSubmitting(false) }
  }

  if (result) return <TestResults test={test} result={result} />

  if (!started) {
    return (
      <Card className="p-10 text-center bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
        <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Practice Test</div>
        <h1 className="text-3xl font-bold mb-1">{test.title}</h1>
        <div className="text-sm text-muted-foreground mb-6">{test.subject}</div>
        <div className="flex justify-center gap-8 text-sm mb-8">
          <div><div className="text-xs text-muted-foreground">Questions</div><div className="text-2xl font-bold">{questions.length}</div></div>
          <div><div className="text-xs text-muted-foreground">Duration</div><div className="text-2xl font-bold">{test.duration_minutes} min</div></div>
          <div><div className="text-xs text-muted-foreground">Format</div><div className="text-2xl font-bold">MCQ</div></div>
        </div>
        <div className="text-xs text-muted-foreground mb-6 max-w-md mx-auto"><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-400" />The timer starts as soon as you begin. Auto-submits at 0:00.</div>
        <Button size="lg" onClick={() => setStarted(true)} className="bg-gradient-to-r from-violet-500 to-pink-500">Start test</Button>
      </Card>
    )
  }

  const q = questions[current] || {}
  const min = String(Math.floor(remaining / 60)).padStart(2, '0')
  const sec = String(remaining % 60).padStart(2, '0')
  const lowTime = remaining < 60
  const answered = Object.keys(answers).length

  return (
    <div>
      {/* Sticky header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b border-border">
        <div>
          <div className="text-xs text-muted-foreground">{test.title}</div>
          <div className="text-sm font-semibold">Question {current + 1} / {questions.length} · {answered}/{questions.length} answered</div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${lowTime ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-primary/30 bg-primary/10 text-primary'}`}>
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg font-bold">{min}:{sec}</span>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-xs text-muted-foreground mb-2">
          {q.topic && <span className="px-2 py-0.5 rounded bg-primary/15 text-primary mr-2">{q.topic}</span>}
          {q.difficulty && <span className="capitalize">{q.difficulty}</span>}
        </div>
        <div className="font-medium text-lg mb-4">{q.question}</div>
        <div className="space-y-2">
          {q.options?.map((opt, oi) => {
            const sel = answers[current] === oi
            return (
              <button key={oi} onClick={() => setAnswers({ ...answers, [current]: oi })}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${sel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}>
                <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}><ChevronLeft className="w-4 h-4 mr-1" />Prev</Button>
        <div className="flex gap-1 flex-wrap justify-center max-w-md">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded text-xs font-medium border ${i === current ? 'border-primary bg-primary/20' : answers[i] !== undefined ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-border text-muted-foreground'}`}>
              {i + 1}
            </button>
          ))}
        </div>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent(current + 1)}>Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={() => submit(false)} disabled={submitting} className="bg-gradient-to-r from-violet-500 to-pink-500">
            {submitting ? 'Submitting...' : 'Submit test'}
          </Button>
        )}
      </div>
    </div>
  )
}

function TestResults({ test, result }) {
  const passing = result.score_pct >= 60
  const mins = Math.floor((result.time_taken_seconds || 0) / 60)
  const secs = (result.time_taken_seconds || 0) % 60
  return (
    <div>
      <Card className="p-8 text-center bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30 mb-6">
        <Sparkles className="w-10 h-10 text-primary mx-auto mb-2" />
        <div className="text-xs uppercase tracking-wide text-primary font-semibold">Test complete</div>
        <h1 className="text-2xl font-bold mt-1">{test.title}</h1>
        <div className="text-6xl font-bold my-4">{result.score_pct}%</div>
        <div className="text-sm text-muted-foreground">{result.correct} / {result.total} correct · Time: {mins}m {secs}s</div>
        <div className="mt-4 text-sm">
          {passing ? <span className="text-green-400">🎉 Solid performance! Focus on weak topics below to push higher.</span> :
            <span className="text-amber-400">📚 Room to grow. Review the weak topics and retake.</span>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3"><TrendingDown className="w-4 h-4" />Weak topics</div>
          {result.weak_topics?.length > 0 ? (
            <div className="flex flex-wrap gap-2">{result.weak_topics.map((t, i) => <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300">{t}</span>)}</div>
          ) : <div className="text-xs text-muted-foreground">No weak topics — great job!</div>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-3"><TrendingUp className="w-4 h-4" />Strong topics</div>
          {result.strong_topics?.length > 0 ? (
            <div className="flex flex-wrap gap-2">{result.strong_topics.map((t, i) => <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-300">{t}</span>)}</div>
          ) : <div className="text-xs text-muted-foreground">Keep practicing.</div>}
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="text-sm font-semibold mb-3">Topic breakdown</div>
        <div className="space-y-2">
          {result.topics?.sort((a,b) => a.pct - b.pct).map((t, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span>{t.topic}</span>
                <span className={`font-mono ${t.pct >= 80 ? 'text-green-400' : t.pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{t.correct}/{t.total} · {t.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${t.pct >= 80 ? 'bg-green-500' : t.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-sm font-semibold mb-2">Question review</div>
      <div className="space-y-3">
        {test.questions?.map((q, i) => {
          const sel = result.answers?.[i]
          const correct = sel === q.answer_index
          return (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-2 mb-2">
                {correct ? <Check className="w-4 h-4 text-green-400 shrink-0 mt-1" /> : <X className="w-4 h-4 text-red-400 shrink-0 mt-1" />}
                <div>
                  <div className="font-medium">{i + 1}. {q.question}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Your answer: <span className={correct ? 'text-green-400' : 'text-red-400'}>{sel != null ? q.options[sel] : 'Skipped'}</span>
                    {!correct && <> · Correct: <span className="text-green-400">{q.options[q.answer_index]}</span></>}
                  </div>
                  {q.explanation && <div className="text-xs text-muted-foreground mt-2 border-l-2 border-primary/40 pl-2">{q.explanation}</div>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
