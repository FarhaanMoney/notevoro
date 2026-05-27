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

const SlideSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  visualType: z.string(),
  visualPrompt: z.string(),
  bulletPoints: z.array(z.string()),
});

const LessonSchema = z.object({
  title: z.string(),
  description: z.string(),
  slides: z.array(SlideSchema).min(3).max(8),
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

  // If the AI returns strict slides format, normalize slides into the lesson model
  if (raw.slides && Array.isArray(raw.slides)) {
    const slides = raw.slides.map((slide, idx) => {
      const s = safeObject(slide);
      return {
        id: safeString(s.id, `slide_${idx + 1}`),
        title: safeString(s.title, `Slide ${idx + 1}`),
        content: safeString(s.content, ''),
        visualType: safeString(s.visualType, 'diagram'),
        visualPrompt: safeString(s.visualPrompt, ''),
        bulletPoints: safeArray(s.bulletPoints).map((point) => safeString(point, '')).filter(Boolean),
      };
    });

    return {
      title: safeString(raw.title, 'Untitled Lesson'),
      description: safeString(raw.description, 'A visual lesson'),
      slides,
    };
  }

  // If the old format (normalizeLessonData) is provided, map steps -> slides
  if (raw.steps && Array.isArray(raw.steps)) {
    const slides = raw.steps.map((step, idx) => {
      const s = safeObject(step);
      return {
        id: safeString(s.id, `slide_${idx + 1}`),
        title: safeString(s.title, s.stepId ? `Step ${s.stepId}` : `Slide ${idx + 1}`),
        content: safeString(s.description, s.narration || ''),
        visualType: 'diagram',
        visualPrompt: safeArray(s.visualCues).map((cue) => safeString(cue, '')).filter(Boolean).join('. ') || 'Educational visual explanation.',
        bulletPoints: safeArray(s.visualCues).map((cue) => safeString(cue, '')).filter(Boolean),
      };
    });

    return {
      title: safeString(raw.title, raw.topic || 'Untitled Lesson'),
      description: safeString(raw.description, raw.subtitle || 'A visual lesson'),
      slides,
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
  const slides = (fallback.steps || []).map((s, idx) => ({
    id: s.id || `slide_${idx + 1}`,
    title: s.title,
    content: s.description,
    visualType: 'diagram',
    visualPrompt: (s.visualCues || []).join('. ') || 'Interactive visual explanation.',
    bulletPoints: (s.visualCues || []).map((cue) => safeString(cue, '')),
  }));

  return {
    title: fallback.title,
    description: fallback.description,
    slides,
  };
}

// Map the lesson schema into the existing normalized lesson shape used by the frontend
function schemaToNormalizedLesson(schemaLesson) {
  const src = safeObject(schemaLesson);
  const title = safeString(src.title || 'Untitled Lesson');
  const description = safeString(src.description || 'A visual lesson');
  const steps = (src.slides || []).map((slide, idx) => {
    const s = safeObject(slide);
    return {
      id: safeString(s.id, `slide_${idx + 1}`),
      stepId: idx + 1,
      title: safeString(s.title || `Slide ${idx + 1}`),
      description: safeString(s.content || ''),
      narration: safeString(s.content || ''),
      visualCues: safeArray(s.bulletPoints).map((point) => safeString(point, '')).filter(Boolean),
      actions: [],
      meta: { visualType: safeString(s.visualType, 'diagram'), visualPrompt: safeString(s.visualPrompt, '') },
    };
  });

  return normalizeLessonData({
    lessonType: 'general',
    template: 'default',
    title,
    subtitle: '',
    description,
    theme: 'cinematic',
    moduleData: {},
    steps,
    currentStepIndex: 0,
  });
}

export { LessonSchema, SlideSchema, SceneSchema, VisualSchema, InteractionSchema, QuizSchema, validateLessonPacket, attemptRepair, createFallbackLessonSchema, schemaToNormalizedLesson };
