import { z } from 'zod';

export const learningModeSchema = z.enum(['beginner', 'advanced', 'exam', 'quick', 'deep']);

export const blockTypeSchema = z.enum([
  'concept',
  'steps',
  'diagram',
  'formula',
  'comparison',
  'example',
  'quiz',
  'memory',
  'takeaway',
]);

export const conceptBlockSchema = z.object({
  type: z.literal('concept'),
  id: z.string(),
  icon: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()).default([]),
  highlight: z.string().optional(),
});

export const stepItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tip: z.string().optional(),
});

export const stepsBlockSchema = z.object({
  type: z.literal('steps'),
  id: z.string(),
  title: z.string(),
  steps: z.array(stepItemSchema).min(1),
});

export const diagramBlockSchema = z.object({
  type: z.literal('diagram'),
  id: z.string(),
  title: z.string(),
  diagramKind: z.enum(['flowchart', 'mindmap', 'process', 'relationship']).default('flowchart'),
  mermaid: z.string().min(1),
  caption: z.string().optional(),
});

export const formulaBlockSchema = z.object({
  type: z.literal('formula'),
  id: z.string(),
  expression: z.string(),
  explanation: z.string(),
  variables: z.array(z.object({ symbol: z.string(), meaning: z.string() })).default([]),
});

export const comparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  id: z.string(),
  title: z.string(),
  leftLabel: z.string(),
  rightLabel: z.string(),
  leftPoints: z.array(z.string()).default([]),
  rightPoints: z.array(z.string()).default([]),
  verdict: z.string().optional(),
});

export const exampleBlockSchema = z.object({
  type: z.literal('example'),
  id: z.string(),
  title: z.string(),
  scenario: z.string(),
  insight: z.string(),
});

export const quizBlockSchema = z.object({
  type: z.literal('quiz'),
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctAnswer: z.string(),
  explanation: z.string(),
});

export const memoryBlockSchema = z.object({
  type: z.literal('memory'),
  id: z.string(),
  title: z.string(),
  trick: z.string(),
  recallCue: z.string().optional(),
});

export const takeawayBlockSchema = z.object({
  type: z.literal('takeaway'),
  id: z.string(),
  points: z.array(z.string()).min(1),
});

export const learningBlockSchema = z.discriminatedUnion('type', [
  conceptBlockSchema,
  stepsBlockSchema,
  diagramBlockSchema,
  formulaBlockSchema,
  comparisonBlockSchema,
  exampleBlockSchema,
  quizBlockSchema,
  memoryBlockSchema,
  takeawayBlockSchema,
]);

export const visualLearningExperienceSchema = z.object({
  title: z.string().min(1),
  short_summary: z.string().min(1),
  key_idea: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  mode: learningModeSchema.optional(),
  blocks: z.array(learningBlockSchema).min(1),
  key_takeaways: z.array(z.string()).default([]),
  meta: z
    .object({
      topic: z.string().optional(),
      estimated_read_minutes: z.number().optional(),
    })
    .optional(),
});

export type LearningBlock = z.infer<typeof learningBlockSchema>;
export type VisualLearningExperience = z.infer<typeof visualLearningExperienceSchema>;
export type LearningMode = z.infer<typeof learningModeSchema>;
