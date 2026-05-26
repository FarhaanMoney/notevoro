/**
 * Centralized trial and effective plan helper functions
 * Ensures trial users are treated exactly like Pro users during their trial period
 */

import { getEffectivePlan as centralGetEffectivePlan, isTrialActive as centralIsTrialActive, getDailyEnergyLimit } from '@/lib/plans';

/**
 * Delegates to centralized plan helpers
 */
export function getEffectivePlan(user) {
  return centralGetEffectivePlan(user);
}

/**
 * Check if a user is currently on an active trial
 * @param {Object} user - User object from database
 * @returns {boolean} - True if trial is active and not expired
 */
export function isTrialActive(user) {
  return centralIsTrialActive(user);
}

/**
 * Get days remaining in trial
 * @param {Object} user - User object from database
 * @returns {number} - Days remaining (0 if no trial or expired)
 */
export function getTrialDaysRemaining(user) {
  if (!isTrialActive(user)) {
    return 0;
  }
  
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const now = new Date();
  
  if (!trialEnd) {
    const trialStart = user.trial_start ? new Date(user.trial_start) : null;
    if (!trialStart) return 0;
    const calculatedEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const msRemaining = calculatedEnd - now;
    return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  }
  
  const msRemaining = trialEnd - now;
  return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
}

/**
 * Get trial progress percentage (0-100)
 * @param {Object} user - User object from database
 * @returns {number} - Progress percentage
 */
export function getTrialProgress(user) {
  if (!isTrialActive(user)) {
    return 0;
  }
  
  const trialStart = user.trial_start ? new Date(user.trial_start) : null;
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const now = new Date();
  
  if (!trialStart) return 0;
  
  const startTime = trialStart.getTime();
  const endTime = trialEnd ? trialEnd.getTime() : startTime + 7 * 24 * 60 * 60 * 1000;
  const currentTime = now.getTime();
  
  const totalDuration = endTime - startTime;
  const elapsed = currentTime - startTime;
  
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  return Math.round(progress);
}

/**
 * Activate 7-day Pro trial for a user
 * @param {string} userId - User ID
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} - Result with success status and message
 */
export async function activateTrial(userId, supabase) {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Check if user already has an active trial
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('is_trial_active, trial_start, trial_ends_at, plan')
    .eq('id', userId)
    .single();
  
  if (fetchError || !existingUser) {
    console.error('Trial activation: User not found:', fetchError);
    return {
      success: false,
      message: 'User not found'
    };
  }
  
  // Prevent reactivating trial if already active
  if (existingUser.is_trial_active === true) {
    const currentTrialEnd = existingUser.trial_ends_at ? new Date(existingUser.trial_ends_at) : null;
    if (currentTrialEnd && currentTrialEnd > now) {
      console.log('Trial activation: User already has active trial');
      return {
        success: false,
        message: 'Trial already active'
      };
    }
  }
  
  // Prevent trial activation if user already has paid subscription
  if (existingUser.plan === 'pro' || existingUser.plan === 'premium') {
    console.log('Trial activation: User already has paid plan:', existingUser.plan);
    return {
      success: false,
      message: 'User already has paid subscription'
    };
  }
  
  const trialEnergy = getDailyEnergyLimit('trial') ?? 250;
  const { error } = await supabase
    .from('users')
    .update({
      plan: 'pro',
      is_trial_active: true,
      trial_start: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      ai_energy_max: trialEnergy,
      ai_energy: trialEnergy,
      last_energy_regeneration: now.toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Trial activation error:', error);
    return {
      success: false,
      message: 'Failed to activate trial'
    };
  }
  
  return {
    success: true,
    message: '7-day Pro trial activated successfully',
    trialEnd: trialEnd.toISOString()
  };
}

/**
 * Expire trial and revert user to free plan
 * @param {string} userId - User ID
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} - Result with success status
 */
export async function expireTrial(userId, supabase) {
  const freeEnergy = getDailyEnergyLimit('free') ?? 20;
  const { error } = await supabase
    .from('users')
    .update({
      plan: 'free',
      is_trial_active: false,
      trial_ends_at: new Date().toISOString(),
      ai_energy_max: freeEnergy,
      ai_energy: freeEnergy,
      last_energy_regeneration: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Trial expiration error:', error);
    return {
      success: false,
      message: 'Failed to expire trial'
    };
  }
  
  return {
    success: true,
    message: 'Trial expired, reverted to free plan'
  };
}
