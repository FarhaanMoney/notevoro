/**
 * Achievements System
 * Tracks and awards achievements and badges
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';
import { getXPInfo } from './xpSystem.js';
import { getStreakStatistics } from '../streaks/streakTracker.js';

// Achievement definitions
const ACHIEVEMENTS = {
  first_session: {
    id: 'first_session',
    name: 'First Steps',
    description: 'Complete your first focus session',
    icon: '🎯',
    xpReward: 50,
    condition: (memory) => memory.productivityStats?.totalSessions >= 1
  },
  ten_sessions: {
    id: 'ten_sessions',
    name: 'Getting Started',
    description: 'Complete 10 focus sessions',
    icon: '🚀',
    xpReward: 100,
    condition: (memory) => memory.productivityStats?.totalSessions >= 10
  },
  fifty_sessions: {
    id: 'fifty_sessions',
    name: 'Dedicated',
    description: 'Complete 50 focus sessions',
    icon: '💪',
    xpReward: 250,
    condition: (memory) => memory.productivityStats?.totalSessions >= 50
  },
  hundred_sessions: {
    id: 'hundred_sessions',
    name: 'Century',
    description: 'Complete 100 focus sessions',
    icon: '🏆',
    xpReward: 500,
    condition: (memory) => memory.productivityStats?.totalSessions >= 100
  },
  three_day_streak: {
    id: 'three_day_streak',
    name: 'Building Momentum',
    description: 'Achieve a 3-day streak',
    icon: '🔥',
    xpReward: 75,
    condition: (memory) => memory.streakData?.currentStreak >= 3
  },
  seven_day_streak: {
    id: 'seven_day_streak',
    name: 'Week Warrior',
    description: 'Achieve a 7-day streak',
    icon: '⚡',
    xpReward: 150,
    condition: (memory) => memory.streakData?.currentStreak >= 7
  },
  thirty_day_streak: {
    id: 'thirty_day_streak',
    name: 'Monthly Master',
    description: 'Achieve a 30-day streak',
    icon: '👑',
    xpReward: 500,
    condition: (memory) => memory.streakData?.currentStreak >= 30
  },
  first_reminder: {
    id: 'first_reminder',
    name: 'Organized',
    description: 'Set your first reminder',
    icon: '📅',
    xpReward: 25,
    condition: (memory) => memory.reminders?.length >= 1
  },
  five_reminders: {
    id: 'five_reminders',
    name: 'Planner',
    description: 'Set 5 reminders',
    icon: '📋',
    xpReward: 75,
    condition: (memory) => memory.reminders?.length >= 5
  },
  first_study_plan: {
    id: 'first_study_plan',
    name: 'Strategic',
    description: 'Create your first study plan',
    icon: '📚',
    xpReward: 100,
    condition: (memory) => memory.studyPlan !== null
  },
  five_subjects: {
    id: 'five_subjects',
    name: 'Scholar',
    description: 'Add 5 study subjects',
    icon: '🎓',
    xpReward: 75,
    condition: (memory) => memory.studySubjects?.length >= 5
  },
  level_five: {
    id: 'level_five',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    xpReward: 0,
    condition: (memory) => memory.gamification?.level >= 5
  },
  level_ten: {
    id: 'level_ten',
    name: 'Expert',
    description: 'Reach level 10',
    icon: '🌟',
    xpReward: 0,
    condition: (memory) => memory.gamification?.level >= 10
  },
  level_twenty: {
    id: 'level_twenty',
    name: 'Legend',
    description: 'Reach level 20',
    icon: '💎',
    xpReward: 0,
    condition: (memory) => memory.gamification?.level >= 20
  },
  five_hours_focus: {
    id: 'five_hours_focus',
    name: 'Deep Focus',
    description: 'Accumulate 5 hours of focus time',
    icon: '⏱️',
    xpReward: 150,
    condition: (memory) => memory.productivityStats?.totalFocusMinutes >= 300
  },
  twenty_hours_focus: {
    id: 'twenty_hours_focus',
    name: 'Time Master',
    description: 'Accumulate 20 hours of focus time',
    icon: '🕰️',
    xpReward: 500,
    condition: (memory) => memory.productivityStats?.totalFocusMinutes >= 1200
  }
};

/**
 * Check and award achievements
 * @param {string} phoneNumber - User's phone number
 * @returns {Array} - Newly unlocked achievements
 */
