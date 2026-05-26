/**
 * Subscription Manager
 * Handles subscription plans, upgrades, downgrades, and feature access
 */

import { SUBSCRIPTION_PLANS } from '../database/schema.js';
import { getUserById, updateUser } from '../auth/userManager.js';
import { regenerateEnergy } from '../energy/aiEnergy.js';

/**
 * Get subscription plan details
 * @param {string} planId - Plan ID (free, pro, premium)
 * @returns {Object} - Plan details
 */
export function getPlanDetails(planId) {
  return SUBSCRIPTION_PLANS[planId.toUpperCase()] || SUBSCRIPTION_PLANS.FREE;
}

/**
 * Get user's current subscription
 * @param {string} userId - User ID
 * @returns {Object} - Subscription info
 */
export function getUserSubscription(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const plan = getPlanDetails(user.subscriptionPlan);
  const isActive = !user.subscriptionEndsAt || new Date(user.subscriptionEndsAt) > new Date();

  return {
    plan: user.subscriptionPlan,
    planDetails: plan,
    isActive,
    endsAt: user.subscriptionEndsAt,
    trialUsed: user.trialUsed,
    trialEndsAt: user.trialEndsAt
  };
}

/**
 * Upgrade subscription
 * @param {string} userId - User ID
 * @param {string} newPlan - New plan (pro, premium)
 * @param {string} billingCycle - monthly or yearly
 * @returns {Object} - Updated subscription
 */
export function upgradeSubscription(userId, newPlan, billingCycle = 'monthly') {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const plan = getPlanDetails(newPlan);
  if (!plan) {
    throw new Error('Invalid plan');
  }

  const now = new Date();
  let subscriptionEndsAt;

  if (billingCycle === 'yearly') {
    subscriptionEndsAt = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
  } else {
    subscriptionEndsAt = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
  }

  const updatedUser = updateUser(userId, {
    subscriptionPlan: newPlan,
    subscriptionEndsAt,
    updatedAt: new Date().toISOString()
  });

  // Regenerate energy with new limits
  regenerateEnergy(userId);

  console.log('⬆️ Subscription upgraded:', {
    userId,
    newPlan,
    billingCycle,
    endsAt: subscriptionEndsAt,
    timestamp: new Date().toISOString()
  });

  return getUserSubscription(userId);
}

/**
 * Downgrade subscription
 * @param {string} userId - User ID
 * @param {string} newPlan - New plan (free)
 * @returns {Object} - Updated subscription
 */
export function downgradeSubscription(userId, newPlan) {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = updateUser(userId, {
    subscriptionPlan: newPlan,
    subscriptionEndsAt: null,
    updatedAt: new Date().toISOString()
  });

  // Regenerate energy with new limits
  regenerateEnergy(userId);

  console.log('⬇️ Subscription downgraded:', {
    userId,
    newPlan,
    timestamp: new Date().toISOString()
  });

  return getUserSubscription(userId);
}

/**
 * Check if user has access to a feature
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 * @returns {boolean} - True if has access
 */
export async function hasFeatureAccess(userId, feature) {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const sb = supabaseAdmin();
  
  const { data: user, error } = await sb.from('users').select('*').eq('id', userId).single();
  
  if (error || !user) {
    return false;
  }

  const plan = user.plan || 'free';
  const isTrialActive = user.is_trial_active === true;
  
  // Get feature tiers from centralized plans config
  const { FEATURE_TIERS } = require('../plans');
  const tiers = FEATURE_TIERS[feature];
  
  if (!tiers) {
    // Feature not defined in tiers, default to allowing all plans
    return true;
  }
  
  const effectivePlan = isTrialActive ? 'trial' : plan;
  return tiers.includes(effectivePlan);
}

/**
 * Check if user is on trial
 * @param {string} userId - User ID
 * @returns {boolean} - True if on trial
 */
export async function isOnTrial(userId) {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const sb = supabaseAdmin();
  
  const { data: user, error } = await sb.from('users').select('*').eq('id', userId).single();
  
  if (error || !user) {
    return false;
  }

  if (!user.is_trial_active || !user.trial_start) {
    return false;
  }

  const trialStart = new Date(user.trial_start);
  const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return trialEnd > new Date();
}

/**
 * Get days remaining in trial
 * @param {string} userId - User ID
 * @returns {number} - Days remaining
 */
export async function getTrialDaysRemaining(userId) {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const sb = supabaseAdmin();
  
  const { data: user, error } = await sb.from('users').select('*').eq('id', userId).single();
  
  if (error || !user) {
    return 0;
  }

  if (!user.is_trial_active || !user.trial_start) {
    return 0;
  }

  const trialStart = new Date(user.trial_start);
  const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = trialEnd - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

/**
 * Cancel subscription
 * @param {string} userId - User ID
 * @returns {Object} - Updated subscription
 */
export function cancelSubscription(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.subscriptionPlan === 'free') {
    throw new Error('Already on free plan');
  }

  // Keep current plan until end date, then downgrade to free
  const updatedUser = updateUser(userId, {
    subscriptionEndsAt: user.subscriptionEndsAt, // Keep existing end date
    updatedAt: new Date().toISOString()
  });

  console.log('❌ Subscription cancelled:', {
    userId,
    currentPlan: user.subscriptionPlan,
    endsAt: user.subscriptionEndsAt,
    timestamp: new Date().toISOString()
  });

  return getUserSubscription(userId);
}

/**
 * Check for expired subscriptions and downgrade
 * @returns {Array} - Downgraded user IDs
 */
export function checkExpiredSubscriptions() {
  const downgraded = [];
  const now = new Date();

  // This would iterate through all users in production
  // For now, this is a placeholder

  return downgraded;
}

/**
 * Get subscription pricing
 * @param {string} planId - Plan ID
 * @returns {Object} - Pricing info
 */
export function getPricing(planId) {
  const plan = getPlanDetails(planId);
  
  return {
    plan: plan.id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice || 0,
    yearlyPrice: plan.yearlyPrice || 0,
    yearlySavings: plan.yearlyPrice ? (plan.monthlyPrice * 12 - plan.yearlyPrice) : 0,
    dailyEnergyLimit: plan.dailyEnergyLimit,
    features: plan.features
  };
}

/**
 * Get all available plans
 * @returns {Array} - All plans
 */
export function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice || 0,
    yearlyPrice: plan.yearlyPrice || 0,
    dailyEnergyLimit: plan.dailyEnergyLimit,
    features: plan.features
  }));
}
