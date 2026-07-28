'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Sparkles } from 'lucide-react'

export function QuizRunner({ questions }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  if (!questions.length) return <Card className="p-8 text-center text-muted-foreground">No questions</Card>
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0), 0)
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <Card key={idx} className="p-6">
          <div className="font-semibold mb-3">{idx + 1}. {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const isSel = answers[idx] === oi
              const isCorrect = q.answer_index === oi
              const cls = submitted
                ? isCorrect ? 'border-green-500/50 bg-green-500/10' : isSel ? 'border-red-500/50 bg-red-500/10' : 'border-border'
                : isSel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              return (
                <button key={oi} disabled={submitted} onClick={() => setAnswers((a) => ({ ...a, [idx]: oi }))}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${cls}`}>
                  <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                  <span className="flex-1">{opt}</span>
                  {submitted && isCorrect && <Check className="w-4 h-4 text-green-500" />}
                  {submitted && isSel && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                </button>
              )
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-3 text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
              <span className="font-semibold text-foreground">Explanation:</span> {q.explanation}
            </div>
          )}
        </Card>
      ))}
      {!submitted ? (
        <Button size="lg" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length} className="w-full bg-gradient-to-r from-violet-500 to-pink-500">Submit</Button>
      ) : (
        <Card className="p-6 text-center bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">Score</div>
          <div className="text-5xl font-bold my-2">{score} / {questions.length}</div>
          <Button variant="outline" onClick={() => { setSubmitted(false); setAnswers({}) }} className="mt-2">Retake</Button>
        </Card>
      )}
    </div>
  )
}
