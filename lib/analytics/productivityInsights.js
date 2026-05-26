/**
 * Productivity Insights
 * Generates comprehensive productivity reports and analytics
 */

import { getUserMemory } from '../memory/memoryStore.js';
import { getStreakStatistics } from '../streaks/streakTracker.js';

/**
 * Generate comprehensive productivity report
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Productivity report
 */
export function generateProductivityReport(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const streakStats = getStreakStatistics(phoneNumber);
  const productivityStats = memory.productivityStats || {};
  const emotionalPatterns = memory.emotionalPatterns || {};
  const energyLevels = memory.energyLevels || {};

  const report = {
    phoneNumber,
    generatedAt: new Date().toISOString(),
    period: 'last_30_days',
    
    // Streak metrics
    streak: streakStats?.hasStreakData ? {
      currentStreak: streakStats.currentStreak,
      longestStreak: streakStats.longestStreak,
      consistencyScore: streakStats.consistencyScore,
      weeklyActivities: streakStats.weeklyActivities
    } : null,
    
    // Productivity metrics
    productivity: {
      totalSessions: productivityStats.totalSessions || 0,
      totalFocusMinutes: productivityStats.totalFocusMinutes || 0,
      tasksCompleted: productivityStats.tasksCompleted || 0,
      averageDailyFocusMinutes: calculateAverageDailyFocus(productivityStats),
      mostProductiveDay: identifyMostProductiveDay(memory),
      lastActiveDate: productivityStats.lastActiveDate
    },
    
    // Emotional metrics
    emotional: {
      stressLevel: emotionalPatterns.stressLevel || 'moderate',
      moodHistoryLength: emotionalPatterns.moodHistory?.length || 0,
      dominantMood: identifyDominantMood(emotionalPatterns.moodHistory)
    },
    
    // Energy metrics
    energy: {
      averageLevel: energyLevels.averageEnergyLevel || 'moderate',
      peakHours: energyLevels.peakHours || [],
      lowEnergyTimes: energyLevels.lowEnergyTimes || []
    },
    
    // Study metrics
    study: {
      subjectCount: memory.studySubjects?.length || 0,
      weakSubjectCount: memory.weakSubjects?.length || 0,
      goalCount: memory.goals?.length || 0,
      preferredStudyTimes: memory.preferredStudyTimes?.length || 0
    },
    
    // Insights and recommendations
    insights: generateInsights(memory, streakStats, productivityStats),
    recommendations: generateRecommendations(memory, streakStats, productivityStats)
  };

  console.log('📊 Productivity report generated:', {
    phoneNumber,
    streak: report.streak?.currentStreak,
    totalSessions: report.productivity.totalSessions,
    timestamp: new Date().toISOString()
  });

  return report;
}

/**
 * Calculate average daily focus minutes
 * @param {Object} productivityStats - Productivity statistics
 * @returns {number} - Average daily focus minutes
 */
function calculateAverageDailyFocus(productivityStats) {
  const totalFocusMinutes = productivityStats.totalFocusMinutes || 0;
  const totalSessions = productivityStats.totalSessions || 0;
  
  if (totalSessions === 0) return 0;
  
  // Estimate days active (assuming at least 1 session per day)
  const daysActive = Math.min(30, totalSessions);
  
  return Math.round(totalFocusMinutes / daysActive);
}

/**
 * Identify most productive day
 * @param {Object} memory - User memory
 * @returns {string|null} - Most productive day
 */
function identifyMostProductiveDay(memory) {
  const productivityHabits = memory.productivityHabits || {};
  return productivityHabits.mostProductiveDay || null;
}

/**
 * Identify dominant mood
 * @param {Array} moodHistory - Mood history
 * @returns {string} - Dominant mood
 */
function identifyDominantMood(moodHistory) {
  if (!moodHistory || moodHistory.length === 0) {
    return 'neutral';
  }

  const moodCounts = {};
  moodHistory.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  return sortedMoods[0]?.[0] || 'neutral';
}

/**
 * Generate insights from data
 * @param {Object} memory - User memory
 * @param {Object} streakStats - Streak statistics
 * @param {Object} productivityStats - Productivity statistics
 * @returns {Array} - Array of insights
 */
