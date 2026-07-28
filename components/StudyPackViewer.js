'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Layers, HelpCircle, ChevronLeft, ChevronRight, RotateCw, Check, X } from 'lucide-react'

export function StudyPackViewer({ pack }) {
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs text-primary uppercase tracking-wide font-semibold mb-1">Study Pack</div>
        <h1 className="text-3xl font-bold">{pack.topic}</h1>
        <div className="text-sm text-muted-foreground mt-1">
          {pack.curriculum && <>Curriculum: {pack.curriculum} · </>}
          {pack.grade && <>Grade {pack.grade} · </>}
          Created {new Date(pack.created_at).toLocaleDateString()}
        </div>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="notes"><BookOpen className="w-4 h-4 mr-2" />Notes</TabsTrigger>
          <TabsTrigger value="flashcards"><Layers className="w-4 h-4 mr-2" />Flashcards ({pack.flashcards?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="quiz"><HelpCircle className="w-4 h-4 mr-2" />Quiz ({pack.quiz?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <Card className="p-8">
            <div className="prose-notevoro">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{pack.notes_md || ''}</ReactMarkdown>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards">
          <Flashcards cards={pack.flashcards || []} />
        </TabsContent>

        <TabsContent value="quiz">
          <Quiz questions={pack.quiz || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Flashcards({ cards }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  if (!cards.length) return <Card className="p-8 text-center text-muted-foreground">No flashcards</Card>

  const card = cards[i]
  function next() { setFlipped(false); setI((i + 1) % cards.length) }
  function prev() { setFlipped(false); setI((i - 1 + cards.length) % cards.length) }

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground">Card {i + 1} of {cards.length}</div>
      <Card
        onClick={() => setFlipped((f) => !f)}
        className="p-12 min-h-[280px] flex items-center justify-center text-center cursor-pointer hover:border-primary/40 transition bg-gradient-to-br from-violet-500/5 to-pink-500/5"
      >
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{flipped ? 'Answer' : 'Question'}</div>
          <div className="text-xl font-medium">{flipped ? card.back : card.front}</div>
          <div className="text-xs text-muted-foreground mt-6">Click to {flipped ? 'see question' : 'reveal answer'}</div>
        </div>
      </Card>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={prev}><ChevronLeft className="w-4 h-4 mr-1" />Prev</Button>
        <Button variant="outline" onClick={() => setFlipped((f) => !f)}><RotateCw className="w-4 h-4 mr-1" />Flip</Button>
        <Button onClick={next}>Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  )
}

function Quiz({ questions }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  if (!questions.length) return <Card className="p-8 text-center text-muted-foreground">No quiz</Card>

  const score = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.answer_index ? 1 : 0), 0)

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <Card key={idx} className="p-6">
          <div className="font-semibold mb-3">{idx + 1}. {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = answers[idx] === oi
              const correct = q.answer_index === oi
              const showState = submitted
              const cls = showState
                ? correct ? 'border-green-500/50 bg-green-500/10'
                  : selected ? 'border-red-500/50 bg-red-500/10' : 'border-border'
                : selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              return (
                <button
                  key={oi}
                  onClick={() => !submitted && setAnswers((a) => ({ ...a, [idx]: oi }))}
                  disabled={submitted}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${cls}`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                  <span className="flex-1">{opt}</span>
                  {submitted && correct && <Check className="w-4 h-4 text-green-500" />}
                  {submitted && selected && !correct && <X className="w-4 h-4 text-red-500" />}
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
        <Button size="lg" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length} className="w-full bg-gradient-to-r from-violet-500 to-pink-500">
          Submit Quiz
        </Button>
      ) : (
        <Card className="p-6 text-center bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
          <div className="text-sm text-muted-foreground">Your Score</div>
          <div className="text-4xl font-bold my-2">{score} / {questions.length}</div>
          <div className="text-sm text-muted-foreground">{score === questions.length ? '🎉 Perfect!' : score >= questions.length / 2 ? 'Good work — keep going!' : 'Review the notes and try again.'}</div>
          <Button variant="outline" onClick={() => { setSubmitted(false); setAnswers({}) }} className="mt-4">Retake</Button>
        </Card>
      )}
    </div>
  )
}
