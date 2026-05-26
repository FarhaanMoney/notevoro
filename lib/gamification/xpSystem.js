/**
 * XP System
 * Experience points and levels for gamification
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';

// XP values for different activities
const XP_VALUES = {
  focusSession: 50,
  pomodoroComplete: 30,
  streakDay: 20,
  reminderSet: 10,
  studyPlanCreated: 100,
  goalCompleted: 200,
  dailyLogin: 5
};

// Level thresholds
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 300 },
  { level: 4, xp: 600 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 1500 },
  { level: 7, xp: 2100 },
  { level: 8, xp: 2800 },
  { level: 9, xp: 3600 },
  { level: 10, xp: 4500 },
  { level: 11, xp: 5500 },
  { level: 12, xp: 6600 },
  { level: 13, xp: 7800 },
  { level: 14, xp: 9100 },
  { level: 15, xp: 10500 },
  { level: 16, xp: 12000 },
  { level: 17, xp: 13600 },
  { level: 18, xp: 15300 },
  { level: 19, xp: 17100 },
  { level: 20, xp: 19000 }
];

/**
 * Award XP for activity
 * @param {string} phoneNumber - User's phone number
 * @param {string} activityType - Type of activity
 * @returns {Object} - Updated XP info
 */
export function awardXP(phoneNumber, activityType) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const xpValue = XP_VALUES[activityType] || 10;
  
  // Initialize gamification data if not exists
  if (!memory.gamification) {
    memory.gamification = {
      totalXP: 0,
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: LEVEL_THRESHOLDS[1].xp,
      activitiesCompleted: {},
      lastXPUpdate: null
    };
  }

  const oldLevel = memory.gamification.level;
  memory.gamification.totalXP += xpValue;
  memory.gamification.currentLevelXP += xpValue;
  memory.gamification.lastXPUpdate = new Date().toISOString();

  // Track activity count
  memory.gamification.activitiesCompleted[activityType] = 
    (memory.gamification.activitiesCompleted[activityType] || 0) + 1;

  // Check for level up
  const newLevel = calculateLevel(memory.gamification.totalXP);
  memory.gamification.level = newLevel.level;
  memory.gamification.nextLevelXP = newLevel.nextLevelXP;

  // Reset current level XP if leveled up
  if (newLevel.level > oldLevel) {
    memory.gamification.currentLevelXP = memory.gamification.totalXP - newLevel.currentLevelXP;
  }

  updateUserMemory(phoneNumber, { gamification: memory.gamification });

  console.log('🎮 XP awarded:', {
    phoneNumber,
    activityType,
    xpValue,
    totalXP: memory.gamification.totalXP,
    level: memory.gamification.level,
    leveledUp: newLevel.level > oldLevel,
    timestamp: new Date().toISOString()
  });

  return {
    xpAwarded: xpValue,
    totalXP: memory.gamification.totalXP,
    level: memory.gamification.level,
    leveledUp: newLevel.level > oldLevel,
    xpToNextLevel: memory.gamification.nextLevelXP - memory.gamification.totalXP
  };
}

/**
 * Calculate level from total XP
 * @param {number} totalXP - Total XP
 * @returns {Object} - Level info
 */
function calculateLevel(totalXP) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xp) {
      return {
        level: LEVEL_THRESHOLDS[i].level,
        currentLevelXP: LEVEL_THRESHOLDS[i].xp,
        nextLevelXP: LEVEL_THRESHOLDS[i + 1]?.xp || LEVEL_THRESHOLDS[i].xp + 1000
      };
    }
  }

  return {
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: LEVEL_THRESHOLDS[1].xp
  };
}

/**
 * Get user XP info
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - XP info
 */
export function getXPInfo(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory || !memory.gamification) {
    return null;
  }

  const gamification = memory.gamification;
  const xpToNextLevel = gamification.nextLevelXP - gamification.totalXP;
  const progressPercent = Math.min(100, (gamification.currentLevelXP / (gamification.nextLevelXP - gamification.currentLevelXP)) * 100);

  return {
    totalXP: gamification.totalXP,
    level: gamification.level,
    currentLevelXP: gamification.currentLevelXP,
    nextLevelXP: gamification.nextLevelXP,
    xpToNextLevel,
    progressPercent: Math.round(progressPercent),
    activitiesCompleted: gamification.activitiesCompleted,
    lastXPUpdate: gamification.lastXPUpdate
  };
}