function generateInsights(memory, streakStats, productivityStats) {
  const insights = [];

  // Streak insights
  if (streakStats?.hasStreakData) {
    if (streakStats.currentStreak >= 7) {
      insights.push({
        type: 'positive',
        category: 'consistency',
        message: `Excellent consistency! ${streakStats.currentStreak} day streak shows strong habit formation.`
      });
    } else if (streakStats.currentStreak >= 3) {
      insights.push({
        type: 'positive',
        category: 'consistency',
        message: `Good momentum building with ${streakStats.currentStreak} day streak.`
      });
    } else if (streakStats.currentStreak === 0) {
      insights.push({
        type: 'warning',
        category: 'consistency',
        message: 'No active streak. Start small with daily activities to build consistency.'
      });
    }
  }

  // Productivity insights
  const totalFocusMinutes = productivityStats.totalFocusMinutes || 0;
  if (totalFocusMinutes > 300) {
    insights.push({
      type: 'positive',
      category: 'productivity',
      message: `Strong focus time accumulated: ${Math.round(totalFocusMinutes / 60)} hours total.`
    });
  } else if (totalFocusMinutes > 0) {
    insights.push({
      type: 'neutral',
      category: 'productivity',
      message: `${Math.round(totalFocusMinutes / 60)} hours of focus time recorded. Keep building!`
    });
  }

  // Emotional insights
  const stressLevel = memory.emotionalPatterns?.stressLevel;
  if (stressLevel === 'high') {
    insights.push({
      type: 'warning',
      category: 'wellbeing',
      message: 'High stress levels detected. Consider incorporating more breaks and self-care.'
    });
  } else if (stressLevel === 'low') {
    insights.push({
      type: 'positive',
      category: 'wellbeing',
      message: 'Low stress levels - great for sustained productivity.'
    });
  }

  // Study insights
  const weakSubjectCount = memory.weakSubjects?.length || 0;
  if (weakSubjectCount > 0) {
    insights.push({
      type: 'neutral',
      category: 'learning',
      message: `${weakSubjectCount} subject(s) identified for improvement. Focus extra time here.`
    });
  }

  return insights;
}

/**
 * Generate recommendations
 * @param {Object} memory - User memory
 * @param {Object} streakStats - Streak statistics
 * @param {Object} productivityStats - Productivity statistics
 * @returns {Array} - Array of recommendations
 */
function generateRecommendations(memory, streakStats, productivityStats) {
  const recommendations = [];

  // Streak recommendations
  if (streakStats?.consistencyScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'consistency',
      action: 'Increase daily activity frequency to improve consistency score'
    });
  }

  // Productivity recommendations
  const totalSessions = productivityStats.totalSessions || 0;
  if (totalSessions < 10) {
    recommendations.push({
      priority: 'medium',
      category: 'productivity',
      action: 'Try to complete at least one focus session daily'
    });
  }

  // Study recommendations
  if (memory.studySubjects?.length === 0) {
    recommendations.push({
      priority: 'high',
      category: 'learning',
      action: 'Add your study subjects to get personalized recommendations'
    });
  }

  // Energy recommendations
  if (!memory.energyLevels?.peakHours || memory.energyLevels.peakHours.length === 0) {
    recommendations.push({
      priority: 'medium',
      category: 'optimization',
      action: 'Track your energy levels to identify peak productivity hours'
    });
  }

  return recommendations;
}

/**
 * Format productivity report for WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted report
 */