export function checkAchievements(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return [];
  }

  // Initialize achievements if not exists
  if (!memory.achievements) {
    memory.achievements = {
      unlocked: [],
      totalXP: 0
    };
  }

  const unlockedIds = new Set(memory.achievements.unlocked.map(a => a.id));
  const newlyUnlocked = [];

  // Check each achievement
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (unlockedIds.has(achievement.id)) {
      continue;
    }

    try {
      if (achievement.condition(memory)) {
        // Achievement unlocked!
        const unlockedAchievement = {
          ...achievement,
          unlockedAt: new Date().toISOString()
        };

        memory.achievements.unlocked.push(unlockedAchievement);
        memory.achievements.totalXP += achievement.xpReward;
        unlockedIds.add(achievement.id);
        newlyUnlocked.push(unlockedAchievement);

        console.log('🏆 Achievement unlocked:', {
          phoneNumber,
          achievementId: achievement.id,
          achievementName: achievement.name,
          xpReward: achievement.xpReward,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error checking achievement:', {
        achievementId: achievement.id,
        error: error.message
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    updateUserMemory(phoneNumber, { achievements: memory.achievements });
  }

  return newlyUnlocked;
}

/**
 * Get user achievements
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - User achievements
 */
export function getUserAchievements(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory || !memory.achievements) {
    return {
      unlocked: [],
      totalXP: 0,
      totalAchievements: 0,
      progress: {}
    };
  }

  const unlocked = memory.achievements.unlocked || [];
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const progress = {};

  // Calculate progress for each achievement
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    const isUnlocked = unlocked.some(a => a.id === achievement.id);
    progress[achievement.id] = {
      unlocked: isUnlocked,
      name: achievement.name,
      icon: achievement.icon
    };
  }

  return {
    unlocked,
    totalXP: memory.achievements.totalXP || 0,
    totalAchievements,
    unlockedCount: unlocked.length,
    progress
  };
}

/**
 * Format achievements for WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted achievements
 */
export function formatAchievements(phoneNumber) {
  const achievements = getUserAchievements(phoneNumber);
  
  if (achievements.unlockedCount === 0) {
    return '🏆 No achievements yet. Complete activities to unlock achievements!';
  }

  let message = `🏆 Achievements (${achievements.unlockedCount}/${achievements.totalAchievements})\n\n`;
  
  // Show recent achievements first
  const recentAchievements = achievements.unlocked.slice(-5).reverse();
  
  message += `Recently Unlocked:\n`;
  recentAchievements.forEach(achievement => {
    message += `${achievement.icon} ${achievement.name}\n`;
    message += `   ${achievement.description}\n`;
  });

  if (achievements.unlockedCount > 5) {
    message += `\n... and ${achievements.unlockedCount - 5} more\n`;
  }

  message += `\n💰 Total Achievement XP: ${achievements.totalXP}`;

  return message;
}

/**
 * Get achievement progress
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Achievement progress
 */
export function getAchievementProgress(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  const achievements = getUserAchievements(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const progress = {};

  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    const isUnlocked = achievements.unlocked.some(a => a.id === achievement.id);
    
    let current = 0;
    let target = 1;

    // Calculate progress based on achievement type
    if (achievement.id.includes('session')) {
      current = memory.productivityStats?.totalSessions || 0;
      target = achievement.id.includes('ten') ? 10 : achievement.id.includes('fifty') ? 50 : 100;
    } else if (achievement.id.includes('streak')) {
      current = memory.streakData?.currentStreak || 0;
      target = achievement.id.includes('three') ? 3 : achievement.id.includes('seven') ? 7 : 30;
    } else if (achievement.id.includes('reminder')) {
      current = memory.reminders?.length || 0;
      target = 5;
    } else if (achievement.id.includes('subject')) {
      current = memory.studySubjects?.length || 0;
      target = 5;
    } else if (achievement.id.includes('level')) {
      current = memory.gamification?.level || 0;
      target = achievement.id.includes('five') ? 5 : achievement.id.includes('ten') ? 10 : 20;
    } else if (achievement.id.includes('focus')) {
      current = Math.floor((memory.productivityStats?.totalFocusMinutes || 0) / 60);
      target = achievement.id.includes('five') ? 5 : 20;
    }

    progress[achievement.id] = {
      name: achievement.name,
      icon: achievement.icon,
      unlocked: isUnlocked,
      current,
      target,
      percent: Math.min(100, Math.round((current / target) * 100))
    };
  }

  return progress;
}

/**
 * Format achievement progress for WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted progress
 */
export function formatAchievementProgress(phoneNumber) {
  const progress = getAchievementProgress(phoneNumber);
  
  if (!progress) {
    return 'No progress data available.';
  }

  let message = '📊 Achievement Progress\n\n';

  // Show progress for locked achievements
  const lockedAchievements = Object.values(progress).filter(p => !p.unlocked);
  
  if (lockedAchievements.length === 0) {
    message = '🎉 All achievements unlocked! You\'re a legend!';
  } else {
    lockedAchievements.slice(0, 5).forEach(p => {
      const progressBar = '█'.repeat(Math.floor(p.percent / 10)) + '░'.repeat(10 - Math.floor(p.percent / 10));
      message += `${p.icon} ${p.name}\n`;
      message += `[${progressBar}] ${p.percent}% (${p.current}/${p.target})\n\n`;
    });
  }

  return message;
}

/**
 * Get next achievement to unlock
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Next achievement
 */
export function getNextAchievement(phoneNumber) {
  const progress = getAchievementProgress(phoneNumber);
  
  if (!progress) {
    return null;
  }

  // Find closest achievement to completion
  const lockedAchievements = Object.values(progress)
    .filter(p => !p.unlocked)
    .sort((a, b) => b.percent - a.percent);

  return lockedAchievements[0] || null;
}
