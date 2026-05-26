/**
 * Daily Check-in System
 * Morning goal setting and night reflection for emotional engagement
 */

import { getUserMemoryDB, updateUserMemoryDB } from '../database/memoryStore.js';
import { updateStreakDataDB, getStreakDataDB } from '../database/memoryStore.js';
import { sendWhatsAppMessage } from '../whatsapp/sendMessage.js';
import { getUserByPhone } from '../auth/userManager.js';

/**
 * Morning check-in - ask goals and generate plan
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Morning check-in message
 */
export async function morningCheckin(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return null;
  }

  const memory = getUserMemoryDB(user.id);
  const goals = memory.goals || [];
  const subjects = memory.studySubjects || [];
  const preferredTimes = memory.preferredStudyTimes || [];

  let message = `☀️ Good morning, ${user.name || 'there'}!\n\n`;
  
  if (goals.length > 0) {
    message += `🎯 Your goals:\n`;
    goals.slice(0, 3).forEach((goal, i) => {
      message += `${i + 1}. ${goal}\n`;
    });
    message += '\n';
  }

  if (subjects.length > 0) {
    message += `📚 Today's focus:\n`;
    subjects.slice(0, 3).forEach((subject, i) => {
      message += `${i + 1}. ${subject}\n`;
    });
    message += '\n';
  }

  message += `💡 What's your main focus today?\n`;
  message += `Reply with your goals and I'll help you plan your day!`;

  // Record check-in
  const today = new Date().toISOString().split('T')[0];
  const streakData = getStreakDataDB(user.id);
  streakData.dailyActivities[today] = {
    morningCheckin: true,
    timestamp: new Date().toISOString()
  };
  updateStreakDataDB(user.id, streakData);

  return message;
}

/**
 * Night reflection - productivity review and next-day setup
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Night reflection message
 */
export async function nightReflection(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return null;
  }

  const memory = getUserMemoryDB(user.id);
  const streakData = getStreakDataDB(user.id);
  const focusHistory = user.focusHistory || {};

  const today = new Date().toISOString().split('T')[0];
  const todayActivity = streakData.dailyActivities[today];

  let message = `🌙 Good evening, ${user.name || 'there'}!\n\n`;
  
  // Today's summary
  message += `📊 Today's Summary:\n`;
  message += `🔥 Streak: ${streakData.currentStreak} days\n`;
  message += `⏱️ Focus time: ${focusHistory.totalFocusMinutes || 0} minutes\n`;
  message += `🎯 Sessions: ${focusHistory.totalSessions || 0}\n\n`;

  if (todayActivity && todayActivity.morningCheckin) {
    message += `✅ You completed your morning check-in!\n`;
  } else {
    message += `⏰ Morning check-in missed today\n`;
  }

  message += `\n💭 Reflection:\n`;
  message += `What went well today?\n`;
  message += `What could be improved?\n`;
  message += `What's your main focus for tomorrow?\n\n`;
  message += `Reply with your reflection to set up tomorrow!`;

  // Record check-in
  if (!streakData.dailyActivities[today]) {
    streakData.dailyActivities[today] = {};
  }
  streakData.dailyActivities[today].nightReflection = true;
  streakData.dailyActivities[today].nightTimestamp = new Date().toISOString();
  updateStreakDataDB(user.id, streakData);

  return message;
}

/**
 * Process morning goals response
 * @param {string} phoneNumber - User's phone number
 * @param {string} goalsText - User's goals text
 * @returns {string} - Generated plan
 */
export async function processMorningGoals(phoneNumber, goalsText) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return null;
  }

  // Extract goals from text
  const goals = extractGoals(goalsText);
  
  // Update memory
  const memory = getUserMemoryDB(user.id);
  memory.goals = [...(memory.goals || []), ...goals];
  updateUserMemoryDB(user.id, { goals });

  // Generate daily plan
  const plan = generateDailyPlan(memory, goals);

  let message = `📋 Your Daily Plan:\n\n`;
  message += plan;
  message += `\n\n💪 You've got this! Let me know if you need to adjust anything.`;

  return message;
}

/**
 * Process night reflection response
 * @param {string} phoneNumber - User's phone number
 * @param {string} reflectionText - User's reflection text
 * @returns {string} - Next day setup
 */
