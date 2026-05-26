/**
 * AI Energy System
 * Unified energy management across the entire Notevoro ecosystem
 */

import { supabaseAdmin } from '../supabase/admin.js';
import { AI_ENERGY_COSTS } from '../database/schema.js';
import { getDailyEnergyLimit, getEffectivePlan, getUserPlan, isPremiumPlan, PLAN_CONFIG } from '../plans';
import { ensureUserProfile, USER_ENERGY_SELECT } from '../auth/ensureUserProfile.js';

function getPlanKey(plan) {
  const normalized = String(plan || 'free').trim().toLowerCase();
  return PLAN_CONFIG[normalized] ? normalized : 'free';
}

function getMaxEnergy(plan) {
  const planConfig = PLAN_CONFIG[getPlanKey(plan)];
  return planConfig ? planConfig.dailyEnergy : PLAN_CONFIG.free.dailyEnergy;
}

function isPremium(plan) {
  return isPremiumPlan(plan);
}

export async function getAIEnergy(userId) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('users')
    .select(USER_ENERGY_SELECT)
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const effectivePlan = getEffectivePlan(data);
  const maxEnergy = data.ai_energy_max ?? getDailyEnergyLimit(effectivePlan) ?? 0;

  if (isPremiumPlan(effectivePlan)) {
    return {
      currentEnergy: Infinity,
      maxEnergy: Infinity,
      lastRegeneration: data.last_energy_regeneration || new Date().toISOString(),
      regenerated: false
    };
  }

  const currentEnergy = typeof data.ai_energy === 'number' ? data.ai_energy : maxEnergy;
  const lastRegeneration = data.last_energy_regeneration ? new Date(data.last_energy_regeneration) : new Date(0);
  const now = new Date();
  const hoursSinceRegeneration = (now.getTime() - lastRegeneration.getTime()) / (1000 * 60 * 60);

  if (!data.last_energy_regeneration || hoursSinceRegeneration >= 24) {
    const resetKey = `daily_reset_${now.toISOString().slice(0, 10)}_${userId}`;
    const { data: resetResult, error: resetError } = await sb.rpc('reset_energy', {
      p_user: userId,
      p_new_energy: maxEnergy,
      p_reason: 'Daily energy reset',
      p_idempotency: resetKey,
    });

    if (!resetError && typeof resetResult === 'number') {
      return {
        currentEnergy: resetResult,
        maxEnergy,
        lastRegeneration: now.toISOString(),
        regenerated: true
      };
    }
  }

  return {
    currentEnergy,
    maxEnergy,
    lastRegeneration: data.last_energy_regeneration || new Date().toISOString(),
    regenerated: false
  };
}

export async function regenerateEnergy(userId, plan = null) {
  const sb = supabaseAdmin();
  let resolvedPlan = plan ? getUserPlan(plan) : null;

  if (!resolvedPlan) {
    const { data, error } = await sb.from('users').select(USER_ENERGY_SELECT).eq('id', userId).single();
    if (error || !data) return null;
    resolvedPlan = getEffectivePlan(data);
  }

  if (isPremiumPlan(resolvedPlan)) {
    return {
      ai_energy: null,
      ai_energy_max: null,
      last_energy_regeneration: new Date().toISOString()
    };
  }

  const maxEnergy = getDailyEnergyLimit(resolvedPlan) ?? 0;
  const resetKey = `daily_reset_${new Date().toISOString().slice(0, 10)}_${userId}`;
  const { data: resetResult, error: resetError } = await sb.rpc('reset_energy', {
    p_user: userId,
    p_new_energy: maxEnergy,
    p_reason: 'Daily energy reset',
    p_idempotency: resetKey,
  });

  if (resetError || typeof resetResult !== 'number') {
    console.error('Failed to reset AI energy:', resetError);
    return null;
  }

  return {
    ai_energy: resetResult,
    ai_energy_max: maxEnergy,
    last_energy_regeneration: new Date().toISOString()
  };
}

/**
 * @param {string} userId
 * @param {string} actionType
 * @param {number|null} cost
 * @param {string|null} idempotencyKey
 */
