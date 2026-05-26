/**
 * Focus Session Manager
 * Manages deep work focus sessions with accountability check-ins
 */

import { sendWhatsAppMessage } from '../whatsapp/sendMessage.js';

// Active focus sessions (keyed by phone number)
const focusSessions = new Map();

/**
 * Start focus session
 * @param {string} phoneNumber - User's phone number
 * @param {number} duration - Duration in minutes
 * @param {string} task - Optional task description
 * @returns {Object} - Session info
 */
export function startFocusSession(phoneNumber, duration, task = null) {
  const sessionId = `${phoneNumber}_${Date.now()}`;
  
  const session = {
    id: sessionId,
    phoneNumber,
    duration,
    task,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + duration * 60 * 1000).toISOString(),
    status: 'active',
    checkIns: 0,
    lastCheckIn: null
  };

  focusSessions.set(phoneNumber, session);

  console.log('🎯 Focus session started:', {
    sessionId,
    phoneNumber,
    duration,
    task,
    endTime: session.endTime,
    timestamp: new Date().toISOString()
  });

  // Schedule session end
  scheduleSessionEnd(phoneNumber, session);

  // Schedule mid-session check-in (at 50%)
  scheduleCheckIn(phoneNumber, session, duration * 0.5);

  return session;
}

/**
 * Schedule session end
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 */
function scheduleSessionEnd(phoneNumber, session) {
  const now = new Date();
  const endTime = new Date(session.endTime);
  const delay = endTime.getTime() - now.getTime();

  if (delay <= 0) {
    handleSessionEnd(phoneNumber, session);
    return;
  }

  const timer = setTimeout(() => {
    handleSessionEnd(phoneNumber, session);
  }, delay);

  session.endTimer = timer;
}

/**
 * Schedule mid-session check-in
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 * @param {number} checkInMinutes - Minutes until check-in
 */
function scheduleCheckIn(phoneNumber, session, checkInMinutes) {
  const delay = checkInMinutes * 60 * 1000;

  const timer = setTimeout(() => {
    sendCheckIn(phoneNumber, session);
  }, delay);

  session.checkInTimer = timer;

  console.log('📞 Check-in scheduled:', {
    sessionId: session.id,
    phoneNumber,
    checkInMinutes: Math.round(checkInMinutes),
    timestamp: new Date().toISOString()
  });
}

/**
 * Send mid-session check-in
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 */
async function sendCheckIn(phoneNumber, session) {
  if (session.status !== 'active') return;

  session.checkIns++;
  session.lastCheckIn = new Date().toISOString();

  const elapsed = Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000 / 60);
  const remaining = session.duration - elapsed;

  const message = `🎯 Focus check-in!\n\nYou've been focused for ${elapsed} minutes.\n${remaining} minutes remaining.\n\n${session.task ? `Task: ${session.task}\n\n` : ''}Keep going! You're doing great. 💪`;

  await sendWhatsAppMessage(phoneNumber, message);

  console.log('📞 Check-in sent:', {
    sessionId: session.id,
    phoneNumber,
    checkInCount: session.checkIns,
    elapsed,
    remaining,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle session end
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 */
async function handleSessionEnd(phoneNumber, session) {
  if (session.status !== 'active') return;

  session.status = 'completed';
  session.completedAt = new Date().toISOString();

  // Clear timers
  if (session.endTimer) clearTimeout(session.endTimer);
  if (session.checkInTimer) clearTimeout(session.checkInTimer);

  // Send completion message
  const message = `🎉 Focus session complete!\n\nDuration: ${session.duration} minutes\nCheck-ins: ${session.checkIns}\n${session.task ? `Task: ${session.task}\n\n` : ''}Great work! Take a break and recharge. 🌟`;
  
  await sendWhatsAppMessage(phoneNumber, message);

  console.log('✅ Focus session completed:', {
    sessionId: session.id,
    phoneNumber,
    duration: session.duration,
    checkIns: session.checkIns,
    timestamp: new Date().toISOString()
  });

  // Remove from active sessions
  focusSessions.delete(phoneNumber);
}

/**
 * Get active focus session for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Session or null
 */
export function getActiveFocusSession(phoneNumber) {
  return focusSessions.get(phoneNumber) || null;
}

/**
 * Stop focus session
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if stopped
 */
export function stopFocusSession(phoneNumber) {
  const session = focusSessions.get(phoneNumber);
  
  if (!session) return false;

  // Clear timers
  if (session.endTimer) clearTimeout(session.endTimer);
  if (session.checkInTimer) clearTimeout(session.checkInTimer);

  session.status = 'stopped';
  session.stoppedAt = new Date().toISOString();

  focusSessions.delete(phoneNumber);

  console.log('🛑 Focus session stopped:', {
    sessionId: session.id,
    phoneNumber,
    duration: session.duration,
    checkIns: session.checkIns,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Get focus session statistics for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Statistics
 */
export function getFocusSessionStats(phoneNumber) {
  const session = getActiveFocusSession(phoneNumber);
  
  if (!session) {
    return {
      hasActiveSession: false
    };
  }

  const now = new Date();
  const endTime = new Date(session.endTime);
  const remainingMinutes = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 1000 / 60));
  const elapsedMinutes = Math.round((now.getTime() - new Date(session.startTime).getTime()) / 1000 / 60);

  return {
    hasActiveSession: true,
    sessionId: session.id,
    task: session.task,
    duration: session.duration,
    elapsedMinutes,
    remainingMinutes,
    checkIns: session.checkIns,
    startTime: session.startTime,
    endTime: session.endTime
  };
}

/**
 * Get all active focus sessions
 * @returns {Array} - Array of active sessions
 */
export function getAllActiveFocusSessions() {
  return Array.from(focusSessions.values());
}

/**
 * Get focus system statistics
 * @returns {Object} - Statistics
 */
export function getFocusSystemStats() {
  const sessions = getAllActiveFocusSessions();
  
  let totalDuration = 0;
  let totalCheckIns = 0;

  sessions.forEach(session => {
    totalDuration += session.duration;
    totalCheckIns += session.checkIns;
  });

  return {
    totalActiveSessions: sessions.length,
    totalDuration,
    totalCheckIns,
    averageDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all focus sessions (for testing)
 */
export function clearAllFocusSessions() {
  focusSessions.forEach(session => {
    if (session.endTimer) clearTimeout(session.endTimer);
    if (session.checkInTimer) clearTimeout(session.checkInTimer);
  });
  focusSessions.clear();
  console.log('🗑️ All focus sessions cleared');
}
