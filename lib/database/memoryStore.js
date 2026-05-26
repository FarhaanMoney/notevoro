/**
 * Persistent Memory Store
 * Database-backed memory system integrated with user data
 */

import { getUserById, updateUser } from '../auth/userManager.js';

/**
 * Get user memory from database
 * @param {string} userId - User ID
 * @returns {Object|null} - User memory or null
 */
export function getUserMemoryDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  return user.memory || {};
}

/**
 * Update user memory in database
 * @param {string} userId - User ID
 * @param {Object} memoryUpdates - Memory updates
 * @returns {Object|null} - Updated user or null
 */
export function updateUserMemoryDB(userId, memoryUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentMemory = user.memory || {};
  const updatedMemory = {
    ...currentMemory,
    ...memoryUpdates
  };

  return updateUser(userId, { memory: updatedMemory });
}

/**
 * Get conversation history from database
 * @param {string} userId - User ID
 * @returns {Array} - Conversation history
 */
export function getConversationHistoryDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return [];
  }

  return user.conversationHistory || [];
}

/**
 * Add message to conversation history
 * @param {string} userId - User ID
 * @param {string} role - Role (user or assistant)
 * @param {string} content - Message content
 * @returns {Object|null} - Updated user or null
 */
export function addToConversationHistoryDB(userId, role, content) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const history = user.conversationHistory || [];
  const message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };

  // Keep last 100 messages
  const updatedHistory = [...history, message].slice(-100);

  return updateUser(userId, { conversationHistory: updatedHistory });
}

/**
 * Get streak data from database
 * @param {string} userId - User ID
 * @returns {Object} - Streak data
 */
export function getStreakDataDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      dailyActivities: {},
      consistencyScore: 0,
      lastActiveDate: null
    };
  }

  return user.streaks || {
    currentStreak: 0,
    longestStreak: 0,
    dailyActivities: {},
    consistencyScore: 0,
    lastActiveDate: null
  };
}

/**
 * Update streak data in database
 * @param {string} userId - User ID
 * @param {Object} streakUpdates - Streak updates
 * @returns {Object|null} - Updated user or null
 */
export function updateStreakDataDB(userId, streakUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentStreaks = user.streaks || {
    currentStreak: 0,
    longestStreak: 0,
    dailyActivities: {},
    consistencyScore: 0,
    lastActiveDate: null
  };

  const updatedStreaks = {
    ...currentStreaks,
    ...streakUpdates
  };

  return updateUser(userId, { streaks: updatedStreaks });
}

/**
 * Get focus history from database
 * @param {string} userId - User ID
 * @returns {Object} - Focus history
 */
export function getFocusHistoryDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return {
      totalSessions: 0,
      totalFocusMinutes: 0,
      tasksCompleted: 0,
      averageDailyFocusMinutes: 0,
      sessions: [],
      lastActiveDate: null
    };
  }

  return user.focusHistory || {
    totalSessions: 0,
    totalFocusMinutes: 0,
    tasksCompleted: 0,
    averageDailyFocusMinutes: 0,
    sessions: [],
    lastActiveDate: null
  };
}

/**
 * Update focus history in database
 * @param {string} userId - User ID
 * @param {Object} focusUpdates - Focus history updates
 * @returns {Object|null} - Updated user or null
 */
export function updateFocusHistoryDB(userId, focusUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentFocus = user.focusHistory || {
    totalSessions: 0,
    totalFocusMinutes: 0,
    tasksCompleted: 0,
    averageDailyFocusMinutes: 0,
    sessions: [],
    lastActiveDate: null
  };

  const updatedFocus = {
    ...currentFocus,
    ...focusUpdates
  };

  return updateUser(userId, { focusHistory: updatedFocus });
}

/**
 * Get study data from database
 * @param {string} userId - User ID
 * @returns {Object} - Study data
 */
export function getStudyDataDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return {
      subjects: [],
      studyPlan: null,
      adaptiveSchedule: null,
      revisionSchedule: [],
      examPrep: []
    };
  }

  return user.studyData || {
    subjects: [],
    studyPlan: null,
    adaptiveSchedule: null,
    revisionSchedule: [],
    examPrep: []
  };
}

/**
 * Update study data in database
 * @param {string} userId - User ID
 * @param {Object} studyUpdates - Study data updates
 * @returns {Object|null} - Updated user or null
 */
export function updateStudyDataDB(userId, studyUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentStudy = user.studyData || {
    subjects: [],
    studyPlan: null,
    adaptiveSchedule: null,
    revisionSchedule: [],
    examPrep: []
  };

  const updatedStudy = {
    ...currentStudy,
    ...studyUpdates
  };

  return updateUser(userId, { studyData: updatedStudy });
}

/**
 * Get gamification data from database
 * @param {string} userId - User ID
 * @returns {Object} - Gamification data
 */
export function getGamificationDataDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return {
      totalXP: 0,
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: 100,
      activitiesCompleted: {},
      achievements: [],
      lastXPUpdate: null
    };
  }

  return user.gamification || {
    totalXP: 0,
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: 100,
    activitiesCompleted: {},
    achievements: [],
    lastXPUpdate: null
  };
}

/**
 * Update gamification data in database
 * @param {string} userId - User ID
 * @param {Object} gamificationUpdates - Gamification updates
 * @returns {Object|null} - Updated user or null
 */
export function updateGamificationDataDB(userId, gamificationUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentGamification = user.gamification || {
    totalXP: 0,
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: 100,
    activitiesCompleted: {},
    achievements: [],
    lastXPUpdate: null
  };

  const updatedGamification = {
    ...currentGamification,
    ...gamificationUpdates
  };

  return updateUser(userId, { gamification: updatedGamification });
}

/**
 * Get reminders from database
 * @param {string} userId - User ID
 * @returns {Array} - Reminders
 */
export function getRemindersDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return [];
  }

  return user.reminders || [];
}

/**
 * Update reminders in database
 * @param {string} userId - User ID
 * @param {Array} reminders - Reminders array
 * @returns {Object|null} - Updated user or null
 */
export function updateRemindersDB(userId, reminders) {
  return updateUser(userId, { reminders });
}

/**
 * Get analytics data from database
 * @param {string} userId - User ID
 * @returns {Object} - Analytics data
 */
export function getAnalyticsDataDB(userId) {
  const user = getUserById(userId);
  
  if (!user) {
    return {
      weeklyProductivity: {},
      monthlyProductivity: {},
      productivityScore: 0,
      burnoutRisk: null,
      insights: []
    };
  }

  return user.analytics || {
    weeklyProductivity: {},
    monthlyProductivity: {},
    productivityScore: 0,
    burnoutRisk: null,
    insights: []
  };
}

/**
 * Update analytics data in database
 * @param {string} userId - User ID
 * @param {Object} analyticsUpdates - Analytics updates
 * @returns {Object|null} - Updated user or null
 */
export function updateAnalyticsDataDB(userId, analyticsUpdates) {
  const user = getUserById(userId);
  
  if (!user) {
    return null;
  }

  const currentAnalytics = user.analytics || {
    weeklyProductivity: {},
    monthlyProductivity: {},
    productivityScore: 0,
    burnoutRisk: null,
    insights: []
  };

  const updatedAnalytics = {
    ...currentAnalytics,
    ...analyticsUpdates
  };

  return updateUser(userId, { analytics: updatedAnalytics });
}
