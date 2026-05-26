/**
 * Access Control
 * Checks verification, subscription, and energy before allowing AI actions
 */

import { getUserByPhone, isVerifiedUser } from './userManager.js';
import { supabaseAdmin } from '../supabase/admin.js';
import { hasSufficientEnergy, consumeAIEnergy, getEnergyStats } from '../energy/aiEnergy.js';
import { hasFeatureAccess, isOnTrial, getTrialDaysRemaining } from '../subscription/subscriptionManager.js';

/**
 * Check if user can access AI features
 * @param {string} phoneNumber - Phone number
 * @returns {Object} - Access result
 */
async function getUserByPhoneDb(phoneNumber) {
  if (!phoneNumber) return null;
  const normalized = String(phoneNumber).replace(/\D/g, '');
  if (!normalized) return null;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('users')
    .select('*')
    .or(`phone_number.ilike.%${normalized}%,personalization->>whatsapp_phone.ilike.%${normalized}%`)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

export async function checkAIAccess(phoneNumber) {
  const user = await getUserByPhoneDb(phoneNumber) || getUserByPhone(phoneNumber);
  const isVerified = Boolean(
    user?.whatsappVerified ||
    user?.whatsapp_verified ||
    user?.personalization?.whatsapp_verified ||
    user?.phoneNumber ||
    user?.phone_number
  );

  if (!user || !isVerified) {
    return {
      allowed: false,
      reason: 'not_verified',
      message: 'Please connect your WhatsApp to Notevoro to use AI features. Visit notevoro.com to get started.'
    };
  }

  const plan = user.plan || user.subscriptionPlan || 'free';
  const trialEndAt = user.trial_ends_at || user.trialEndsAt;
  const subscriptionEndAt = user.subscription_ends_at || user.subscriptionEndsAt;

  if (plan !== 'free' && trialEndAt) {
    const trialEnd = new Date(trialEndAt);
    if (trialEnd < new Date()) {
      return {
        allowed: false,
        reason: 'trial_expired',
        message: 'Your Pro trial has ended. Upgrade to continue using premium features.'
      };
    }
  }

  if (subscriptionEndAt && new Date(subscriptionEndAt) < new Date()) {
    return {
      allowed: false,
      reason: 'subscription_expired',
      message: 'Your subscription has expired. Please renew to continue.'
    };
  }

  return {
    allowed: true,
    userId: user.id,
    subscriptionPlan: plan
  };
}

/**
 * Check if user has energy for action
 * @param {string} phoneNumber - Phone number
 * @param {string} actionType - Type of action
 * @returns {Object} - Energy check result
 */
export async function checkEnergyAccess(phoneNumber, actionType) {
  const accessResult = await checkAIAccess(phoneNumber);
  
  if (!accessResult.allowed) {
    return accessResult;
  }

  const user = await getUserByPhoneDb(phoneNumber) || getUserByPhone(phoneNumber);
  if (!user) {
    return {
      allowed: false,
      reason: 'user_not_found',
      message: 'User not found. Please sign up at notevoro.com'
    };
  }

  const plan = user.plan || user.subscriptionPlan || 'free';

  if (plan === 'premium') {
    return {
      allowed: true,
      userId: user.id,
      energyRemaining: Infinity,
      energyCost: 0
    };
  }

  if (!(await hasSufficientEnergy(user.id, actionType))) {
    const energyStats = await getEnergyStats(user.id);
    return {
      allowed: false,
      reason: 'insufficient_energy',
      message: `Not enough AI Energy. You have ${energyStats?.currentEnergy ?? 0}/${energyStats?.maxEnergy ?? 0} ⚡ remaining. Energy regenerates daily.`,
      energyRemaining: energyStats?.currentEnergy ?? 0,
      energyMax: energyStats?.maxEnergy ?? 0,
      hoursUntilRegeneration: energyStats?.hoursUntilRegeneration ?? 24
    };
  }

  const energyStats = await getEnergyStats(user.id);
  
  return {
    allowed: true,
    userId: user.id,
    energyRemaining: energyStats.currentEnergy,
    energyMax: energyStats.maxEnergy
  };
}

/**
 * Consume energy for AI action
 * @param {string} phoneNumber - Phone number
 * @param {string} actionType - Type of action
 * @returns {Object} - Consumption result
 */
export async function consumeEnergyForAction(phoneNumber, actionType) {
  const user = await getUserByPhoneDb(phoneNumber) || getUserByPhone(phoneNumber);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found'
    };
  }

  const plan = user.plan || user.subscriptionPlan || 'free';
  if (plan === 'premium') {
    return {
      success: true,
      energyConsumed: 0,
      remainingEnergy: Infinity
    };
  }

  return await consumeAIEnergy(user.id, actionType);
}

/**
 * Get user access summary
 * @param {string} phoneNumber - Phone number
 * @returns {Object} - Access summary
 */
export async function getAccessSummary(phoneNumber) {
  const user = await getUserByPhoneDb(phoneNumber) || getUserByPhone(phoneNumber);
  
  if (!user) {
    return {
      verified: false,
      message: 'User not found'
    };
  }

  const energyStats = await getEnergyStats(user.id);
  const trialStatus = isOnTrial(user.id);
  const trialDaysRemaining = getTrialDaysRemaining(user.id);

  return {
    verified: Boolean(user.whatsappVerified || user.personalization?.whatsapp_verified || user.phoneNumber || user.phone_number),
    subscriptionPlan: user.plan || user.subscriptionPlan,
    energy: {
      current: energyStats.currentEnergy,
      max: energyStats.maxEnergy,
      percentage: energyStats.percentage
    },
    trial: {
      active: trialStatus,
      daysRemaining: trialDaysRemaining
    },
    features: {
      studyPlanner: hasFeatureAccess(user.id, 'study_planner'),
      voiceNotes: hasFeatureAccess(user.id, 'voice_notes'),
      advancedAnalytics: hasFeatureAccess(user.id, 'productivity_analytics')
    }
  };
}

/**
 * Format access denial message for WhatsApp
 * @param {string} reason - Denial reason
 * @param {Object} details - Additional details
 * @returns {string} - Formatted message
 */
export function formatAccessDenialMessage(reason, details = {}) {
  const messages = {
    not_verified: '🔒 Please connect your WhatsApp to Notevoro to use AI features.\n\nVisit notevoro.com to sign up and link your account.',
    trial_expired: '⏰ Your Pro trial has ended.\n\nUpgrade to Pro to continue using premium AI features:\n• 250 AI Energy/day\n• Study planner\n• Voice notes\n• Advanced analytics\n\nnotevoro.com/upgrade',
    subscription_expired: '⏰ Your subscription has expired.\n\nPlease renew at notevoro.com to continue using premium features.',
    insufficient_energy: `⚡ Not enough AI Energy!\n\nYou have ${details.energyRemaining}/${details.energyMax} ⚡ remaining.\n\nEnergy regenerates in ${details.hoursUntilRegeneration} hours.\n\nUpgrade to Pro for 250 ⚡ daily or Premium for unlimited ⚡.`,
    user_not_found: '👤 User not found.\n\nPlease sign up at notevoro.com to get started.'
  };

  return messages[reason] || 'Access denied. Please contact support.';
}

/**
 * Check feature access
 * @param {string} phoneNumber - Phone number
 * @param {string} feature - Feature name
 * @returns {boolean} - True if has access
 */
export function checkFeatureAccess(phoneNumber, feature) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user || !user.whatsappVerified) {
    return false;
  }

  return hasFeatureAccess(user.id, feature);
}
