export const LEARNING_MODES = [
  { id: 'beginner', label: 'Beginner', description: 'Simple language, more analogies' },
  { id: 'advanced', label: 'Advanced', description: 'Deeper terminology and nuance' },
  { id: 'exam', label: 'Exam Focus', description: 'High-yield facts and recall' },
  { id: 'quick', label: 'Quick', description: 'Essentials in under 2 minutes' },
  { id: 'deep', label: 'Deep Dive', description: 'Comprehensive mastery path' },
] as const;

export type LearningModeId = (typeof LEARNING_MODES)[number]['id'];

export const MODE_PROMPTS: Record<LearningModeId, string> = {
  beginner:
    'Use very simple language, everyday analogies first, then light theory. Avoid jargon unless defined.',
  advanced:
    'Use precise terminology, include nuance, edge cases, and connections to related advanced topics.',
  exam:
    'Focus on exam-style clarity, high-yield facts, common traps, and rapid recall patterns.',
  quick:
    'Be extremely concise. Only the most important ideas, steps, and one memorable hook.',
  deep:
    'Provide comprehensive coverage with layered understanding, multiple examples, and deep connections.',
};

export const ENERGY_COST_BY_MODE: Record<LearningModeId, number> = {
  beginner: 12,
  advanced: 15,
  exam: 14,
  quick: 8,
  deep: 20,
};

export const DEFAULT_MODE: LearningModeId = 'beginner';