export async function consumeAIEnergy(userId, actionType, cost = null, idempotencyKey = null) {
  const sb = supabaseAdmin();
  const energyCost = typeof cost === 'number' ? cost : AI_ENERGY_COSTS[actionType] || 1;

  let { data: user, error: userError } = await sb
    .from('users')
    .select(USER_ENERGY_SELECT)
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.warn('consumeAIEnergy: user row missing, bootstrapping profile', {
      userId,
      userError: userError?.message || userError,
    });
    user = await ensureUserProfile(userId);
    if (!user) {
      return { success: false, error: 'User profile not found. Please sign out and sign in again.', code: 'USER_NOT_FOUND' };
    }
  }

  const effectivePlan = getEffectivePlan(user);
  if (isPremiumPlan(effectivePlan)) {
    console.log('⚡ AI Energy consumed (Premium unlimited):', {
      userId,
      actionType,
      energyCost,
      timestamp: new Date().toISOString()
    });
    return { success: true, energyConsumed: energyCost, remainingEnergy: Infinity };
  }

  const maxEnergy = user.ai_energy_max ?? getDailyEnergyLimit(effectivePlan) ?? 0;

  if (energyCost === 0) {
    return { success: true, energyConsumed: 0, remainingEnergy: user.ai_energy ?? maxEnergy, maxEnergy };
  }

  if (energyCost < 0) {
    const refundAmount = Math.abs(energyCost);
    const { data: refundResult, error: refundError } = await sb.rpc('reward_energy', {
      p_user: userId,
      p_amount: refundAmount,
      p_feature: actionType,
      p_reason: 'AI energy refund',
      p_idempotency: idempotencyKey || null,
    });

    if (refundError) {
      console.error('AI Energy refund failed:', refundError);
      return { success: false, error: refundError.message || 'Failed to refund AI energy' };
    }

    return {
      success: true,
      energyConsumed: -refundAmount,
      remainingEnergy: refundResult,
      maxEnergy
    };
  }

  const { data: remainingEnergy, error } = await sb.rpc('check_and_deduct_energy', {
    p_user: userId,
    p_feature: actionType,
    p_reason: 'Feature usage',
    p_idempotency: idempotencyKey || null,
    p_cost: energyCost,
  });

  if (error) {
    const errorMessage = String(error.message || error.details || 'Failed to deduct AI Energy');
    console.error('⚡ AI Energy deduction error:', {
      userId,
      actionType,
      energyCost,
      error: error.message,
      details: error.details,
      hint: error.hint
    });
    
    if (errorMessage.toLowerCase().includes('insufficient')) {
      return {
        success: false,
        error: 'Insufficient AI Energy',
        code: 'INSUFFICIENT_ENERGY',
        currentEnergy: user.ai_energy ?? maxEnergy,
        requiredEnergy: energyCost,
        maxEnergy
      };
    }

    return { success: false, error: errorMessage, code: 'ENERGY_DEDUCTION_FAILED' };
  }

  console.log('⚡ AI Energy consumed successfully:', {
    userId,
    actionType,
    energyCost,
    remainingEnergy,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    energyConsumed: energyCost,
    remainingEnergy,
    maxEnergy
  };
}

export async function hasSufficientEnergy(userId, actionType) {
  const energyInfo = await getAIEnergy(userId);

  if (!energyInfo) {
    return false;
  }

  const energyCost = AI_ENERGY_COSTS[actionType] || 1;
  if (energyInfo.maxEnergy === Infinity) {
    return true;
  }

  return energyInfo.currentEnergy >= energyCost;
}

export function getEnergyCost(actionType) {
  return AI_ENERGY_COSTS[actionType] || 1;
}

export async function formatEnergyInfo(userId) {
  const energyInfo = await getAIEnergy(userId);
  
  if (!energyInfo) {
    return 'No energy data available';
  }

  const maxDisplay = energyInfo.maxEnergy === Infinity ? '∞' : energyInfo.maxEnergy;
  const currentDisplay = energyInfo.maxEnergy === Infinity ? '∞' : energyInfo.currentEnergy;

  return `⚡ AI Energy: ${currentDisplay}/${maxDisplay}`;
}

export async function getEnergyStats(userId) {
  const energyInfo = await getAIEnergy(userId);
  if (!energyInfo) return null;
  const percentage = energyInfo.maxEnergy === Infinity ? 100 : Math.round((energyInfo.currentEnergy / energyInfo.maxEnergy) * 100);

  return {
    currentEnergy: energyInfo.currentEnergy,
    maxEnergy: energyInfo.maxEnergy,
    percentage,
    lastRegeneration: energyInfo.lastRegeneration,
    hoursUntilRegeneration: calculateHoursUntilRegeneration(energyInfo.lastRegeneration)
  };
}

function calculateHoursUntilRegeneration(lastRegeneration) {
  const last = new Date(lastRegeneration);
  const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const hoursUntil = Math.max(0, (next - now) / (1000 * 60 * 60));
  return Math.round(hoursUntil);
}

export async function setEnergy(userId, energy) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('users').update({ ai_energy: energy }).eq('id', userId).select('ai_energy').single();
  if (error || !data) return null;
  return data;
}

export async function addEnergyBonus(userId, bonus) {
  const sb = supabaseAdmin();
  const { data: user, error: userError } = await sb.from('users').select('plan, ai_energy, ai_energy_max').eq('id', userId).single();
  if (userError || !user) return null;

  const maxEnergy = user.ai_energy_max ?? getMaxEnergy(user.plan);
  const currentEnergy = typeof user.ai_energy === 'number' ? user.ai_energy : maxEnergy;
  const newEnergy = Math.min(maxEnergy, currentEnergy + bonus);

  const { data, error } = await sb.from('users').update({ ai_energy: newEnergy }).eq('id', userId).select('ai_energy').single();
  if (error || !data) return null;
  return data;
}
