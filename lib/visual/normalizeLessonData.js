'use strict';

function safeString(value, fallback = 'Untitled') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeStep(step, index) {
  const safe = safeObject(step);
  const id = safeString(safe.id, `step-${index + 1}-${crypto.randomUUID?.() ?? index}`);
  return {
    id,
    stepId: typeof safe.stepId === 'number' ? safe.stepId : index + 1,
    title: safeString(safe.title, `Step ${index + 1}`),
    description: safeString(safe.description, safe.narration || ''),
    narration: safeString(safe.narration, safe.description || ''),
    visualCues: safeArray(safe.visualCues).map((cue) => safeString(cue, '')).filter(Boolean),
    actions: safeArray(safe.actions),
  };
}

function normalizeLessonData(raw) {
  const lesson = safeObject(raw);
  const steps = safeArray(lesson.steps).map((step, index) => normalizeStep(step, index));

  const normalized = {
    lessonType: safeString(lesson.lessonType, 'general').toLowerCase(),
    template: safeString(lesson.template, 'default').toLowerCase(),
    title: safeString(lesson.title, 'Untitled Lesson'),
    subtitle: safeString(lesson.subtitle, lesson.description || ''),
    description: safeString(lesson.description, lesson.subtitle || ''),
    theme: safeString(lesson.theme, 'cinematic'),
    moduleData: safeObject(lesson.moduleData),
    steps,
    currentStepIndex: Math.max(0, Math.min(steps.length - 1, typeof lesson.currentStepIndex === 'number' ? lesson.currentStepIndex : 0)),
    currentStep: null,
  };

  normalized.currentStep = normalized.steps[normalized.currentStepIndex] || null;
  return normalized;
}

function createFallbackLessonData() {
  const fallback = {
    lessonType: 'astronomy',
    template: 'black_hole',
    title: 'Black Hole Fallback Lesson',
    subtitle: 'A safe interactive fallback experience',
    description: 'This lesson is shown when the AI response is malformed or incomplete.',
    theme: 'cosmic',
    moduleData: {},
    steps: [
      {
        id: 'fallback-step-1',
        stepId: 1,
        title: 'Event horizon',
        description: 'A glowing event horizon forms around the black hole.',
        narration: 'This is the point of no return: once matter crosses, gravity is too strong to escape.',
        visualCues: ['Glowing horizon', 'Matter spiraling inward'],
        actions: [],
      },
      {
        id: 'fallback-step-2',
        stepId: 2,
        title: 'Accretion disk',
        description: 'Matter swirls in an accretion disk as it falls toward the center.',
        narration: 'The disk heats up and shines as gravitational energy converts into light.',
        visualCues: ['Orbiting particles', 'Magenta glow'],
        actions: [],
      },
      {
        id: 'fallback-step-3',
        stepId: 3,
        title: 'Gravity pull',
        description: 'Gravity accelerates matter toward the singularity.',
        narration: 'The closer particles get, the faster they move along their curved paths.',
        visualCues: ['Increasing speed', 'Curving trajectories'],
        actions: [],
      },
    ],
    currentStepIndex: 0,
    currentStep: null,
  };

  fallback.currentStep = fallback.steps[0];
  return fallback;
}

function isLessonData(value) {
  const lesson = safeObject(value);
  return typeof lesson.title === 'string' && lesson.title.trim() && typeof lesson.template === 'string';
}

export { normalizeLessonData, createFallbackLessonData, isLessonData, safeArray, safeString, safeObject };

function sanitizeLessonInput(raw) {
  try {
    console.debug('[visual] sanitizeLessonInput - raw:', raw);
  } catch (e) {}

  const cleaned = normalizeLessonData(raw || {});

  try {
    console.debug('[visual] sanitizeLessonInput - cleaned:', cleaned);
  } catch (e) {}

  return cleaned;
}

export { sanitizeLessonInput };
