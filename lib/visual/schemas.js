'use strict';

import { z } from 'zod';
import { createFallbackLessonData, normalizeLessonData, safeArray, safeObject, safeString } from './normalizeLessonData';

// Core primitives
const PositionSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

const VisualSchema = z.object({
  id: z.string().optional(),
  kind: z.string(),
  animation: z.string().optional(),
  position: PositionSchema.optional(),
  props: z.record(z.any()).optional(),
});

const InteractionSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string().optional(),
  props: z.record(z.any()).optional(),
});

const QuizSchema = z.object({
  id: z.string().optional(),
  question: z.string(),
  options: z.array(z.string()),
  correct: z.number().optional(),
});

const SceneSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  narration: z.string().optional(),
  camera: z.string().optional(),
  duration: z.number().optional(),
  visuals: z.array(VisualSchema).optional(),
  interactions: z.array(InteractionSchema).optional(),
  quiz: QuizSchema.optional(),
  meta: z.record(z.any()).optional(),
});

const LessonSchema = z.object({
  topic: z.string(),
  subject: z.string().optional(),
  difficulty: z.string().optional(),
  scenes: z.array(SceneSchema).min(1),
  metadata: z.record(z.any()).optional(),
});

function validateLessonPacket(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    console.debug('[visual] validateLessonPacket - parsed', parsed);
    const result = LessonSchema.safeParse(parsed);
    if (result.success) return { valid: true, data: result.data };
    // attempt a best-effort repair
    const repaired = attemptRepair(parsed);
    console.debug('[visual] validateLessonPacket - repaired candidate', repaired);
    const repairedResult = LessonSchema.safeParse(repaired);
    if (repairedResult.success) return { valid: true, data: repairedResult.data, repaired: true, errors: result.error?.issues };
    return { valid: false, errors: result.error?.issues || repairedResult.error?.issues };
  } catch (err) {
    console.warn('[visual] validateLessonPacket - parse/validation error', err);
    return { valid: false, errors: [{ message: String(err) }] };
  }
}

function attemptRepair(parsed) {
  const raw = safeObject(parsed);

  // If the old format (normalizeLessonData) is provided, map steps -> scenes
  if (raw.steps && Array.isArray(raw.steps)) {
    const scenes = raw.steps.map((step, idx) => {
      const s = safeObject(step);
      return {
        id: s.id || `scene_${idx + 1}`,
        type: s.type || 'generic',
        title: safeString(s.title, s.stepId ? `Step ${s.stepId}` : `Scene ${idx + 1}`),
        narration: safeString(s.narration, s.description || ''),
        camera: s.camera || 'center',
        visuals: (s.visuals || s.visualCues || []).map((v, i) => (typeof v === 'string' ? { id: `v_${i}`, kind: v } : v)),
        interactions: s.interactions || [],
        quiz: s.quiz || null,
        meta: s.meta || {},
      };
    });

    return {
      topic: raw.title || raw.topic || 'Untitled',
      subject: raw.lessonType || raw.subject || 'general',
      difficulty: raw.difficulty || 'intro',
      scenes,
      metadata: raw.moduleData || {},
    };
  }

  // If the packet already looks like scenes but with minor issues, try to normalize keys
  if (raw.scenes && Array.isArray(raw.scenes)) {
    const scenes = raw.scenes.map((s, idx) => {
      const scene = safeObject(s);
      return {
        id: scene.id || `scene_${idx + 1}`,
        type: safeString(scene.type, 'generic'),
        title: safeString(scene.title, `Scene ${idx + 1}`),
        narration: safeString(scene.narration, ''),
        camera: safeString(scene.camera, 'center'),
        duration: typeof scene.duration === 'number' ? scene.duration : undefined,
        visuals: safeArray(scene.visuals).map((v, i) => (typeof v === 'string' ? { id: `v_${i}`, kind: v } : v)),
        interactions: safeArray(scene.interactions),
        quiz: scene.quiz || undefined,
        meta: safeObject(scene.meta || scene.metadata || {}),
      };
    });

    return {
      topic: safeString(raw.topic, raw.title || 'Untitled'),
      subject: safeString(raw.subject, raw.lessonType || 'general'),
      difficulty: safeString(raw.difficulty, 'intro'),
      scenes,
      metadata: safeObject(raw.metadata || raw.moduleData || {}),
    };
  }

  // fallback: build a single-scene lesson from title/description
  const title = safeString(raw.title || raw.topic || 'Untitled');
  const description = safeString(raw.description || raw.subtitle || 'A short visual lesson');
  return {
    topic: title,
    subject: safeString(raw.lessonType || 'general'),
    difficulty: safeString(raw.difficulty || 'intro'),
    scenes: [
      {
        id: 'scene_1',
        type: 'generic',
        title,
        narration: description,
        camera: 'center',
        visuals: [],
        interactions: [],
      },
    ],
    metadata: {},
  };
}

function createFallbackLessonSchema() {
  const fallback = createFallbackLessonData();
  // Map normalized fallback to schema shape
  const scenes = (fallback.steps || []).map((s, idx) => ({
    id: s.id || `scene_${idx + 1}`,
    type: 'astronomy',
    title: s.title,
    narration: s.narration || s.description,
    camera: 'center',
    visuals: (s.visualCues || []).map((cue, i) => ({ id: `v_${i}`, kind: cue })),
    interactions: [],
    quiz: undefined,
    meta: {},
  }));

  return {
    topic: fallback.title,
    subject: fallback.lessonType,
    difficulty: 'intro',
    scenes,
    metadata: fallback.moduleData || {},
  };
}

// Map the lesson schema into the existing normalized lesson shape used by the frontend
function schemaToNormalizedLesson(schemaLesson) {
  const src = safeObject(schemaLesson);
  const title = safeString(src.topic || 'Untitled Lesson');
  const lessonType = safeString(src.subject || src.lessonType || 'general').toLowerCase();
  const template = safeString(src.metadata?.template || src.template || lessonType).toLowerCase();

  const steps = (src.scenes || []).map((scene, idx) => {
    const s = safeObject(scene);
    const id = s.id || `scene_${idx + 1}`;
    return {
      id,
      stepId: idx + 1,
      title: safeString(s.title || `Scene ${idx + 1}`),
      description: safeString(s.narration || s.title || ''),
      narration: safeString(s.narration || s.description || ''),
      visualCues: (s.visuals || []).map((v) => (typeof v === 'string' ? v : v.kind || JSON.stringify(v))).filter(Boolean),
      actions: s.interactions || [],
      meta: s.meta || {},
    };
  });

  return normalizeLessonData({
    lessonType,
    template,
    title,
    subtitle: '',
    description: '',
    theme: src.metadata?.theme || 'cinematic',
    moduleData: src.metadata || {},
    steps,
    currentStepIndex: 0,
  });
}

export { LessonSchema, SceneSchema, VisualSchema, InteractionSchema, QuizSchema, validateLessonPacket, attemptRepair, createFallbackLessonSchema, schemaToNormalizedLesson };
