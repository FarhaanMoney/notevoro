/**
 * Database Schema
 * User and subscription data structure for Notevoro ecosystem
 */

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    dailyEnergyLimit: 20,
    features: [
      'basic_memory',
      'streak_system',
      '1_reminder',
      'basic_study_help',
      'dashboard_access',
      'note_sharing',
      'referrals'
    ]
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 299,
    yearlyPrice: 1999,
    dailyEnergyLimit: 250,
    features: [
      'long_term_memory',
      'advanced_reminders',
      'focus_mode',
      'study_planner',
      'voice_notes',
      'dashboard_sync',
      'productivity_analytics',
      'advanced_personalization',
      'ai_task_breakdown',
      'streak_recovery'
    ]
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 499,
    yearlyPrice: 4999,
    dailyEnergyLimit: Infinity,
    features: [
      'priority_ai',
      'deepest_memory',
      'adaptive_ai_coaching',
      'advanced_analytics',
      'burnout_detection',
      'elite_productivity_systems',
      'advanced_study_intelligence',
      'future_voice_ai',
      'early_access_features'
    ]
  }
};

// AI Energy costs for different actions
export const AI_ENERGY_COSTS = {
  SHORT_REPLY: 1,
  LONG_EXPLANATION: 2,
  STUDY_PLAN_GENERATION: 5,
  VOICE_TRANSCRIPTION: 6,
  PRODUCTIVITY_REPORT: 8,
  FULL_REVISION_NOTES: 10,
  FOCUS_SESSION: 2,
  REMINDER_SET: 1,
  DAILY_CHECKIN: 1,
  AI_SUMMARY: 3,
  visual_explanation: 15,
  visual_explanation_refund: 0
};

// User database schema
export const USER_SCHEMA = {
  id: 'string (UUID)',
  name: 'string',
  email: 'string (unique)',
  phoneNumber: 'string (unique, verified)',
  whatsappVerified: 'boolean',
  subscriptionPlan: 'string (free|pro|premium)',
  trialUsed: 'boolean',
  trialStartedAt: 'timestamp',
  trialEndsAt: 'timestamp',
  subscriptionEndsAt: 'timestamp',
  aiEnergy: 'number (current daily energy)',
  lastEnergyRegeneration: 'timestamp',
  referralCode: 'string (unique)',
  referredBy: 'string (referral code)',
  referralCount: 'number',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  
  // Memory and personalization
  memory: {
    goals: 'array of strings',
    routines: 'array of objects',
    studySubjects: 'array of strings',
    weakSubjects: 'array of strings',
    preferences: {
      productivityStyle: 'string',
      studyIntensity: 'string',
      reminderFrequency: 'string',
      motivationalTone: 'string',
      responseStyle: 'string'
    },
    emotionalPatterns: {
      stressLevel: 'string',
      moodHistory: 'array of objects',
      stressTriggers: 'array of strings',
      copingMechanisms: 'array of strings'
    },
    energyLevels: {
      averageEnergyLevel: 'string',
      peakHours: 'array of strings',
      lowEnergyTimes: 'array of strings'
    },
    learningPatterns: {
      bestStudyTimes: 'array of strings',
      focusDuration: 'number',
      breakPreferences: 'string'
    },
    sleepSchedule: {
      bedtime: 'string',
      wakeTime: 'string',
      averageSleepHours: 'number'
    },
    productivityHabits: {
      mostProductiveDay: 'string',
      preferredStudyTimes: 'array of strings',
      focusDuration: 'number'
    }
  },
  
  // Streak system
  streaks: {
    currentStreak: 'number',
    longestStreak: 'number',
    dailyActivities: 'object (date -> activity data)',
    consistencyScore: 'number',
    lastActiveDate: 'timestamp'
  },
  
  // Focus history
  focusHistory: {
    totalSessions: 'number',
    totalFocusMinutes: 'number',
    tasksCompleted: 'number',
    averageDailyFocusMinutes: 'number',
    sessions: 'array of session objects',
    lastActiveDate: 'timestamp'
  },
  
  // Study data
  studyData: {
    subjects: 'array of objects',
    studyPlan: 'object',
    adaptiveSchedule: 'object',
    revisionSchedule: 'array of objects',
    examPrep: 'array of objects'
  },
  
  // Analytics
  analytics: {
    weeklyProductivity: 'object',
    monthlyProductivity: 'object',
    productivityScore: 'number',
    burnoutRisk: 'object',
    insights: 'array of objects'
  },
  
  // Gamification
  gamification: {
    totalXP: 'number',
    level: 'number',
    currentLevelXP: 'number',
    nextLevelXP: 'number',
    activitiesCompleted: 'object',
    achievements: 'array of objects',
    lastXPUpdate: 'timestamp'
  },
  
  // Reminders
  reminders: 'array of reminder objects',
  
  // Conversation history
  conversationHistory: 'array of message objects'
};

// WhatsApp linking token schema
export const LINKING_TOKEN_SCHEMA = {
  token: 'string (unique)',
  userId: 'string',
  phoneNumber: 'string',
  createdAt: 'timestamp',
  expiresAt: 'timestamp',
  used: 'boolean',
  usedAt: 'timestamp'
};

// Referral schema
export const REFERRAL_SCHEMA = {
  code: 'string (unique)',
  referrerId: 'string',
  refereeId: 'string',
  createdAt: 'timestamp',
  status: 'string (pending|completed|rewarded)',
  rewardType: 'string (pro_trial_days)',
  rewardAmount: 'number'
};
