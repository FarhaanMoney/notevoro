/**
 * Adaptive Schedule
 * Dynamically adjusts study schedules based on performance and preferences
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';
import { getStudyPlan } from './studyPlanner.js';

/**
 * Analyze user performance and adapt schedule
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Adapted schedule recommendations
 */
export function analyzeAndAdaptSchedule(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const productivityStats = memory.productivityStats || {};
  const energyLevels = memory.energyLevels || {};
  const studyPlan = memory.studyPlan || null;

  // Analyze patterns
  const analysis = {
    mostProductiveTime: identifyMostProductiveTime(productivityStats, energyLevels),
    optimalSessionLength: calculateOptimalSessionLength(productivityStats),
    recommendedBreakPattern: determineBreakPattern(productivityStats),
    subjectDifficultyAdjustment: adjustSubjectDifficulty(memory),
    scheduleRecommendations: generateScheduleRecommendations(memory, studyPlan)
  };

  console.log('📊 Schedule analysis completed:', {
    phoneNumber,
    mostProductiveTime: analysis.mostProductiveTime,
    optimalSessionLength: analysis.optimalSessionLength,
    timestamp: new Date().toISOString()
  });

  return analysis;
}

/**
 * Identify most productive time
 * @param {Object} productivityStats - Productivity statistics
 * @param {Object} energyLevels - Energy level data
 * @returns {string} - Most productive time
 */
function identifyMostProductiveTime(productivityStats, energyLevels) {
  // If user has explicitly set peak hours, use those
  if (energyLevels.peakHours && energyLevels.peakHours.length > 0) {
    return energyLevels.peakHours[0];
  }

  // Default to morning if no data
  return 'morning';
}

/**
 * Calculate optimal session length
 * @param {Object} productivityStats - Productivity statistics
 * @returns {number} - Optimal session length in minutes
 */
function calculateOptimalSessionLength(productivityStats) {
  const averageFocusMinutes = productivityStats.averageDailyFocusMinutes || 0;
  const totalSessions = productivityStats.totalSessions || 0;

  if (totalSessions === 0) {
    return 25; // Default Pomodoro
  }

  // Calculate average session length
  const avgSessionLength = averageFocusMinutes / Math.max(1, totalSessions);

  // Round to nearest 5 minutes, min 15, max 60
  const optimalLength = Math.max(15, Math.min(60, Math.round(avgSessionLength / 5) * 5));

  return optimalLength;
}

/**
 * Determine break pattern
 * @param {Object} productivityStats - Productivity statistics
 * @returns {string} - Break pattern recommendation
 */
function determineBreakPattern(productivityStats) {
  const totalFocusMinutes = productivityStats.totalFocusMinutes || 0;
  const totalSessions = productivityStats.totalSessions || 0;

  if (totalSessions === 0) {
    return 'short'; // Default 5-minute breaks
  }

  const avgSessionLength = totalFocusMinutes / totalSessions;

  if (avgSessionLength > 45) {
    return 'long'; // 15-minute breaks for long sessions
  } else if (avgSessionLength > 30) {
    return 'medium'; // 10-minute breaks
  } else {
    return 'short'; // 5-minute breaks
  }
}

/**
 * Adjust subject difficulty based on performance
 * @param {Object} memory - User memory
 * @returns {Object} - Difficulty adjustments
 */
function adjustSubjectDifficulty(memory) {
  const weakSubjects = memory.weakSubjects || [];
  const studySubjects = memory.studySubjects || [];

  const adjustments = {};

  studySubjects.forEach(subject => {
    if (weakSubjects.includes(subject)) {
      adjustments[subject] = {
        priority: 'high',
        recommendedTimeMultiplier: 1.5,
        suggestedFrequency: 'daily'
      };
    } else {
      adjustments[subject] = {
        priority: 'medium',
        recommendedTimeMultiplier: 1.0,
        suggestedFrequency: 'every_other_day'
      };
    }
  });

  return adjustments;
}

/**
 * Generate schedule recommendations
 * @param {Object} memory - User memory
 * @param {Object} studyPlan - Current study plan
 * @returns {Array} - Schedule recommendations
 */