export async function processNightReflection(phoneNumber, reflectionText) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return null;
  }

  // Extract reflection insights
  const insights = extractReflectionInsights(reflectionText);
  
  // Update memory with insights
  const memory = getUserMemoryDB(user.id);
  memory.productivityInsights = insights;
  updateUserMemoryDB(user.id, { productivityInsights: insights });

  let message = `✨ Reflection saved!\n\n`;
  message += `🌅 Tomorrow's Setup:\n`;
  message += `Based on your reflection, here are suggestions:\n\n`;
  message += `• Focus on your top priority first thing\n`;
  message += `• Take breaks between deep work sessions\n`;
  message += `• Review your goals before starting\n\n`;
  message += `🎯 Set your morning goals tomorrow to kickstart your day!`;

  return message;
}

/**
 * Extract goals from text
 * @param {string} text - User's text
 * @returns {Array} - Extracted goals
 */
function extractGoals(text) {
  const goals = [];
  const sentences = text.split(/[.!?]/).filter(s => s.trim());
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length > 5 && trimmed.length < 100) {
      goals.push(trimmed);
    }
  });

  return goals.slice(0, 5);
}

/**
 * Extract reflection insights
 * @param {string} text - User's reflection text
 * @returns {Object} - Insights
 */
function extractReflectionInsights(text) {
  const lowerText = text.toLowerCase();
  
  return {
    wentWell: lowerText.includes('good') || lowerText.includes('great') || lowerText.includes('productive'),
    needsImprovement: lowerText.includes('hard') || lowerText.includes('difficult') || lowerText.includes('struggle'),
    tomorrowFocus: extractTomorrowFocus(text),
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract tomorrow's focus
 * @param {string} text - User's text
 * @returns {string} - Tomorrow's focus
 */
function extractTomorrowFocus(text) {
  const sentences = text.split(/[.!?]/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes('tomorrow')) {
      return sentence.trim();
    }
  }
  return '';
}

/**
 * Generate daily plan
 * @param {Object} memory - User memory
 * @param {Array} goals - Today's goals
 * @returns {string} - Daily plan
 */
function generateDailyPlan(memory, goals) {
  const subjects = memory.studySubjects || [];
  const preferredTimes = memory.preferredStudyTimes || ['morning', 'afternoon'];
  
  let plan = '';
  
  if (goals.length > 0) {
    plan += `🎯 Goals:\n`;
    goals.forEach((goal, i) => {
      plan += `${i + 1}. ${goal}\n`;
    });
    plan += '\n';
  }

  if (subjects.length > 0) {
    plan += `📚 Study Schedule:\n`;
    subjects.forEach((subject, i) => {
      const time = preferredTimes[i % preferredTimes.length];
      plan += `${i + 1}. ${subject} (${time})\n`;
    });
    plan += '\n';
  }

  plan += `⏰ Focus Sessions:\n`;
  plan += `• Morning: 25min Pomodoro\n`;
  plan += `• Afternoon: 45min Deep Work\n`;
  plan += `• Evening: Review & Plan\n\n`;

  plan += `💡 Tips:\n`;
  plan += `• Start with your most important task\n`;
  plan += `• Take breaks between sessions\n`;
  plan += `• Stay hydrated and stretch\n`;

  return plan;
}

/**
 * Schedule morning check-in
 * @param {string} phoneNumber - Phone number
 * @param {string} time - Time in HH:MM format
 * @returns {Object} - Scheduled check-in
 */
export function scheduleMorningCheckin(phoneNumber, time) {
  // This would integrate with the reminder scheduler
  // For now, return placeholder
  return {
    phoneNumber,
    time,
    type: 'morning_checkin',
    scheduled: true
  };
}

/**
 * Schedule night reflection
 * @param {string} phoneNumber - Phone number
 * @param {string} time - Time in HH:MM format
 * @returns {Object} - Scheduled reflection
 */
export function scheduleNightReflection(phoneNumber, time) {
  // This would integrate with the reminder scheduler
  // For now, return placeholder
  return {
    phoneNumber,
    time,
    type: 'night_reflection',
    scheduled: true
  };
}

/**
 * Get check-in status for today
 * @param {string} phoneNumber - Phone number
 * @returns {Object} - Check-in status
 */
export function getCheckinStatus(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return null;
  }

  const streakData = getStreakDataDB(user.id);
  const today = new Date().toISOString().split('T')[0];
  const todayActivity = streakData.dailyActivities[today] || {};

  return {
    morningCompleted: !!todayActivity.morningCheckin,
    nightCompleted: !!todayActivity.nightReflection,
    date: today,
    streak: streakData.currentStreak
  };
}
