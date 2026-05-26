/**
 * Command Parser
 * Parses and executes slash commands for the WhatsApp AI assistant
 */

import { parseReminder, calculateNextReminderTime } from '../reminders/reminderParser.js';
import { addReminder, scheduleReminder } from '../reminders/reminderScheduler.js';
import { addRecurringReminder } from '../reminders/recurringReminders.js';
import { startPomodoro, getActiveSession, stopPomodoro } from '../focus/pomodoroTimer.js';
import { startFocusSession, getActiveFocusSession, stopFocusSession } from '../focus/focusSession.js';
import { recordActivity, getStreakStatistics } from '../streaks/streakTracker.js';
import { getUserMemory } from '../memory/memoryStore.js';

/**
 * Parse command from message
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed command or null
 */
export function parseCommand(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const trimmedMessage = message.trim();

  // Check if it's a command (starts with /)
  if (!trimmedMessage.startsWith('/')) {
    return null;
  }

  const parts = trimmedMessage.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  console.log('🔧 Command parsed:', { command, args });

  return {
    command,
    args,
    isValid: true
  };
}

/**
 * Execute command
 * @param {Object} parsedCommand - Parsed command object
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string|null>} - Response or null
 */
export async function executeCommand(parsedCommand, phoneNumber) {
  const { command, args } = parsedCommand;

  switch (command) {
    case '/remind':
      return await handleRemindCommand(args, phoneNumber);
    
    case '/schedule':
      return await handleScheduleCommand(args, phoneNumber);
    
    case '/focus':
      return await handleFocusCommand(args, phoneNumber);
    
    case '/deepwork':
      return await handleDeepWorkCommand(args, phoneNumber);
    
    case '/pomodoro':
      return await handlePomodoroCommand(args, phoneNumber);
    
    case '/streak':
      return await handleStreakCommand(phoneNumber);
    
    case '/stats':
      return await handleStatsCommand(phoneNumber);
    
    case '/today':
      return await handleTodayCommand(phoneNumber);
    
    case '/studyplan':
      return await handleStudyPlanCommand(phoneNumber);
    
    default:
      return `Unknown command: ${command}. Try /remind, /focus, /streak, or /stats`;
  }
}