export function formatProductivityReport(phoneNumber) {
  const report = generateProductivityReport(phoneNumber);
  
  if (!report) {
    return 'No productivity data available yet. Start using the assistant to generate insights!';
  }

  let message = '📊 Productivity Report\n\n';
  
  // Streak section
  if (report.streak) {
    message += `🔥 Streak: ${report.streak.currentStreak} days\n`;
    message += `📈 Consistency: ${report.streak.consistencyScore}%\n`;
    message += `📅 Weekly Activities: ${report.streak.weeklyActivities}\n\n`;
  }
  
  // Productivity section
  message += `⏱️ Total Focus Time: ${Math.round(report.productivity.totalFocusMinutes / 60)} hours\n`;
  message += `🎯 Total Sessions: ${report.productivity.totalSessions}\n`;
  message += `📊 Daily Average: ${report.productivity.averageDailyFocusMinutes} minutes\n\n`;
  
  // Emotional section
  message += `😊 Stress Level: ${report.emotional.stressLevel}\n`;
  message += `🎭 Dominant Mood: ${report.emotional.dominantMood}\n\n`;
  
  // Study section
  message += `📚 Subjects: ${report.study.subjectCount}\n`;
  message += `⚠️ Weak Subjects: ${report.study.weakSubjectCount}\n`;
  message += `🎯 Goals: ${report.study.goalCount}\n\n`;
  
  // Insights
  if (report.insights.length > 0) {
    message += `💡 Key Insights:\n`;
    report.insights.slice(0, 3).forEach(insight => {
      const icon = insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : 'ℹ️';
      message += `${icon} ${insight.message}\n`;
    });
    message += '\n';
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    message += `🎯 Recommendations:\n`;
    report.recommendations.slice(0, 2).forEach(rec => {
      const icon = rec.priority === 'high' ? '🔴' : '🟡';
      message += `${icon} ${rec.action}\n`;
    });
  }

  return message;
}

/**
 * Get quick productivity summary
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Quick summary
 */
export function getQuickSummary(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return 'No data available yet.';
  }

  const streakStats = getStreakStatistics(phoneNumber);
  const productivityStats = memory.productivityStats || {};

  let summary = '📊 Quick Summary:\n\n';
  
  if (streakStats?.hasStreakData) {
    summary += `🔥 ${streakStats.currentStreak} day streak\n`;
  }
  
  summary += `⏱️ ${Math.round((productivityStats.totalFocusMinutes || 0) / 60)}h total focus\n`;
  summary += `🎯 ${productivityStats.totalSessions || 0} sessions completed\n`;
  summary += `📚 ${memory.studySubjects?.length || 0} subjects\n`;

  return summary;
}

/**
 * Detect burnout risk
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Burnout risk assessment
 */
export function assessBurnoutRisk(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const stressLevel = memory.emotionalPatterns?.stressLevel || 'moderate';
  const moodHistory = memory.emotionalPatterns?.moodHistory || [];
  const productivityStats = memory.productivityStats || {};

  let riskScore = 0;
  const factors = [];

  // High stress
  if (stressLevel === 'high') {
    riskScore += 30;
    factors.push('High stress level');
  }

  // Negative mood patterns
  const recentNegativeMoods = moodHistory.slice(-10).filter(m => 
    ['stressed', 'sad', 'tired', 'frustrated'].includes(m.mood)
  ).length;
  
  if (recentNegativeMoods > 7) {
    riskScore += 25;
    factors.push('Frequent negative moods');
  }

  // Excessive focus time (potential overwork)
  const avgDailyFocus = calculateAverageDailyFocus(productivityStats);
  if (avgDailyFocus > 180) {
    riskScore += 20;
    factors.push('Excessive daily focus time');
  }

  // Low consistency (potential burnout)
  const streakStats = getStreakStatistics(phoneNumber);
  if (streakStats?.consistencyScore < 30) {
    riskScore += 15;
    factors.push('Low consistency');
  }

  let riskLevel = 'low';
  if (riskScore >= 60) {
    riskLevel = 'high';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  }

  return {
    riskScore,
    riskLevel,
    factors,
    recommendation: getBurnoutRecommendation(riskLevel)
  };
}

/**
 * Get burnout recommendation
 * @param {string} riskLevel - Risk level
 * @returns {string} - Recommendation
 */
function getBurnoutRecommendation(riskLevel) {
  switch (riskLevel) {
    case 'high':
      return 'Take immediate action: reduce workload, prioritize rest, and consider taking a break.';
    case 'medium':
      return 'Monitor your stress levels and ensure you\'re taking adequate breaks.';
    case 'low':
      return 'You\'re doing well! Keep maintaining healthy work-life balance.';
    default:
      return 'Continue monitoring your wellbeing.';
  }
}
