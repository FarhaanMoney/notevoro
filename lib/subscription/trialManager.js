/**
 * Trial Manager
 * Handles 7-day Pro trial system with one-time-per-phone enforcement
 */

import { getUserById, getUserByPhone, updateUser } from '../auth/userManager.js';
import { upgradeSubscription, downgradeSubscription } from './subscriptionManager.js';
import { regenerateEnergy } from '../energy/aiEnergy.js';

/**
 * Start Pro trial for user
 * @param {string} userId - User ID
 * @returns {Object} - Trial info
 */
export function startProTrial(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if trial already used
  if (user.trialUsed) {
    throw new Error('Trial already used for this account');
  }

  // Check if phone has already used trial
  if (user.phoneNumber) {
    const phoneUser = getUserByPhone(user.phoneNumber);
    if (phoneUser && phoneUser.trialUsed && phoneUser.id !== userId) {
      throw new Error('Trial already used for this phone number');
    }
  }

  // Start trial
  const now = new Date();
  const trialEndsAt = new Date(now.setDate(now.getDate() + 7)).toISOString();

  const updatedUser = updateUser(userId, {
    subscriptionPlan: 'pro',
    trialUsed: true,
    trialStartedAt: new Date().toISOString(),
    trialEndsAt,
    subscriptionEndsAt: trialEndsAt,
    updatedAt: new Date().toISOString()
  });

  // Regenerate energy with Pro limits
  regenerateEnergy(userId);

  console.log('🎁 Pro trial started:', {
    userId,
    phoneNumber: user.phoneNumber,
    trialEndsAt,
    timestamp: new Date().toISOString()
  });

  return {
    userId,
    trialStartedAt: updatedUser.trialStartedAt,
    trialEndsAt,
    plan: 'pro',
    energyLimit: 250
  };
}

/**
 * Check if trial has expired
 * @param {string} userId - User ID
 * @returns {boolean} - True if expired
 */
export function isTrialExpired(userId) {
  const user = getUserById(userId);
  
  if (!user || !user.trialEndsAt) {
    return false;
  }

  return new Date(user.trialEndsAt) < new Date();
}

/**
 * End trial and downgrade to free
 * @param {string} userId - User ID
 * @returns {Object} - Updated user
 */
export function endTrial(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.trialEndsAt) {
    throw new Error('No active trial');
  }

  // Downgrade to free
  const updatedUser = downgradeSubscription(userId, 'free');

  console.log('⏰ Trial ended:', {
    userId,
    downgradedTo: 'free',
    timestamp: new Date().toISOString()
  });

  return updatedUser;
}

/**
 * Get trial status
 * @param {string} userId - User ID
 * @returns {Object} - Trial status
 */
export function getTrialStatus(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  if (!user.trialUsed) {
    return {
      hasTrial: false,
      trialUsed: false,
      message: 'Trial available'
    };
  }

  if (!user.trialEndsAt) {
    return {
      hasTrial: false,
      trialUsed: true,
      message: 'Trial completed'
    };
  }

  const now = new Date();
  const trialEnd = new Date(user.trialEndsAt);
  const isExpired = trialEnd < now;
  const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

  return {
    hasTrial: !isExpired,
    trialUsed: true,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    currentPlan: user.subscriptionPlan
  };
}

/**
 * Check if phone number has used trial
 * @param {string} phoneNumber - Phone number
 * @returns {boolean} - True if trial used
 */
export function hasPhoneUsedTrial(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return false;
  }

  return user.trialUsed === true;
}

/**
 * Extend trial (for special cases, admin use)
 * @param {string} userId - User ID
 * @param {number} days - Days to extend
 * @returns {Object} - Updated trial info
 */
export function extendTrial(userId, days) {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.trialEndsAt) {
    throw new Error('No active trial to extend');
  }

  const currentEnd = new Date(user.trialEndsAt);
  const newEnd = new Date(currentEnd.setDate(currentEnd.getDate() + days)).toISOString();

  const updatedUser = updateUser(userId, {
    trialEndsAt: newEnd,
    subscriptionEndsAt: newEnd,
    updatedAt: new Date().toISOString()
  });

  console.log('📅 Trial extended:', {
    userId,
    days,
    newEndsAt: newEnd,
    timestamp: new Date().toISOString()
  });

  return getTrialStatus(userId);
}

/**
 * Convert trial to paid subscription
 * @param {string} userId - User ID
 * @param {string} billingCycle - monthly or yearly
 * @returns {Object} - Updated subscription
 */
export function convertTrialToPaid(userId, billingCycle = 'monthly') {
  const user = getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Keep trial used flag true, but upgrade to paid
  const subscription = upgradeSubscription(userId, 'pro', billingCycle);

  console.log('💳 Trial converted to paid:', {
    userId,
    billingCycle,
    timestamp: new Date().toISOString()
  });

  return subscription;
}