/**
 * Handle /remind command
 * @param {string} args - Command arguments
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleRemindCommand(args, phoneNumber) {
  if (!args) {
    return 'Usage: /remind <message> [at <time>] [on <day>]';
  }

  const reminder = parseReminder(args);
  
  if (!reminder) {
    return 'Could not parse reminder. Try: /remind study physics at 7pm';
  }

  const scheduledTime = calculateNextReminderTime(reminder);
  reminder.scheduledTime = scheduledTime.toISOString();

  const addedReminder = addReminder(phoneNumber, reminder);
  scheduleReminder(phoneNumber, addedReminder);

  const timeStr = reminder.time ? reminder.time.formatted : 'default time';
  const dateStr = reminder.date ? reminder.date.type : 'today';

  return `✅ Reminder set: "${reminder.text}"\n📅 ${dateStr} at ${timeStr}`;
}

/**
 * Handle /schedule command
 * @param {string} args - Command arguments
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleScheduleCommand(args, phoneNumber) {
  if (!args) {
    return 'Usage: /schedule <message> [recurring pattern]';
  }

  const reminder = parseReminder(args);
  
  if (!reminder) {
    return 'Could not parse schedule. Try: /schedule study physics every Monday at 7pm';
  }

  if (!reminder.recurring) {
    // Non-recurring reminder
    return await handleRemindCommand(args, phoneNumber);
  }

  const scheduledTime = calculateNextReminderTime(reminder);
  reminder.scheduledTime = scheduledTime.toISOString();

  addRecurringReminder(phoneNumber, reminder);

  const pattern = reminder.recurring.type;
  const day = reminder.recurring.day || '';

  return `✅ Recurring reminder set: "${reminder.text}"\n🔄 Pattern: ${pattern} ${day}`;
}

/**
 * Handle /focus command
 * @param {string} args - Command arguments
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleFocusCommand(args, phoneNumber) {
  const durationMatch = args.match(/(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 45;
  const task = args.replace(/\d+/, '').trim() || null;

  const session = startFocusSession(phoneNumber, duration, task);

  return `🎯 Focus session started!\n⏱️ Duration: ${duration} minutes\n${task ? `📝 Task: ${task}\n` : ''}I'll check on you halfway through. You've got this! 💪`;
}

/**
 * Handle /deepwork command
 * @param {string} args - Command arguments
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleDeepWorkCommand(args, phoneNumber) {
  const durationMatch = args.match(/(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 90;
  const task = args.replace(/\d+/, '').trim() || null;

  const session = startFocusSession(phoneNumber, duration, task);

  return `🧠 Deep work session started!\n⏱️ Duration: ${duration} minutes\n${task ? `📝 Task: ${task}\n` : ''}No distractions. Pure focus. I'll check on you periodically. 🔥`;
}

/**
 * Handle /pomodoro command
 * @param {string} args - Command arguments
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handlePomodoroCommand(args, phoneNumber) {
  const durationMatch = args.match(/(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 25;

  const session = startPomodoro(phoneNumber, duration);

  return `🍅 Pomodoro session started!\n⏱️ Work: ${duration} minutes\n☕ Break: 5 minutes\nFocus for ${duration} minutes, then take a short break. Let's go! 🚀`;
}

/**
 * Handle /streak command
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleStreakCommand(phoneNumber) {
  const streakInfo = getStreakStatistics(phoneNumber);

  if (!streakInfo || !streakInfo.hasStreakData) {
    return '🔥 No streak data yet. Start your first activity today!';
  }

  const milestone = streakInfo.milestone || '';
  
  return `🔥 Current Streak: ${streakInfo.currentStreak} days\n🏆 Longest Streak: ${streakInfo.longestStreak} days\n📊 Consistency: ${streakInfo.consistencyScore}%\n${milestone ? `\n${milestone}\n` : ''}Keep it up! 💪`;
}

/**
 * Handle /stats command
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleStatsCommand(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return 'No data available yet.';
  }

  const streakInfo = getStreakStatistics(phoneNumber);
  const stats = streakInfo?.hasStreakData ? streakInfo : null;

  let response = '📊 Your Stats:\n\n';
  
  if (stats) {
    response += `🔥 Streak: ${stats.currentStreak} days\n`;
    response += `📈 Consistency: ${stats.consistencyScore}%\n`;
    response += `📅 Weekly Activities: ${stats.weeklyActivities}\n`;
  }
  
  response += `\n💬 Total Messages: ${memory.conversationHistory.length}\n`;
  response += `🎯 Focus Sessions: ${memory.productivityStats.totalSessions}\n`;
  response += `⏱️ Total Focus Time: ${memory.productivityStats.totalFocusMinutes} minutes\n`;

  return response;
}

/**
 * Handle /today command
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleTodayCommand(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return 'No data available yet.';
  }

  const today = new Date().toISOString().split('T')[0];
  const isActiveToday = memory.streakData?.dailyActivities?.[today];

  let response = `📅 Today's Overview:\n\n`;
  
  if (isActiveToday) {
    response += `✅ You've been active today!\n`;
  } else {
    response += `⏳ No activity recorded yet today.\n`;
  }
  
  response += `\n📚 Study Subjects: ${memory.studySubjects.join(', ') || 'None set'}\n`;
  response += `🎯 Goals: ${memory.goals.slice(0, 3).join(', ') || 'None set'}\n`;
  response += `\n💡 Tip: Use /focus to start a focus session!`;

  return response;
}

/**
 * Handle /studyplan command
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<string>} - Response
 */
async function handleStudyPlanCommand(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return 'No data available yet.';
  }

  if (memory.studySubjects.length === 0) {
    return 'No study subjects set. Tell me what you\'re studying and I\'ll create a plan!';
  }

  let response = `📚 Your Study Plan:\n\n`;
  
  memory.studySubjects.forEach((subject, index) => {
    response += `${index + 1}. ${subject}\n`;
  });
  
  response += `\n⏰ Preferred Study Times: ${memory.preferredStudyTimes.join(', ') || 'Not set'}\n`;
  response += `🎯 Focus Duration: ${memory.focusDuration} minutes\n`;
  response += `\n💡 Use /focus to start a study session!`;

  return response;
}