/**
 * Format XP info for WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted XP info
 */
export function formatXPInfo(phoneNumber) {
  const xpInfo = getXPInfo(phoneNumber);
  
  if (!xpInfo) {
    return 'No XP data yet. Start completing activities to earn XP!';
  }

  const progressBar = '█'.repeat(Math.floor(xpInfo.progressPercent / 10)) + '░'.repeat(10 - Math.floor(xpInfo.progressPercent / 10));

  let message = `🎮 Level ${xpInfo.level}\n`;
  message += `⭐ Total XP: ${xpInfo.totalXP}\n`;
  message += `📊 Progress to Level ${xpInfo.level + 1}:\n`;
  message += `[${progressBar}] ${xpInfo.progressPercent}%\n`;
  message += `${xpInfo.xpToNextLevel} XP to next level\n\n`;
  
  message += `📈 Activities Completed:\n`;
  Object.entries(xpInfo.activitiesCompleted).forEach(([activity, count]) => {
    message += `• ${activity}: ${count}\n`;
  });

  return message;
}

/**
 * Get level title
 * @param {number} level - Level number
 * @returns {string} - Level title
 */
export function getLevelTitle(level) {
  const titles = {
    1: 'Novice',
    2: 'Beginner',
    3: 'Apprentice',
    4: 'Learner',
    5: 'Student',
    6: 'Scholar',
    7: 'Expert',
    8: 'Master',
    9: 'Grandmaster',
    10: 'Legend',
    11: 'Champion',
    12: 'Hero',
    13: 'Titan',
    14: 'Immortal',
    15: 'Deity',
    16: 'Celestial',
    17: 'Cosmic',
    18: 'Universal',
    19: 'Transcendent',
    20: 'Eternal'
  };

  return titles[level] || 'Unknown';
}

/**
 * Get XP leaderboard (top users)
 * @param {number} limit - Number of users to return
 * @returns {Array} - Leaderboard
 */
export function getLeaderboard(limit = 10) {
  // This would require a database in production
  // For now, return empty since we're using in-memory storage
  return [];
}

/**
 * Calculate XP multiplier based on streak
 * @param {number} streak - Current streak
 * @returns {number} - XP multiplier
 */
export function calculateStreakMultiplier(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 21) return 1.75;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

/**
 * Award XP with streak multiplier
 * @param {string} phoneNumber - User's phone number
 * @param {string} activityType - Type of activity
 * @param {number} streak - Current streak
 * @returns {Object} - Updated XP info
 */
export function awardXPWithMultiplier(phoneNumber, activityType, streak) {
  const multiplier = calculateStreakMultiplier(streak);
  const baseXP = XP_VALUES[activityType] || 10;
  const bonusXP = Math.round(baseXP * (multiplier - 1));
  const totalXP = baseXP + bonusXP;

  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  if (!memory.gamification) {
    memory.gamification = {
      totalXP: 0,
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: LEVEL_THRESHOLDS[1].xp,
      activitiesCompleted: {},
      lastXPUpdate: null
    };
  }

  const oldLevel = memory.gamification.level;
  memory.gamification.totalXP += totalXP;
  memory.gamification.currentLevelXP += totalXP;
  memory.gamification.lastXPUpdate = new Date().toISOString();

  memory.gamification.activitiesCompleted[activityType] = 
    (memory.gamification.activitiesCompleted[activityType] || 0) + 1;

  const newLevel = calculateLevel(memory.gamification.totalXP);
  memory.gamification.level = newLevel.level;
  memory.gamification.nextLevelXP = newLevel.nextLevelXP;

  if (newLevel.level > oldLevel) {
    memory.gamification.currentLevelXP = memory.gamification.totalXP - newLevel.currentLevelXP;
  }

  updateUserMemory(phoneNumber, { gamification: memory.gamification });

  console.log('🎮 XP awarded with multiplier:', {
    phoneNumber,
    activityType,
    baseXP,
    multiplier,
    bonusXP,
    totalXP,
    streak,
    timestamp: new Date().toISOString()
  });

  return {
    xpAwarded: totalXP,
    baseXP,
    bonusXP,
    multiplier,
    totalXP: memory.gamification.totalXP,
    level: memory.gamification.level,
    leveledUp: newLevel.level > oldLevel
  };
}
