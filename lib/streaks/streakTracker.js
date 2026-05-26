/**
 * Streak Tracker
 * Tracks daily streaks for study, productivity, and focus
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';

/**
 * Record daily activity for streak tracking
 * @param {string} phoneNumber - User's phone number
 * @param {string} activityType - Type of activity (study, focus, general)
 * @returns {Object} - Updated streak info
 */
export function recordActivity(phoneNumber, activityType = 'general') {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    console.error('❌ User memory not found for streak tracking:', { phoneNumber });
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const streakData = memory.streakData || {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    activityHistory: [],
    dailyActivities: {}
  };

  // Check if already active today
  if (streakData.dailyActivities[today]) {
    console.log('📊 Activity already recorded today:', {
      phoneNumber,
      activityType,
      date: today
    });
    return streakData;
  }

  // Calculate streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];

  if (streakData.lastActivityDate === yesterdayDate) {
    // Continue streak
    streakData.currentStreak++;
  } else if (streakData.lastActivityDate !== today) {
    // Reset streak (missed a day)
    streakData.currentStreak = 1;
  }

  // Update longest streak
  if (streakData.currentStreak > streakData.longestStreak) {
    streakData.longestStreak = streakData.currentStreak;
  }

  // Record activity
  streakData.lastActivityDate = today;
  streakData.dailyActivities[today] = {
    date: today,
    activities: [activityType],
    timestamp: new Date().toISOString()
  };

  // Add to history
  streakData.activityHistory.push({
    date: today,
    activityType,
    timestamp: new Date().toISOString()
  });

  // Keep only last 365 days of history
  if (streakData.activityHistory.length > 365) {
    streakData.activityHistory = streakData.activityHistory.slice(-365);
  }

  // Update memory
  updateUserMemory(phoneNumber, { streakData });

  console.log('🔥 Activity recorded:', {
    phoneNumber,
    activityType,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    date: today,
    timestamp: new Date().toISOString()
  });

  return streakData;
}

/**
 * Get streak information for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Streak information
 */
export function getStreakInfo(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const streakData = memory.streakData || {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    activityHistory: [],
    dailyActivities: {}
  };

  const today = new Date().toISOString().split('T')[0];
  const isActiveToday = streakData.dailyActivities[today] !== undefined;

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastActivityDate: streakData.lastActivityDate,
    isActiveToday,
    totalActivities: streakData.activityHistory.length,
    recentActivities: streakData.activityHistory.slice(-7)
  };
}

/**
 * Check if streak is active today
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if active today
 */
export function isStreakActiveToday(phoneNumber) {
  const streakInfo = getStreakInfo(phoneNumber);
  
  if (!streakInfo) return false;
  
  return streakInfo.isActiveToday;
}

/**
 * Get streak milestone message
 * @param {number} streak - Current streak count
 * @returns {string} - Milestone message
 */
export function getStreakMilestone(streak) {
  const milestones = {
    1: "🔥 First day! You're off to a great start!",
    3: "🔥 3-day streak! Building momentum!",
    7: "🔥 7-day streak! A full week of consistency!",
    14: "🔥 14-day streak! Two weeks strong!",
    21: "🔥 21-day streak! You're building a habit!",
    30: "🔥 30-day streak! A full month of dedication!",
    50: "🔥 50-day streak! Incredible consistency!",
    100: "🔥 100-day streak! Legendary dedication!",
    365: "🔥 365-day streak! ONE FULL YEAR! You're unstoppable!"
  };

  return milestones[streak] || null;
}

/**
 * Calculate consistency score (0-100)
 * @param {string} phoneNumber - User's phone number
 * @returns {number} - Consistency score
 */
export function calculateConsistencyScore(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) return 0;

  const streakData = memory.streakData;
  if (!streakData || streakData.activityHistory.length === 0) return 0;

  // Calculate consistency over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentActivities = streakData.activityHistory.filter(
    activity => new Date(activity.date) >= thirtyDaysAgo
  );

  const consistencyScore = Math.min(100, (recentActivities.length / 30) * 100);

  return Math.round(consistencyScore);
}

/**
 * Get streak statistics for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Detailed statistics
 */
export function getStreakStatistics(phoneNumber) {
  const streakInfo = getStreakInfo(phoneNumber);
  const consistencyScore = calculateConsistencyScore(phoneNumber);

  if (!streakInfo) {
    return {
      hasStreakData: false
    };
  }

  // Calculate weekly activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const weeklyActivities = streakInfo.recentActivities.filter(
    activity => new Date(activity.date) >= sevenDaysAgo
  ).length;

  return {
    hasStreakData: true,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    consistencyScore,
    weeklyActivities,
    totalActivities: streakInfo.totalActivities,
    lastActivityDate: streakInfo.lastActivityDate,
    isActiveToday: streakInfo.isActiveToday,
    milestone: getStreakMilestone(streakInfo.currentStreak)
  };
}

/**
 * Reset streak (for testing or manual reset)
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if reset
 */
export function resetStreak(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) return false;

  const streakData = {
    currentStreak: 0,
    longestStreak: memory.streakData?.longestStreak || 0,
    lastActivityDate: null,
    activityHistory: [],
    dailyActivities: {}
  };

  updateUserMemory(phoneNumber, { streakData });

  console.log('🔄 Streak reset:', {
    phoneNumber,
    timestamp: new Date().toISOString()
  });

  return true;
}
