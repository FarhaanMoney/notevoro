/**
 * Reminder Parser
 * Parses natural language reminders from user messages
 */

/**
 * Parse reminder from natural language
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed reminder or null
 */
export function parseReminder(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const lowerMessage = message.toLowerCase();

  // Check if this is a reminder request
  const reminderPatterns = [
    /remind me to (.+)/i,
    /remind me (.+)/i,
    /set a reminder to (.+)/i,
    /set reminder (.+)/i,
    /don't forget to (.+)/i,
    /remember to (.+)/i
  ];

  let reminderText = null;
  for (const pattern of reminderPatterns) {
    const match = message.match(pattern);
    if (match) {
      reminderText = match[1].trim();
      break;
    }
  }

  if (!reminderText) {
    return null;
  }

  // Extract time
  const timeInfo = extractTime(lowerMessage);

  // Extract date
  const dateInfo = extractDate(lowerMessage);

  // Extract recurring pattern
  const recurringInfo = extractRecurring(lowerMessage);

  return {
    text: reminderText,
    time: timeInfo,
    date: dateInfo,
    recurring: recurringInfo,
    rawMessage: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract time from message
 * @param {string} message - Lowercase message
 * @returns {Object|null} - Time info or null
 */
function extractTime(message) {
  // Time patterns like "7pm", "7:30", "7:30 pm"
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
  const match = message.match(timePattern);

  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const meridiem = match[3] ? match[3].toLowerCase() : null;

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return {
      hours,
      minutes,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
  }

  // Relative time patterns
  if (message.includes('morning')) {
    return { hours: 8, minutes: 0, formatted: '08:00', relative: 'morning' };
  }
  if (message.includes('afternoon')) {
    return { hours: 14, minutes: 0, formatted: '14:00', relative: 'afternoon' };
  }
  if (message.includes('evening')) {
    return { hours: 18, minutes: 0, formatted: '18:00', relative: 'evening' };
  }
  if (message.includes('night')) {
    return { hours: 21, minutes: 0, formatted: '21:00', relative: 'night' };
  }

  return null;
}

/**
 * Extract date from message
 * @param {string} message - Lowercase message
 * @returns {Object|null} - Date info or null
 */
function extractDate(message) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (message.includes('today')) {
    return {
      type: 'today',
      date: today.toISOString().split('T')[0]
    };
  }

  if (message.includes('tomorrow')) {
    return {
      type: 'tomorrow',
      date: tomorrow.toISOString().split('T')[0]
    };
  }

  // Day of week patterns
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (message.includes(days[i])) {
      const targetDate = new Date(today);
      const currentDay = today.getDay();
      const targetDay = i;
      
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      
      targetDate.setDate(targetDate.getDate() + daysUntil);
      
      return {
        type: days[i],
        date: targetDate.toISOString().split('T')[0]
      };
    }
  }

  return null;
}

/**
 * Extract recurring pattern from message
 * @param {string} message - Lowercase message
 * @returns {Object|null} - Recurring info or null
 */
function extractRecurring(message) {
  if (message.includes('every day') || message.includes('daily')) {
    return { type: 'daily', interval: 1 };
  }

  if (message.includes('every week') || message.includes('weekly')) {
    return { type: 'weekly', interval: 7 };
  }

  if (message.includes('every monday')) {
    return { type: 'weekly', day: 'monday' };
  }
  if (message.includes('every tuesday')) {
    return { type: 'weekly', day: 'tuesday' };
  }
  if (message.includes('every wednesday')) {
    return { type: 'weekly', day: 'wednesday' };
  }
  if (message.includes('every thursday')) {
    return { type: 'weekly', day: 'thursday' };
  }
  if (message.includes('every friday')) {
    return { type: 'weekly', day: 'friday' };
  }
  if (message.includes('every saturday')) {
    return { type: 'weekly', day: 'saturday' };
  }
  if (message.includes('every sunday')) {
    return { type: 'weekly', day: 'sunday' };
  }

  if (message.includes('every month') || message.includes('monthly')) {
    return { type: 'monthly', interval: 30 };
  }

  return null;
}

/**
 * Calculate next reminder time
 * @param {Object} reminder - Parsed reminder
 * @returns {Date|null} - Next reminder date or null
 */
export function calculateNextReminderTime(reminder) {
  const now = new Date();
  
  let targetDate = new Date();
  
  // Set date if specified
  if (reminder.date) {
    targetDate = new Date(reminder.date);
  }
  
  // Set time if specified
  if (reminder.time) {
    targetDate.setHours(reminder.time.hours, reminder.time.minutes, 0, 0);
  }
  
  // If time is in the past, move to next day
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  return targetDate;
}
