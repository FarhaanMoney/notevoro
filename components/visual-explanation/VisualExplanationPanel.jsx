'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import VisualExplanationCard from '@/components/visual-explanation/VisualExplanationCard';
import VisualExplanationLoader from '@/components/visual-explanation/VisualExplanationLoader';
import { toast } from 'sonner';

const safeText = (text) => String(text || '').trim();

function buildRequestBody(topic, context) {
  return JSON.stringify({
    topic: safeText(topic) || 'Explain this topic visually',
    context: safeText(context),
  });
}

export default function VisualExplanationPanel({ initialEnergy = 0, token }) {
  const [prompt, setPrompt] = useState('Explain the key concepts and visual steps for this topic.');
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [energy, setEnergy] = useState(initialEnergy);
  const [expanded, setExpanded] = useState({ concepts: true, steps: true, examples: false, formulas: false, cards: true, quiz: true });

  const hasAccess = token && energy !== null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/visual-explanation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: buildRequestBody(prompt, context),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Visual explanation failed', data);
        setError(data.error || 'Unable to generate explanation');
        setEnergy(data.remainingEnergy ?? energy);
        return;
      }

      setResult(data.data);
      setEnergy(data.remainingEnergy ?? energy);
    } catch (exception) {
      console.error('Visual explanation request error', exception);
      setError('Something went wrong while generating the explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cards = useMemo(() => {
    if (!result?.visualCards) return [];
    return result.visualCards.map((card, index) => ({
      ...card,
      id: card.id || `${card.headline}-${index}`,
    }));
  }, [result]);

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-[#06060a] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-300/80">Visual Explanations</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Generate study-ready visual learning guides</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">Create structured educational outlines with concept cards, diagrams, formulas and quiz checks — all built for deep learning.</p>
          </div>
          <div className="rounded-3xl bg-zinc-950/80 border border-white/10 px-5 py-4 text-right">
            <span className="block text-xs uppercase tracking-[0.3em] text-zinc-500">AI Energy</span>
            <span className="mt-1 block text-3xl font-semibold text-white">{energy === Infinity ? '∞' : energy}</span>
            <span className="text-sm text-zinc-500">Available for this session</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Ask a visual question</label>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                className="bg-zinc-900 border-zinc-800 text-white placeholder:zinc-600"
                placeholder="Explain photosynthesis with visual cards and a quiz"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Context / subject</label>
              <Input
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="e.g., Grade 10 biology, chemistry formulas, exam prep"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:zinc-600"
              />
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                Use a clear learning topic and add optional context to improve relevance.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-violet-500/10 text-violet-200 border-violet-500/20">Premium-ready</Badge>
              <Badge className="bg-sky-500/10 text-sky-200 border-sky-500/20">Safe JSON output</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">AI energy aware</Badge>
            </div>
            <Button type="submit" disabled={loading || !hasAccess} className="bg-gradient-to-r from-violet-500 to-sky-500 text-white">
              {loading ? 'Generating...' : 'Generate Visual Explanation'}
            </Button>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <div className="space-y-6">
        {loading ? <VisualExplanationLoader /> : null}

        {result ? (
          <div className="space-y-6">
            <VisualExplanationCard title={result.title} subtitle={result.summary} badge="Overview" accent="bg-sky-500/15 text-sky-300">
              <p>{result.summary}</p>
            </VisualExplanationCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <VisualExplanationCard title="Key Concepts" badge="Concepts" accent="bg-violet-500/15 text-violet-300">
                {result.keyConcepts.length ? (
                  <div className="space-y-4">
                    {result.keyConcepts.map((concept) => (
                      <div key={concept.title} className="rounded-3xl border border-white/5 bg-zinc-950 p-4">
                        <h4 className="text-lg font-semibold text-white">{concept.title}</h4>
                        <p className="text-zinc-400 mt-1">{concept.description}</p>
                        {concept.bullets.length ? (
                          <ul className="mt-3 space-y-2 list-disc pl-5 text-sm text-zinc-300">
                            {concept.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500">No concepts returned for this topic.</p>
                )}
              </VisualExplanationCard>

              <VisualExplanationCard title="Step-by-Step Flow" badge="Steps" accent="bg-emerald-500/15 text-emerald-300">
                {result.steps.length ? (
                  <div className="space-y-4">
                    {result.steps.map((step, index) => (
                      <div key={step.title} className="rounded-3xl border border-white/5 bg-zinc-950 p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm text-white">{index + 1}</span>
                          <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                        </div>
                        <p className="text-zinc-400">{step.description}</p>
                        {step.example ? <p className="mt-3 text-sm text-sky-200">Example: {step.example}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500">No step flow available.</p>
                )}
              </VisualExplanationCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <VisualExplanationCard title="Examples" badge="Example" accent="bg-sky-500/15 text-sky-300">
                {result.examples.length ? (
                  <div className="space-y-4">
                    {result.examples.map((example) => (
                      <div key={example.title} className="rounded-3xl border border-white/5 bg-zinc-950 p-4">
                        <h4 className="font-semibold text-white">{example.title}</h4>
                        <p className="mt-2 text-zinc-400">{example.content}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-zinc-500">No examples returned.</p>}
              </VisualExplanationCard>

              <VisualExplanationCard title="Formulas" badge="Formula" accent="bg-fuchsia-500/15 text-fuchsia-300">
                {result.formulas.length ? (
                  <div className="space-y-4">
                    {result.formulas.map((formula) => (
                      <div key={formula.expression} className="rounded-3xl border border-white/5 bg-zinc-950 p-4">
                        <div className="font-semibold text-white">{formula.expression}</div>
                        <p className="mt-2 text-zinc-400">{formula.explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-zinc-500">No formulas included.</p>}
              </VisualExplanationCard>

              <VisualExplanationCard title="Visual Cards" badge="Visual" accent="bg-emerald-500/15 text-emerald-300">
                {cards.length ? (
                  <div className="space-y-4">
                    {cards.map((card) => (
                      <div key={card.id} className="rounded-3xl border border-white/5 bg-zinc-950 p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">{card.type}</h4>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-zinc-300">{card.headline}</span>
                        </div>
                        <p className="text-zinc-300">{card.description}</p>
                        {card.imageHint ? <p className="mt-2 text-xs text-zinc-500">Visual hint: {card.imageHint}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-zinc-500">No visual cards were generated.</p>}
              </VisualExplanationCard>
            </div>

            {result.quiz ? (
              <VisualExplanationCard title="Quiz Check" badge="Quiz" accent="bg-orange-500/15 text-orange-300">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-zinc-950 p-4">
                    <h4 className="text-lg font-semibold text-white">{result.quiz.question}</h4>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                      {result.quiz.options.map((option) => (
                        <li key={option} className="rounded-2xl border border-white/5 bg-zinc-900 p-3">{option}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-zinc-400">Correct answer: <span className="text-white">{result.quiz.correctAnswer}</span></p>
                  <p className="text-sm text-zinc-500">{result.quiz.explanation}</p>
                </div>
              </VisualExplanationCard>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[#0b0b10] p-8 text-zinc-400">
            <p className="font-medium text-white">Ready to generate your first visual explanation.</p>
            <p className="mt-2 text-sm">Enter a topic and hit generate to see structured lesson cards, step flow, and quiz support.</p>
          </div>
        )}
      </div>
    </div>
  );
}
