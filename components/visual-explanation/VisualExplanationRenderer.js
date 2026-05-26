'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Lightbulb, Calculator, Clock, Scale, Target } from 'lucide-react';

/**
 * StepCard - Renders a step in a process flow
 */
export function StepCard({ step, index, total }) {
  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
        {index + 1}
      </div>
      {index < total - 1 && (
        <div className="absolute left-3 top-6 w-0.5 h-full bg-purple-500/20" />
      )}
      <Card className="p-4 bg-white/[0.02] border-white/10">
        <h4 className="font-semibold text-white mb-2">{step.title}</h4>
        <p className="text-sm text-zinc-300">{step.content}</p>
        {step.example && (
          <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-300 italic">{step.example}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * ConceptCard - Renders a key concept with highlights
 */
export function ConceptCard({ concept }) {
  return (
    <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
          <Lightbulb className="h-5 w-5 text-blue-300" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-2">{concept.title}</h4>
          <p className="text-sm text-zinc-300 mb-3">{concept.description}</p>
          {concept.keyPoints && (
            <ul className="space-y-1">
              {concept.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                  <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * FormulaBlock - Renders mathematical formulas
 */
export function FormulaBlock({ formula, explanation }) {
  return (
    <Card className="p-5 bg-white/[0.02] border-white/10">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <Calculator className="h-5 w-5 text-purple-300" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-2">Formula</h4>
          <div className="p-3 rounded-lg bg-black/50 border border-purple-500/30 font-mono text-sm text-purple-200 mb-3">
            {formula}
          </div>
          {explanation && (
            <p className="text-xs text-zinc-400">{explanation}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * HighlightBox - Renders important highlights
 */
export function HighlightBox({ highlight, type = 'info' }) {
  const colors = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300'
  };

  // Handle both string and object formats
  const text = typeof highlight === 'object' ? highlight.text : highlight;
  const highlightType = typeof highlight === 'object' ? highlight.type : type;

  return (
    <div className={`p-4 rounded-lg border ${colors[highlightType]}`}>
      <p className="text-sm">{text}</p>
    </div>
  );
}

/**
 * ProcessFlow - Renders a visual process flow
 */
export function ProcessFlow({ steps }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex-1">
            <Card className="p-4 bg-white/[0.02] border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Step {index + 1}
                </Badge>
                <h4 className="font-semibold text-white">{step.title}</h4>
              </div>
              <p className="text-sm text-zinc-300">{step.description}</p>
            </Card>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="h-5 w-5 text-zinc-500 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Timeline - Renders a timeline of events
 */
export function Timeline({ events }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="relative pl-8 pb-4 last:pb-0">
          <div className="absolute left-0 top-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30">
            <Clock className="h-2 w-2 text-blue-300" />
          </div>
          {index < events.length - 1 && (
            <div className="absolute left-1.5 top-5 w-0.5 h-full bg-blue-500/20" />
          )}
          <div>
            <h4 className="font-semibold text-white text-sm">{event.title}</h4>
            <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ComparisonTable - Renders a comparison table
 */
export function ComparisonTable({ items, columns }) {
  return (
    <Card className="overflow-hidden bg-white/[0.02] border-white/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col, idx) => (
              <th key={idx} className="p-3 text-left text-xs font-semibold text-zinc-400">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-white/5 last:border-0">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="p-3 text-sm text-zinc-300">
                  {item[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * QuizSection - Renders a quiz-yourself section
 */
export function QuizSection({ quiz }) {
  const [selectedAnswer, setSelectedAnswer] = React.useState(null);
  const [showResult, setShowResult] = React.useState(false);

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-green-300" />
        <h4 className="font-semibold text-white">Quiz Yourself</h4>
      </div>
      <p className="text-sm text-zinc-300 mb-4">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(option)}
            disabled={showResult}
            className={`w-full p-3 rounded-lg border text-left text-sm transition ${
              showResult
                ? option === quiz.correctAnswer
                  ? 'bg-green-500/20 border-green-500/30 text-green-300'
                  : option === selectedAnswer
                  ? 'bg-red-500/20 border-red-500/30 text-red-300'
                  : 'bg-white/[0.02] border-white/10 text-zinc-400'
                : 'bg-white/[0.02] border-white/10 text-zinc-300 hover:bg-white/[0.04] hover:border-white/20'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {showResult && (
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-300">
            {selectedAnswer === quiz.correctAnswer
              ? '✓ Correct! Great job!'
              : `✗ The correct answer is: ${quiz.correctAnswer}`}
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * VisualExplanationRenderer - Main renderer component
 */
export function VisualExplanationRenderer({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Title */}
      {data.title && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{data.title}</h2>
          {data.subtitle && (
            <p className="text-sm text-zinc-400">{data.subtitle}</p>
          )}
        </div>
      )}

      {/* Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <div className="space-y-3">
          {data.highlights.map((highlight, idx) => (
            <HighlightBox key={idx} highlight={highlight} type={highlight.type || 'info'} />
          ))}
        </div>
      )}

      {/* Concepts */}
      {data.concepts && data.concepts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Key Concepts</h3>
          {data.concepts.map((concept, idx) => (
            <ConceptCard key={idx} concept={concept} />
          ))}
        </div>
      )}

      {/* Steps */}
      {data.steps && data.steps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Step-by-Step</h3>
          {data.steps.map((step, idx) => (
            <StepCard key={idx} step={step} index={idx} total={data.steps.length} />
          ))}
        </div>
      )}

      {/* Formulas */}
      {data.formulas && data.formulas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Formulas</h3>
          {data.formulas.map((formula, idx) => (
            <FormulaBlock key={idx} formula={formula.expression} explanation={formula.explanation} />
          ))}
        </div>
      )}

      {/* Process Flow */}
      {data.processFlow && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Process Flow</h3>
          <ProcessFlow steps={data.processFlow} />
        </div>
      )}

      {/* Timeline */}
      {data.timeline && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Timeline</h3>
          <Timeline events={data.timeline} />
        </div>
      )}

      {/* Comparison */}
      {data.comparison && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Comparison</h3>
          <ComparisonTable items={data.comparison.items} columns={data.comparison.columns} />
        </div>
      )}

      {/* Examples */}
      {data.examples && data.examples.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Examples</h3>
          {data.examples.map((example, idx) => (
            <Card key={idx} className="p-4 bg-white/[0.02] border-white/10">
              <h4 className="font-semibold text-white text-sm mb-2">{example.title}</h4>
              <p className="text-sm text-zinc-300">{example.content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz */}
      {data.quiz && (
        <div className="space-y-4">
          <QuizSection quiz={data.quiz} />
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <Card className="p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <h3 className="font-semibold text-white mb-2">Summary</h3>
          <p className="text-sm text-zinc-300">{data.summary}</p>
        </Card>
      )}
    </div>
  );
}
