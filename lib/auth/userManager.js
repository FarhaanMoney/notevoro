/**
 * User Manager
 * Handles user creation, authentication, and account management
 */

import crypto from 'crypto';
import { SUBSCRIPTION_PLANS } from '../database/schema.js';

// In-memory user storage (replace with database in production)
const users = new Map();

/**
 * Generate unique referral code
 * @returns {string} - Referral code
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create new user account
 * @param {Object} userData - User data
 * @returns {Object} - Created user
 */
export function createUser(userData) {
  const { id: providedId, name, email, phone } = userData;

  // Check if email already exists
  if (email) {
    for (const user of users.values()) {
      if (user.email === email) {
        throw new Error('Email already registered');
      }
    }
  }

  // Check if phone already exists
  if (phone) {
    for (const user of users.values()) {
      if (user.phoneNumber === phone) {
        throw new Error('Phone number already registered');
      }
    }
  }

  const userId = providedId || crypto.randomUUID();
  const referralCode = generateReferralCode();

  const newUser = {
    id: userId,
    name,
    email,
    phoneNumber: phone,
    whatsappVerified: false,
    subscriptionPlan: 'free',
    trialUsed: false,
    trialStartedAt: null,
    trialEndsAt: null,
    subscriptionEndsAt: null,
    aiEnergy: SUBSCRIPTION_PLANS.FREE.dailyEnergyLimit,
    lastEnergyRegeneration: new Date().toISOString(),
    referralCode,
    referredBy: null,
    referralCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    memory: {
      goals: [],
      routines: [],
      studySubjects: [],
      weakSubjects: [],
      preferences: {
        productivityStyle: 'balanced',
        studyIntensity: 'moderate',
        reminderFrequency: 'daily',
        motivationalTone: 'supportive',
        responseStyle: 'balanced'
      },
      emotionalPatterns: {
        stressLevel: 'moderate',
        moodHistory: [],
        stressTriggers: [],
        copingMechanisms: []
      },
      energyLevels: {
        averageEnergyLevel: 'moderate',
        peakHours: [],
        lowEnergyTimes: []
      },
      learningPatterns: {
        bestStudyTimes: [],
        focusDuration: 25,
        breakPreferences: 'short'
      },
      sleepSchedule: {
        bedtime: '23:00',
        wakeTime: '07:00',
        averageSleepHours: 8
      },
      productivityHabits: {
        mostProductiveDay: null,
        preferredStudyTimes: [],
        focusDuration: 25
      }
    },
    
    streaks: {
      currentStreak: 0,
      longestStreak: 0,
      dailyActivities: {},
      consistencyScore: 0,
      lastActiveDate: null
    },
    
    focusHistory: {
      totalSessions: 0,
      totalFocusMinutes: 0,
      tasksCompleted: 0,
      averageDailyFocusMinutes: 0,
      sessions: [],
      lastActiveDate: null
    },
    
    studyData: {
      subjects: [],
      studyPlan: null,
      adaptiveSchedule: null,
      revisionSchedule: [],
      examPrep: []
    },
    
    analytics: {
      weeklyProductivity: {},
      monthlyProductivity: {},
      productivityScore: 0,
      burnoutRisk: null,
      insights: []
    },
    
    gamification: {
      totalXP: 0,
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: 100,
      activitiesCompleted: {},
      achievements: [],
      lastXPUpdate: null
    },
    
    reminders: [],
    conversationHistory: []
  };

  // If providedId already exists, return existing user instead of overwriting
  if (providedId && users.has(userId)) {
    console.warn('createUser: provided id already exists, returning existing user', { userId });
    return users.get(userId);
  }

  users.set(userId, newUser);

  console.log('✅ User created:', {
    userId,
    email,
    phone,
    referralCode,
    timestamp: new Date().toISOString()
  });

  return newUser;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} - User or null
 */
export function getUserById(userId) {
  return users.get(userId) || null;
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object|null} - User or null
 */
export function getUserByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

/**
 * Get user by phone number
 * @param {string} phoneNumber - Phone number
 * @returns {Object|null} - User or null
 */
export function getUserByPhone(phoneNumber) {
  for (const user of users.values()) {
    if (user.phoneNumber === phoneNumber) {
      return user;
    }
  }
  return null;
}

/**
 * Get user by referral code
 * @param {string} referralCode - Referral code
 * @returns {Object|null} - User or null
 */
export function getUserByReferralCode(referralCode) {
  for (const user of users.values()) {
    if (user.referralCode === referralCode) {
      return user;
    }
  }
  return null;
}

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Object|null} - Updated user or null
 */
export function updateUser(userId, updates) {
  const user = users.get(userId);
  
  if (!user) {
    return null;
  }

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  users.set(userId, updatedUser);

  console.log('✅ User updated:', {
    userId,
    updates: Object.keys(updates),
    timestamp: new Date().toISOString()
  });

  return updatedUser;
}

/**
 * Verify WhatsApp for user
 * @param {string} userId - User ID
 * @returns {Object|null} - Updated user or null
 */
export function verifyWhatsApp(userId) {
  return updateUser(userId, { whatsappVerified: true });
}

/**
 * Check if user exists and is verified
 * @param {string} phoneNumber - Phone number
 * @returns {boolean} - True if verified user
 */
export function isVerifiedUser(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  return user && user.whatsappVerified;
}

/**
 * Get all users (for admin purposes)
 * @returns {Array} - All users
 */
export function getAllUsers() {
  return Array.from(users.values());
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {boolean} - True if deleted
 */
export function deleteUser(userId) {
  const deleted = users.delete(userId);
  
  if (deleted) {
    console.log('🗑️ User deleted:', { userId, timestamp: new Date().toISOString() });
  }

  return deleted;
}
