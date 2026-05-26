/**
 * Reminder Scheduler
 * Manages reminder queue and sends WhatsApp reminders
 */

import { sendWhatsAppMessage } from '../whatsapp/sendMessage.js';

// In-memory reminder queue (keyed by phone number)
const reminderQueue = new Map();

// Active reminder timers
const activeTimers = new Map();

/**
 * Add reminder to queue
 * @param {string} phoneNumber - User's phone number
 * @param {Object} reminder - Parsed reminder object
 * @returns {Object} - Reminder with ID
 */
export function addReminder(phoneNumber, reminder) {
  const reminderId = `${phoneNumber}_${Date.now()}`;
  
  const reminderWithId = {
    ...reminder,
    id: reminderId,
    phoneNumber,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  if (!reminderQueue.has(phoneNumber)) {
    reminderQueue.set(phoneNumber, []);
  }

  reminderQueue.get(phoneNumber).push(reminderWithId);

  console.log('⏰ Reminder added to queue:', {
    reminderId,
    phoneNumber,
    text: reminder.text,
    scheduledTime: reminder.scheduledTime,
    timestamp: new Date().toISOString()
  });

  return reminderWithId;
}

/**
 * Schedule reminder execution
 * @param {string} phoneNumber - User's phone number
 * @param {Object} reminder - Reminder object
 */
export function scheduleReminder(phoneNumber, reminder) {
  const now = new Date();
  const scheduledTime = new Date(reminder.scheduledTime);
  const delay = scheduledTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Send immediately if time has passed
    sendReminder(phoneNumber, reminder);
    return;
  }

  // Clear existing timer for this reminder if any
  if (activeTimers.has(reminder.id)) {
    clearTimeout(activeTimers.get(reminder.id));
  }

  // Set new timer
  const timer = setTimeout(() => {
    sendReminder(phoneNumber, reminder);
  }, delay);

  activeTimers.set(reminder.id, timer);

  console.log('⏰ Reminder scheduled:', {
    reminderId: reminder.id,
    phoneNumber,
    delay: `${Math.round(delay / 1000 / 60)} minutes`,
    scheduledTime: scheduledTime.toISOString(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Send reminder via WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @param {Object} reminder - Reminder object
 */
async function sendReminder(phoneNumber, reminder) {
  try {
    const message = `🔔 Reminder: ${reminder.text}`;
    
    console.log('📤 Sending reminder:', {
      reminderId: reminder.id,
      phoneNumber,
      message,
      timestamp: new Date().toISOString()
    });

    const result = await sendWhatsAppMessage(phoneNumber, message);

    if (result.success) {
      console.log('✅ Reminder sent successfully:', {
        reminderId: reminder.id,
        phoneNumber,
        timestamp: new Date().toISOString()
      });

      // Update reminder status
      updateReminderStatus(phoneNumber, reminder.id, 'sent');
    } else {
      console.error('❌ Failed to send reminder:', {
        reminderId: reminder.id,
        phoneNumber,
        error: result,
        timestamp: new Date().toISOString()
      });

      // Update reminder status
      updateReminderStatus(phoneNumber, reminder.id, 'failed');
    }

    // Clear timer
    activeTimers.delete(reminder.id);

  } catch (error) {
    console.error('❌ Error sending reminder:', {
      reminderId: reminder.id,
      phoneNumber,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    updateReminderStatus(phoneNumber, reminder.id, 'failed');
    activeTimers.delete(reminder.id);
  }
}

/**
 * Update reminder status
 * @param {string} phoneNumber - User's phone number
 * @param {string} reminderId - Reminder ID
 * @param {string} status - New status
 */
function updateReminderStatus(phoneNumber, reminderId, status) {
  const userReminders = reminderQueue.get(phoneNumber);
  
  if (!userReminders) return;

  const reminder = userReminders.find(r => r.id === reminderId);
  
  if (reminder) {
    reminder.status = status;
    reminder.updatedAt = new Date().toISOString();
  }
}

/**
 * Get all reminders for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Array} - Array of reminders
 */
export function getUserReminders(phoneNumber) {
  return reminderQueue.get(phoneNumber) || [];
}

/**
 * Get active reminders for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Array} - Array of active reminders
 */
export function getActiveReminders(phoneNumber) {
  const reminders = getUserReminders(phoneNumber);
  return reminders.filter(r => r.status === 'scheduled');
}

/**
 * Cancel reminder
 * @param {string} phoneNumber - User's phone number
 * @param {string} reminderId - Reminder ID
 * @returns {boolean} - True if cancelled
 */
export function cancelReminder(phoneNumber, reminderId) {
  // Clear timer
  if (activeTimers.has(reminderId)) {
    clearTimeout(activeTimers.get(reminderId));
    activeTimers.delete(reminderId);
  }

  // Update status
  updateReminderStatus(phoneNumber, reminderId, 'cancelled');

  console.log('🗑️ Reminder cancelled:', {
    reminderId,
    phoneNumber,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Cancel all reminders for user
 * @param {string} phoneNumber - User's phone number
 * @returns {number} - Number of reminders cancelled
 */
export function cancelAllReminders(phoneNumber) {
  const reminders = getUserReminders(phoneNumber);
  let cancelledCount = 0;

  reminders.forEach(reminder => {
    if (reminder.status === 'scheduled') {
      cancelReminder(phoneNumber, reminder.id);
      cancelledCount++;
    }
  });

  console.log('🗑️ All reminders cancelled:', {
    phoneNumber,
    cancelledCount,
    timestamp: new Date().toISOString()
  });

  return cancelledCount;
}

/**
 * Get reminder queue statistics
 * @returns {Object} - Statistics
 */
export function getReminderQueueStats() {
  let totalReminders = 0;
  let scheduledReminders = 0;
  let sentReminders = 0;
  let failedReminders = 0;

  reminderQueue.forEach(reminders => {
    totalReminders += reminders.length;
    scheduledReminders += reminders.filter(r => r.status === 'scheduled').length;
    sentReminders += reminders.filter(r => r.status === 'sent').length;
    failedReminders += reminders.filter(r => r.status === 'failed').length;
  });

  return {
    totalUsers: reminderQueue.size,
    totalReminders,
    scheduledReminders,
    sentReminders,
    failedReminders,
    activeTimers: activeTimers.size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all reminders (for testing)
 */
export function clearAllReminders() {
  // Clear all timers
  activeTimers.forEach(timer => clearTimeout(timer));
  activeTimers.clear();
  
  // Clear queue
  reminderQueue.clear();

  console.log('🗑️ All reminders cleared');
}
