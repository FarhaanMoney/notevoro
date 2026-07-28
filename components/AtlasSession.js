'use client'
import { useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen, Lightbulb, HelpCircle, Trophy, Check, X, ChevronRight, Sparkles, CheckCircle2, Circle, Zap } from 'lucide-react'

// Step order within a concept
const STEPS = ['teach', 'analogy', 'check_question', 'mini_quiz', 'checkpoint']

export function AtlasSession({ session }) {
  const lesson = session.lesson || {}
  const concepts = lesson.concepts || []
  const [progress, setProgress] = useState(session.progress || { concept_idx: 0, step_idx: 0, answers: {}, completed: false })
  const [finalAnswers, setFinalAnswers] = useState({})
  const [finalSubmitted, setFinalSubmitted] = useState(false)

  const conceptIdx = progress.concept_idx
  const stepIdx = progress.step_idx
  const currentConcept = concepts[conceptIdx]
  const currentStep = STEPS[stepIdx]
  const showFinal = conceptIdx >= concepts.length

  const persist = useCallback(async (next) => {
    setProgress(next)
    try {
      await fetch(`/api/atlas/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: next }),
      })
    } catch {}
  }, [session.id])

  function advance() {
    if (stepIdx + 1 < STEPS.length) {
      persist({ ...progress, step_idx: stepIdx + 1 })
    } else if (conceptIdx + 1 < concepts.length) {
      persist({ ...progress, concept_idx: conceptIdx + 1, step_idx: 0 })
    } else {
      persist({ ...progress, concept_idx: concepts.length, step_idx: 0 })
    }
  }

  function recordAnswer(key, correct) {
    const answers = { ...(progress.answers || {}), [key]: correct }
    persist({ ...progress, answers })
  }

  function submitFinal() {
    setFinalSubmitted(true)
    persist({ ...progress, completed: true })
  }

  const finalScore = useMemo(() => {
    if (!lesson.final_assessment) return 0
    return lesson.final_assessment.reduce((acc, q, i) => acc + (finalAnswers[i] === q.answer_index ? 1 : 0), 0)
  }, [finalAnswers, lesson.final_assessment])

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      {/* Left: concept list */}
      <div>
        <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Lesson</div>
        <h1 className="text-xl font-bold mb-1">{lesson.title || session.topic}</h1>
        {lesson.overview && <p className="text-xs text-muted-foreground mb-4">{lesson.overview}</p>}

        <div className="space-y-1">
          {concepts.map((c, i) => {
            const state = i < conceptIdx ? 'done' : i === conceptIdx ? 'active' : 'todo'
            return (
              <button
                key={i}
                onClick={() => persist({ ...progress, concept_idx: i, step_idx: 0 })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
                  state === 'active' ? 'bg-primary/15 border border-primary/30' :
                  state === 'done' ? 'text-muted-foreground hover:bg-muted/40' :
                  'text-muted-foreground/70 hover:bg-muted/30'
                }`}
              >
                {state === 'done' ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  : state === 'active' ? <Zap className="w-4 h-4 text-primary shrink-0" />
                  : <Circle className="w-4 h-4 shrink-0" />}
                <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                <span className="flex-1 truncate">{c.title}</span>
              </button>
            )
          })}
          <button
            onClick={() => persist({ ...progress, concept_idx: concepts.length })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
              showFinal ? 'bg-primary/15 border border-primary/30' : 'text-muted-foreground/70 hover:bg-muted/30'
            }`}
          >
            {progress.completed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Trophy className="w-4 h-4 text-amber-400" />}
            <span className="text-xs text-muted-foreground">★</span>
            <span>Final Assessment</span>
          </button>
        </div>
      </div>

      {/* Right: current step */}
      <div>
        {!showFinal && currentConcept ? (
          <ConceptStep
            concept={currentConcept}
            conceptIdx={conceptIdx}
            stepIdx={stepIdx}
            step={currentStep}
            onNext={advance}
            onAnswer={(correct) => recordAnswer(`${conceptIdx}:${currentStep}`, correct)}
          />
        ) : (
          <FinalAssessment
            lesson={lesson}
            answers={finalAnswers}
            setAnswers={setFinalAnswers}
            submitted={finalSubmitted}
            onSubmit={submitFinal}
            score={finalScore}
          />
        )}
      </div>
    </div>
  )
}

function ConceptStep({ concept, conceptIdx, stepIdx, step, onNext, onAnswer }) {
  const icon = { teach: BookOpen, analogy: Lightbulb, check_question: HelpCircle, mini_quiz: GraduationCap, checkpoint: Trophy }[step]
  const stepLabel = { teach: 'Teach', analogy: 'Analogy', check_question: 'Check-in', mini_quiz: 'Mini-Quiz', checkpoint: 'Checkpoint' }[step]
  const Icon = icon || BookOpen

  return (
    <Card className="p-8">
      <div className="flex items-center gap-2 text-xs mb-4">
        <span className="text-primary uppercase tracking-wide font-semibold">Concept {conceptIdx + 1}</span>
        <span className="text-muted-foreground">·</span>
        <div className="inline-flex items-center gap-1 text-primary">
          <Icon className="w-3.5 h-3.5" /> {stepLabel}
        </div>
        <div className="ml-auto flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">{concept.title}</h2>

      {step === 'teach' && (
        <>
          <div className="prose-notevoro">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept.teach || ''}</ReactMarkdown>
          </div>
          <NextButton label="Show me an analogy" onClick={onNext} />
        </>
      )}

      {step === 'analogy' && (
        <>
          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-base leading-relaxed">{concept.analogy}</p>
            </div>
          </div>
          <NextButton label="Test my understanding" onClick={onNext} />
        </>
      )}

      {step === 'check_question' && (
        <MCQBlock q={concept.check_question} onDone={(correct) => { onAnswer(correct) }} nextLabel="Continue to mini-quiz" onNext={onNext} />
      )}

      {step === 'mini_quiz' && (
        <MiniQuiz questions={concept.mini_quiz || []} onDone={() => onAnswer(true)} nextLabel="Wrap up this concept" onNext={onNext} />
      )}

      {step === 'checkpoint' && (
        <>
          <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <p className="text-base leading-relaxed">{concept.checkpoint}</p>
            </div>
          </div>
          <NextButton label="Next concept" onClick={onNext} icon={ChevronRight} />
        </>
      )}
    </Card>
  )
}

function NextButton({ label, onClick, icon: I }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button onClick={onClick} size="lg" className="bg-gradient-to-r from-violet-500 to-pink-500">
        {label} {I ? <I className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
      </Button>
    </div>
  )
}

function MCQBlock({ q, onDone, nextLabel, onNext }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  function submit() {
    if (selected == null) return
    setSubmitted(true)
    onDone?.(selected === q.answer_index)
  }

  return (
    <div>
      <div className="font-medium mb-4">{q.question}</div>
      <div className="space-y-2">
        {q.options.map((opt, oi) => {
          const isSel = selected === oi
          const isCorrect = q.answer_index === oi
          const cls = submitted
            ? isCorrect ? 'border-green-500/50 bg-green-500/10' : isSel ? 'border-red-500/50 bg-red-500/10' : 'border-border'
            : isSel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
          return (
            <button
              key={oi}
              disabled={submitted}
              onClick={() => setSelected(oi)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${cls}`}
            >
              <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
              <span className="flex-1">{opt}</span>
              {submitted && isCorrect && <Check className="w-4 h-4 text-green-500" />}
              {submitted && isSel && !isCorrect && <X className="w-4 h-4 text-red-500" />}
            </button>
          )
        })}
      </div>
      {submitted && q.explanation && (
        <div className="mt-3 p-3 rounded-lg bg-muted/40 text-xs">
          <span className="font-semibold">Why:</span> {q.explanation}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        {!submitted ? (
          <Button disabled={selected == null} onClick={submit}>Submit</Button>
        ) : (
          <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-pink-500">{nextLabel} <ChevronRight className="w-4 h-4 ml-1" /></Button>
        )}
      </div>
    </div>
  )
}

