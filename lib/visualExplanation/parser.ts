import { z } from 'zod';
import { visualLearningExperienceSchema, type LearningBlock, type VisualLearningExperience } from './types';
import { safeParseJSON } from '@/lib/utils/safeJson';

function uid(prefix: string, index: number) {
  return `${prefix}${index}`;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asString(v: unknown, fallback = '') {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return fallback;
}

function pickString(...values: unknown[]) {
  for (const v of values) {
    const s = asString(v);
    if (s) return s;
  }
  return '';
}

/** Normalize legacy AI shapes + new block format into canonical experience */
export function parseVisualLearningResponse(rawText: string, topic: string): VisualLearningExperience {
  const parsed = safeParseJSON<Record<string, unknown>>(rawText);
  if (!parsed) {
    throw new Error('AI returned invalid JSON');
  }

  const blocks: LearningBlock[] = [];

  if (Array.isArray(parsed.blocks) && parsed.blocks.length) {
    const blockResult = z.array(z.record(z.unknown())).safeParse(parsed.blocks);
    if (blockResult.success) {
      blockResult.data.forEach((b, i) => {
        const type = asString(b.type, 'concept');
        const id = asString(b.id, uid(type[0], i + 1));
        try {
          if (type === 'concept') {
            blocks.push({
              type: 'concept',
              id,
              icon: asString(b.icon, '💡'),
              title: asString(b.title, 'Key concept'),
              summary: pickString(b.summary, b.description) || 'Key concept summary',
              keywords: asArray<string>(b.keywords),
              highlight: asString(b.highlight) || undefined,
            });
          } else if (type === 'steps') {
            const steps = asArray<Record<string, unknown>>(b.steps).map((s, j) => ({
              id: asString(s.id, `${id}-${j + 1}`),
              title: asString(s.title, `Step ${j + 1}`),
              description: pickString(s.description, s.content) || '',
              tip: asString(s.tip) || undefined,
            }));
            if (steps.length) blocks.push({ type: 'steps', id, title: asString(b.title, 'Step by step'), steps });
          } else if (type === 'diagram') {
            const mermaid = pickString(b.mermaid, b.mermaid_code);
            if (mermaid) {
              blocks.push({
                type: 'diagram',
                id,
                title: asString(b.title, 'Diagram'),
                diagramKind: (['flowchart', 'mindmap', 'process', 'relationship'].includes(asString(b.diagramKind))
                  ? asString(b.diagramKind)
                  : 'flowchart') as 'flowchart' | 'mindmap' | 'process' | 'relationship',
                mermaid: mermaid.replace(/\\n/g, '\n'),
                caption: asString(b.caption) || undefined,
              });
            }
          } else if (type === 'formula') {
            blocks.push({
              type: 'formula',
              id,
              expression: asString(b.expression, ''),
              explanation: asString(b.explanation, ''),
              variables: asArray<{ symbol?: string; meaning?: string }>(b.variables).map((v) => ({
                symbol: asString(v.symbol, '?'),
                meaning: asString(v.meaning, ''),
              })),
            });
          } else if (type === 'comparison') {
            blocks.push({
              type: 'comparison',
              id,
              title: asString(b.title, 'Comparison'),
              leftLabel: asString(b.leftLabel, 'Option A'),
              rightLabel: asString(b.rightLabel, 'Option B'),
              leftPoints: asArray<string>(b.leftPoints),
              rightPoints: asArray<string>(b.rightPoints),
              verdict: asString(b.verdict) || undefined,
            });
          } else if (type === 'example') {
            blocks.push({
              type: 'example',
              id,
              title: asString(b.title, 'Real-world example'),
              scenario: pickString(b.scenario, b.content) || '',
              insight: pickString(b.insight, b.description) || '',
            });
          } else if (type === 'quiz') {
            blocks.push({
              type: 'quiz',
              id,
              question: asString(b.question, ''),
              options: asArray<string>(b.options),
              correctAnswer: asString(b.correctAnswer, ''),
              explanation: asString(b.explanation, ''),
            });
          } else if (type === 'memory') {
            blocks.push({
              type: 'memory',
              id,
              title: asString(b.title, 'Memory trick'),
              trick: pickString(b.trick, b.mnemonic) || '',
              recallCue: asString(b.recallCue) || undefined,
            });
          } else if (type === 'takeaway') {
            blocks.push({
              type: 'takeaway',
              id,
              points: asArray<string>(b.points).length ? asArray<string>(b.points) : asArray<string>(b.key_takeaways),
            });
          }
        } catch {
          /* skip malformed block */
        }
      });
    }
  }

  // Legacy field migration
  if (!blocks.length) {
    asArray<Record<string, unknown>>(parsed.keyConcepts).forEach((c, i) => {
      blocks.push({
        type: 'concept',
        id: uid('c', i + 1),
        icon: '💡',
        title: asString(c.title, 'Concept'),
        summary: asString(c.description),
        keywords: asArray<string>(c.bullets),
      });
    });

    const legacySteps = asArray<Record<string, unknown>>(parsed.steps || parsed.step_by_step_breakdown);
    if (legacySteps.length) {
      blocks.push({
        type: 'steps',
        id: 's1',
        title: 'Step-by-step breakdown',
        steps: legacySteps.map((s, i) => ({
          id: `s1-${i + 1}`,
          title: asString(s.title, `Step ${i + 1}`),
          description: asString(s.description),
          tip: asString(s.example) || undefined,
        })),
      });
    }

    asArray<Record<string, unknown>>(parsed.diagrams).forEach((d, i) => {
      const mermaid = pickString(d.mermaid, d.mermaid_code);
      if (mermaid) {
        blocks.push({
          type: 'diagram',
          id: uid('d', i + 1),
          title: asString(d.title, 'Diagram'),
          diagramKind: 'flowchart',
          mermaid: mermaid.replace(/\\n/g, '\n'),
        });
      }
    });

    asArray<Record<string, unknown>>(parsed.formulas).forEach((f, i) => {
      blocks.push({
        type: 'formula',
        id: uid('f', i + 1),
        expression: asString(f.expression),
        explanation: asString(f.explanation),
        variables: [],
      });
    });

    asArray<Record<string, unknown>>(parsed.real_world_examples || parsed.examples).forEach((e, i) => {
      blocks.push({
        type: 'example',
        id: uid('e', i + 1),
        title: asString(e.title, 'Example'),
        scenario: pickString(e.content, e.scenario) || '',
        insight: pickString(e.insight) || 'See how this applies in practice.',
      });
    });

    const quiz = (parsed.quiz || asArray(parsed.quiz_questions)[0]) as Record<string, unknown> | undefined;
    if (quiz && asString(quiz.question)) {
      blocks.push({
        type: 'quiz',
        id: 'q1',
        question: asString(quiz.question),
        options: asArray<string>(quiz.options),
        correctAnswer: asString(quiz.correctAnswer),
        explanation: asString(quiz.explanation),
      });
    }

    asArray<Record<string, unknown>>(parsed.memory_tricks).forEach((m, i) => {
      blocks.push({
        type: 'memory',
        id: uid('m', i + 1),
        title: asString(m.title, 'Memory trick'),
        trick: pickString(m.trick, m.mnemonic) || '',
      });
    });
  }

  const takeaways = asArray<string>(parsed.key_takeaways);
  if (takeaways.length && !blocks.some((b) => b.type === 'takeaway')) {
    blocks.push({ type: 'takeaway', id: 't-final', points: takeaways });
  }

  if (!blocks.length) {
    blocks.push({
      type: 'concept',
      id: 'c1',
      icon: '📚',
      title: asString(parsed.title, topic),
      summary: pickString(parsed.short_summary, parsed.summary) || 'Visual explanation generated.',
      keywords: [],
    });
  }

  const experience = {
    title: asString(parsed.title, topic),
    short_summary: pickString(parsed.short_summary, parsed.summary) ||
      (blocks[0]?.type === 'concept' ? blocks[0].summary : '') ||
      'A visual learning guide for this topic.',
    key_idea: pickString(parsed.key_idea, parsed.keyIdea) || 'Focus on the core idea first.',
    difficulty: ['easy', 'medium', 'hard'].includes(asString(parsed.difficulty))
      ? (asString(parsed.difficulty) as 'easy' | 'medium' | 'hard')
      : 'medium',
    mode: parsed.mode as VisualLearningExperience['mode'],
    blocks,
    key_takeaways: takeaways.length ? takeaways : blocks.filter((b) => b.type === 'takeaway').flatMap((b) => (b.type === 'takeaway' ? b.points : [])),
    meta: { topic, estimated_read_minutes: Math.max(2, Math.ceil(blocks.length * 0.75)) },
  };

  return visualLearningExperienceSchema.parse(experience);
}