function generateScheduleRecommendations(memory, studyPlan) {
  const recommendations = [];

  // Check if study plan exists
  if (!studyPlan) {
    recommendations.push({
      type: 'create_plan',
      priority: 'high',
      message: 'Generate a study plan using /studyplan'
    });
  }

  // Check for weak subjects
  if (memory.weakSubjects && memory.weakSubjects.length > 0) {
    recommendations.push({
      type: 'focus_weak_subjects',
      priority: 'high',
      message: `Focus more on: ${memory.weakSubjects.join(', ')}`
    });
  }

  // Check for energy patterns
  if (memory.energyLevels && memory.energyLevels.lowEnergyTimes) {
    recommendations.push({
      type: 'avoid_low_energy',
      priority: 'medium',
      message: `Avoid scheduling difficult topics during: ${memory.energyLevels.lowEnergyTimes.join(', ')}`
    });
  }

  // Check for goals
  if (memory.goals && memory.goals.length > 0) {
    recommendations.push({
      type: 'align_with_goals',
      priority: 'medium',
      message: `Align study sessions with goals: ${memory.goals.slice(0, 2).join(', ')}`
    });
  }

  return recommendations;
}

/**
 * Apply adaptive changes to schedule
 * @param {string} phoneNumber - User's phone number
 * @param {Object} adaptations - Adaptation recommendations
 * @returns {Object} - Updated schedule
 */
export function applyAdaptations(phoneNumber, adaptations) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const updates = {};

  // Update focus duration if recommended
  if (adaptations.optimalSessionLength) {
    updates.focusDuration = adaptations.optimalSessionLength;
  }

  // Update break preferences
  if (adaptations.recommendedBreakPattern) {
    updates.preferences = {
      ...memory.preferences,
      breakPreferences: adaptations.recommendedBreakPattern
    };
  }

  // Update energy levels if new data available
  if (adaptations.mostProductiveTime) {
    updates.energyLevels = {
      ...memory.energyLevels,
      peakHours: [adaptations.mostProductiveTime]
    };
  }

  const updatedMemory = updateUserMemory(phoneNumber, updates);

  console.log('✅ Adaptations applied:', {
    phoneNumber,
    updates: Object.keys(updates),
    timestamp: new Date().toISOString()
  });

  return updatedMemory;
}

/**
 * Get adaptive schedule insights
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Adaptive insights
 */
export function getAdaptiveInsights(phoneNumber) {
  const analysis = analyzeAndAdaptSchedule(phoneNumber);
  
  if (!analysis) {
    return null;
  }

  return {
    mostProductiveTime: analysis.mostProductiveTime,
    optimalSessionLength: analysis.optimalSessionLength,
    breakPattern: analysis.recommendedBreakPattern,
    subjectPriorities: analysis.subjectDifficultyAdjustment,
    recommendations: analysis.scheduleRecommendations,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Format adaptive insights for WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted insights
 */
export function formatAdaptiveInsights(phoneNumber) {
  const insights = getAdaptiveInsights(phoneNumber);
  
  if (!insights) {
    return 'No adaptive insights available yet. Start studying to generate insights!';
  }

  let message = '📊 Adaptive Study Insights\n\n';
  
  message += `⏰ Most Productive Time: ${insights.mostProductiveTime}\n`;
  message += `⏱️ Optimal Session Length: ${insights.optimalSessionLength} minutes\n`;
  message += `☕ Recommended Break Pattern: ${insights.breakPattern}\n\n`;
  
  message += `📚 Subject Priorities:\n`;
  Object.entries(insights.subjectPriorities).forEach(([subject, data]) => {
    const icon = data.priority === 'high' ? '🔴' : '🟢';
    message += `${icon} ${subject} - ${data.suggestedFrequency}\n`;
  });
  
  if (insights.recommendations.length > 0) {
    message += `\n💡 Recommendations:\n`;
    insights.recommendations.forEach(rec => {
      message += `• ${rec.message}\n`;
    });
  }

  return message;
}
