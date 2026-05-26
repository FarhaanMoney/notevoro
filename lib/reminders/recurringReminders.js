/**
 * Recurring Reminders
 * Handles recurring reminder patterns and scheduling
 */

import { addReminder, scheduleReminder } from './reminderScheduler.js';

// In-memory recurring reminder patterns (keyed by phone number)
const recurringPatterns = new Map();

/**
 * Add recurring reminder pattern
 * @param {string} phoneNumber - User's phone number
 * @param {Object} reminder - Parsed reminder with recurring info
 * @returns {Object} - Recurring pattern with ID
 */
export function addRecurringReminder(phoneNumber, reminder) {
  const patternId = `${phoneNumber}_${Date.now()}`;
  
  const pattern = {
    id: patternId,
    phoneNumber,
    text: reminder.text,
    recurring: reminder.recurring,
    time: reminder.time,
    status: 'active',
    nextOccurrence: calculateNextOccurrence(reminder),
    createdAt: new Date().toISOString()
  };

  if (!recurringPatterns.has(phoneNumber)) {
    recurringPatterns.set(phoneNumber, []);
  }

  recurringPatterns.get(phoneNumber).push(pattern);

  console.log('🔄 Recurring reminder added:', {
    patternId,
    phoneNumber,
    text: reminder.text,
    recurring: reminder.recurring,
    nextOccurrence: pattern.nextOccurrence,
    timestamp: new Date().toISOString()
  });

  // Schedule the first occurrence
  scheduleNextOccurrence(phoneNumber, pattern);

  return pattern;
}

/**
 * Calculate next occurrence of recurring reminder
 * @param {Object} reminder - Reminder with recurring pattern
 * @returns {string} - ISO date string of next occurrence
 */
function calculateNextOccurrence(reminder) {
  const now = new Date();
  let nextDate = new Date();

  // Set time if specified
  if (reminder.time) {
    nextDate.setHours(reminder.time.hours, reminder.time.minutes, 0, 0);
  }

  // Calculate based on recurring pattern
  switch (reminder.recurring?.type) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;

    case 'weekly':
      // If specific day is specified
      if (reminder.recurring.day) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(reminder.recurring.day);
        const currentDay = now.getDay();
        
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) {
          daysUntil += 7;
        }
        
        nextDate.setDate(nextDate.getDate() + daysUntil);
      } else {
        // Every 7 days
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
      break;

    case 'monthly':
      // Every 30 days
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 30);
      }
      break;

    default:
      // Default to daily
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
  }

  return nextDate.toISOString();
}

/**
 * Schedule next occurrence of recurring reminder
 * @param {string} phoneNumber - User's phone number
 * @param {Object} pattern - Recurring pattern
 */
function scheduleNextOccurrence(phoneNumber, pattern) {
  const scheduledTime = new Date(pattern.nextOccurrence);
  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Calculate next occurrence and reschedule
    pattern.nextOccurrence = calculateNextOccurrence({
      text: pattern.text,
      recurring: pattern.recurring,
      time: pattern.time
    });
    scheduleNextOccurrence(phoneNumber, pattern);
    return;
  }

  // Create one-time reminder for this occurrence
  const oneTimeReminder = {
    text: pattern.text,
    scheduledTime: pattern.nextOccurrence,
    recurring: null
  };

  const reminder = addReminder(phoneNumber, oneTimeReminder);
  scheduleReminder(phoneNumber, reminder);

  console.log('🔄 Next occurrence scheduled:', {
    patternId: pattern.id,
    phoneNumber,
    scheduledTime: pattern.nextOccurrence,
    delay: `${Math.round(delay / 1000 / 60)} minutes`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle recurring reminder completion and schedule next
 * @param {string} phoneNumber - User's phone number
 * @param {string} patternId - Pattern ID
 */
export function handleRecurringReminderCompletion(phoneNumber, patternId) {
  const patterns = recurringPatterns.get(phoneNumber);
  
  if (!patterns) return;

  const pattern = patterns.find(p => p.id === patternId);
  
  if (!pattern || pattern.status !== 'active') return;

  // Calculate next occurrence
  pattern.nextOccurrence = calculateNextOccurrence({
    text: pattern.text,
    recurring: pattern.recurring,
    time: pattern.time
  });

  // Schedule next occurrence
  scheduleNextOccurrence(phoneNumber, pattern);

  console.log('🔄 Recurring reminder completed, next scheduled:', {
    patternId,
    phoneNumber,
    nextOccurrence: pattern.nextOccurrence,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get recurring patterns for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Array} - Array of recurring patterns
 */
export function getRecurringPatterns(phoneNumber) {
  return recurringPatterns.get(phoneNumber) || [];
}

/**
 * Get active recurring patterns for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Array} - Array of active patterns
 */
export function getActiveRecurringPatterns(phoneNumber) {
  const patterns = getRecurringPatterns(phoneNumber);
  return patterns.filter(p => p.status === 'active');
}

/**
 * Cancel recurring pattern
 * @param {string} phoneNumber - User's phone number
 * @param {string} patternId - Pattern ID
 * @returns {boolean} - True if cancelled
 */
export function cancelRecurringReminder(phoneNumber, patternId) {
  const patterns = recurringPatterns.get(phoneNumber);
  
  if (!patterns) return false;

  const pattern = patterns.find(p => p.id === patternId);
  
  if (!pattern) return false;

  pattern.status = 'cancelled';
  pattern.updatedAt = new Date().toISOString();

  console.log('🗑️ Recurring reminder cancelled:', {
    patternId,
    phoneNumber,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Cancel all recurring patterns for user
 * @param {string} phoneNumber - User's phone number
 * @returns {number} - Number of patterns cancelled
 */
export function cancelAllRecurringReminders(phoneNumber) {
  const patterns = getRecurringPatterns(phoneNumber);
  let cancelledCount = 0;

  patterns.forEach(pattern => {
    if (pattern.status === 'active') {
      cancelRecurringReminder(phoneNumber, pattern.id);
      cancelledCount++;
    }
  });

  console.log('🗑️ All recurring reminders cancelled:', {
    phoneNumber,
    cancelledCount,
    timestamp: new Date().toISOString()
  });

  return cancelledCount;
}

/**
 * Get recurring reminders statistics
 * @returns {Object} - Statistics
 */
export function getRecurringRemindersStats() {
  let totalPatterns = 0;
  let activePatterns = 0;
  let cancelledPatterns = 0;

  recurringPatterns.forEach(patterns => {
    totalPatterns += patterns.length;
    activePatterns += patterns.filter(p => p.status === 'active').length;
    cancelledPatterns += patterns.filter(p => p.status === 'cancelled').length;
  });

  return {
    totalUsers: recurringPatterns.size,
    totalPatterns,
    activePatterns,
    cancelledPatterns,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all recurring reminders (for testing)
 */
export function clearAllRecurringReminders() {
  recurringPatterns.clear();
  console.log('🗑️ All recurring reminders cleared');
}