function MiniQuiz({ questions, onDone, nextLabel, onNext }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function submit() {
    setSubmitted(true)
    const allCorrect = questions.every((q, i) => answers[i] === q.answer_index)
    onDone?.(allCorrect)
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0), 0)

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="p-4 rounded-xl border border-border">
          <div className="font-medium mb-3">{idx + 1}. {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const isSel = answers[idx] === oi
              const isCorrect = q.answer_index === oi
              const cls = submitted
                ? isCorrect ? 'border-green-500/50 bg-green-500/10' : isSel ? 'border-red-500/50 bg-red-500/10' : 'border-border'
                : isSel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [idx]: oi }))}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition flex items-center gap-3 ${cls}`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                  <span className="flex-1">{opt}</span>
                  {submitted && isCorrect && <Check className="w-3.5 h-3.5 text-green-500" />}
                  {submitted && isSel && !isCorrect && <X className="w-3.5 h-3.5 text-red-500" />}
                </button>
              )
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-2 text-[11px] text-muted-foreground border-l-2 border-primary/40 pl-2">{q.explanation}</div>
          )}
        </div>
      ))}
      <div className="flex justify-between items-center">
        {submitted && <div className="text-sm text-muted-foreground">Score: {score}/{questions.length}</div>}
        {!submitted ? (
          <Button disabled={Object.keys(answers).length < questions.length} onClick={submit} className="ml-auto">Submit mini-quiz</Button>
        ) : (
          <Button onClick={onNext} className="ml-auto bg-gradient-to-r from-violet-500 to-pink-500">{nextLabel} <ChevronRight className="w-4 h-4 ml-1" /></Button>
        )}
      </div>
    </div>
  )
}

function FinalAssessment({ lesson, answers, setAnswers, submitted, onSubmit, score }) {
  const questions = lesson.final_assessment || []
  return (
    <Card className="p-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-400 font-semibold mb-2">
        <Trophy className="w-4 h-4" /> Final Assessment
      </div>
      <h2 className="text-2xl font-bold mb-6">You made it! Time to prove it.</h2>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-border">
            <div className="font-medium mb-3">{idx + 1}. {q.question}</div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSel = answers[idx] === oi
                const isCorrect = q.answer_index === oi
                const cls = submitted
                  ? isCorrect ? 'border-green-500/50 bg-green-500/10' : isSel ? 'border-red-500/50 bg-red-500/10' : 'border-border'
                  : isSel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [idx]: oi }))}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition flex items-center gap-3 ${cls}`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                    <span className="flex-1">{opt}</span>
                    {submitted && isCorrect && <Check className="w-4 h-4 text-green-500" />}
                    {submitted && isSel && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                  </button>
                )
              })}
            </div>
            {submitted && q.explanation && (
              <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">{q.explanation}</div>
            )}
          </div>
        ))}
      </div>

      {!submitted ? (
        <Button size="lg" onClick={onSubmit} disabled={Object.keys(answers).length < questions.length} className="w-full mt-6 bg-gradient-to-r from-violet-500 to-pink-500">
          Submit final assessment
        </Button>
      ) : (
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-primary/30 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">Your final score</div>
          <div className="text-5xl font-bold my-2">{score} / {questions.length}</div>
          <div className="text-sm text-muted-foreground mb-4">
            {score === questions.length ? '🎉 Perfect! Atlas certifies you’ve mastered this topic.' :
              score >= questions.length * 0.6 ? '💡 Great progress — review the tricky ones and you’ve got this.' :
              '📚 Review the lesson and try again — you’re getting closer!'}
          </div>
          {lesson.lesson_summary && (
            <div className="prose-notevoro text-left mt-4 pt-4 border-t border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.lesson_summary}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
