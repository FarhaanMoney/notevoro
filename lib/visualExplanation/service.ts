import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { getEffectivePlan } from '@/lib/plans';
import { consumeAIEnergy } from '@/lib/energy/aiEnergy';
import { visualExplanationRequestSchema } from './schemas';
import { buildVisualExplanationPrompt } from './prompt';
import { parseVisualLearningResponse } from './parser';
import { ENERGY_COST_BY_MODE } from './constants';
import { visualLog } from './logger';
import type { VisualLearningExperience } from './types';

const MAX_RESPONSE_TOKENS = 4500;
const OPENAI_TIMEOUT_MS = 45000;
const MAX_RETRIES = 1;

export type VisualExplanationServiceResult = {
  success: boolean;
  data?: VisualLearningExperience;
  error?: string;
  code?: string;
  remainingEnergy?: number | null;
  details?: unknown;
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });
}

export async function generateVisualExplanation(payload: unknown, req: Request): Promise<VisualExplanationServiceResult> {
  const parseResult = visualExplanationRequestSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid request payload',
      code: 'INVALID_PAYLOAD',
      details: parseResult.error.flatten(),
    };
  }

  const body = parseResult.data;
  const user = await requireUser(req);
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  const effectivePlan = getEffectivePlan(user);
  if (!['pro', 'premium', 'trial'].includes(effectivePlan)) {
    return { success: false, error: 'Upgrade required for Visual Explanations', code: 'UPGRADE_REQUIRED' };
  }

  const energyCost = ENERGY_COST_BY_MODE[body.mode] ?? 15;
  const idempotencyKey = `visual-${body.mode}-${Date.now()}-${user.id}`;

  const deduction = await consumeAIEnergy(user.id, 'visual_explanation', energyCost, idempotencyKey);
  if (!deduction.success) {
    const code =
      (deduction as { code?: string }).code === 'USER_NOT_FOUND'
        ? 'USER_NOT_FOUND'
        : (deduction as { code?: string }).code === 'INSUFFICIENT_ENERGY' ||
            String(deduction.error || '').toLowerCase().includes('insufficient')
          ? 'INSUFFICIENT_ENERGY'
          : 'ENERGY_ERROR';

    return {
      success: false,
      error: deduction.error || 'Unable to deduct AI Energy',
      code,
      remainingEnergy: (deduction as { currentEnergy?: number }).currentEnergy ?? 0,
    };
  }

  const openai = getOpenAIClient();
  const prompt = buildVisualExplanationPrompt(body);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await Promise.race([
        openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are Notevoro Visual Learning Engine. Output ONLY valid JSON matching the requested schema. No markdown fences.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.55,
          max_tokens: MAX_RESPONSE_TOKENS,
          response_format: { type: 'json_object' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timed out')), OPENAI_TIMEOUT_MS)
        ),
      ]);

      const text = String(response.choices?.[0]?.message?.content || '').trim();
      const validated = parseVisualLearningResponse(text, body.topic);

      try {
        await supabaseAdmin().from('feature_usage').insert({
          user_id: user.id,
          feature: 'visual_explanation',
          energy_cost: energyCost,
          payload: { topic: body.topic, mode: body.mode, block_count: validated.blocks.length },
          created_at: new Date().toISOString(),
        });
      } catch (usageErr) {
        visualLog.info('feature_usage insert skipped', {
          message: usageErr instanceof Error ? usageErr.message : String(usageErr),
        });
      }

      visualLog.info('Visual learning generated', {
        userId: user.id,
        mode: body.mode,
        blocks: validated.blocks.length,
      });

      return {
        success: true,
        data: validated,
        remainingEnergy: deduction.remainingEnergy ?? null,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      visualLog.error('Generation attempt failed', { attempt, message: lastError.message });
    }
  }

  await consumeAIEnergy(
    user.id,
    'visual_explanation_refund',
    -energyCost,
    `visual-refund-${Date.now()}-${user.id}`
  );

  return {
    success: false,
    error: lastError?.message || 'Failed to generate visual explanation',
    code: 'GENERATION_FAILED',
    remainingEnergy: (deduction as { remainingEnergy?: number }).remainingEnergy ?? null,
  };
}
