import { z } from 'zod';
import { learningModeSchema, visualLearningExperienceSchema } from './types';

export const visualExplanationRequestSchema = z.object({
  topic: z.string().trim().min(3).max(2000),
  context: z.string().trim().max(4000).optional().default(''),
  mode: learningModeSchema.optional().default('beginner'),
});

export const visualExplanationResponseSchema = visualLearningExperienceSchema;

export const visualExplanationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  remainingEnergy: z.number().nullable().optional(),
});

export type VisualExplanationRequest = z.infer<typeof visualExplanationRequestSchema>;
export type VisualExplanationResponse = z.infer<typeof visualExplanationResponseSchema>;
