/**
 * Pomodoro Timer
 * Manages Pomodoro focus sessions with work/break intervals
 */

import { sendWhatsAppMessage } from '../whatsapp/sendMessage.js';

// Active Pomodoro sessions (keyed by phone number)
const activeSessions = new Map();

// Default Pomodoro settings
const DEFAULT_WORK_DURATION = 25; // minutes
const DEFAULT_BREAK_DURATION = 5; // minutes
const DEFAULT_LONG_BREAK_DURATION = 15; // minutes
const SESSIONS_BEFORE_LONG_BREAK = 4;

/**
 * Start Pomodoro session
 * @param {string} phoneNumber - User's phone number
 * @param {number} workDuration - Work duration in minutes
 * @param {number} breakDuration - Break duration in minutes
 * @returns {Object} - Session info
 */
export function startPomodoro(phoneNumber, workDuration = DEFAULT_WORK_DURATION, breakDuration = DEFAULT_BREAK_DURATION) {
  const sessionId = `${phoneNumber}_${Date.now()}`;
  
  const session = {
    id: sessionId,
    phoneNumber,
    workDuration,
    breakDuration,
    longBreakDuration: DEFAULT_LONG_BREAK_DURATION,
    currentPhase: 'work', // 'work', 'break', 'longBreak'
    sessionsCompleted: 0,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + workDuration * 60 * 1000).toISOString(),
    status: 'active'
  };

  activeSessions.set(phoneNumber, session);

  console.log('🍅 Pomodoro session started:', {
    sessionId,
    phoneNumber,
    workDuration,
    breakDuration,
    endTime: session.endTime,
    timestamp: new Date().toISOString()
  });

  // Schedule end of work phase
  schedulePhaseEnd(phoneNumber, session);

  return session;
}

/**
 * Schedule end of current phase
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 */
function schedulePhaseEnd(phoneNumber, session) {
  const now = new Date();
  const endTime = new Date(session.endTime);
  const delay = endTime.getTime() - now.getTime();

  if (delay <= 0) {
    handlePhaseEnd(phoneNumber, session);
    return;
  }

  const timer = setTimeout(() => {
    handlePhaseEnd(phoneNumber, session);
  }, delay);

  // Store timer reference
  session.timer = timer;

  console.log('⏰ Phase scheduled:', {
    sessionId: session.id,
    phoneNumber,
    phase: session.currentPhase,
    delay: `${Math.round(delay / 1000 / 60)} minutes`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle end of current phase
 * @param {string} phoneNumber - User's phone number
 * @param {Object} session - Session object
 */
async function handlePhaseEnd(phoneNumber, session) {
  if (session.status !== 'active') return;

  if (session.currentPhase === 'work') {
    // Work phase completed
    session.sessionsCompleted++;
    
    // Determine next phase
    if (session.sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK === 0) {
      session.currentPhase = 'longBreak';
      session.endTime = new Date(Date.now() + session.longBreakDuration * 60 * 1000).toISOString();
    } else {
      session.currentPhase = 'break';
      session.endTime = new Date(Date.now() + session.breakDuration * 60 * 1000).toISOString();
    }

    // Send completion message
    const message = `🍅 Great work! You completed a ${session.workDuration}-minute focus session.\n\nTime for a ${session.currentPhase === 'longBreak' ? session.longBreakDuration : session.breakDuration}-minute break.\n\nI'll check on you when it's time to focus again.`;
    
    await sendWhatsAppMessage(phoneNumber, message);

    console.log('✅ Work phase completed:', {
      sessionId: session.id,
      phoneNumber,
      sessionsCompleted: session.sessionsCompleted,
      nextPhase: session.currentPhase,
      timestamp: new Date().toISOString()
    });

    // Schedule break end
    schedulePhaseEnd(phoneNumber, session);

  } else {
    // Break phase completed
    session.currentPhase = 'work';
    session.endTime = new Date(Date.now() + session.workDuration * 60 * 1000).toISOString();

    // Send break completion message
    const message = `⏰ Break's over! Time to focus again.\n\nNext ${session.workDuration}-minute session starting now.\n\nYou've got this! 💪`;
    
    await sendWhatsAppMessage(phoneNumber, message);

    console.log('✅ Break phase completed:', {
      sessionId: session.id,
      phoneNumber,
      nextPhase: session.currentPhase,
      timestamp: new Date().toISOString()
    });

    // Schedule work end
    schedulePhaseEnd(phoneNumber, session);
  }
}

/**
 * Get active session for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Session or null
 */
export function getActiveSession(phoneNumber) {
  return activeSessions.get(phoneNumber) || null;
}

/**
 * Stop Pomodoro session
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if stopped
 */
export function stopPomodoro(phoneNumber) {
  const session = activeSessions.get(phoneNumber);
  
  if (!session) return false;

  // Clear timer
  if (session.timer) {
    clearTimeout(session.timer);
  }

  session.status = 'stopped';
  session.stoppedAt = new Date().toISOString();

  activeSessions.delete(phoneNumber);

  console.log('🛑 Pomodoro session stopped:', {
    sessionId: session.id,
    phoneNumber,
    sessionsCompleted: session.sessionsCompleted,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Get Pomodoro statistics for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Statistics
 */
export function getPomodoroStats(phoneNumber) {
  const session = getActiveSession(phoneNumber);
  
  if (!session) {
    return {
      hasActiveSession: false
    };
  }

  const now = new Date();
  const endTime = new Date(session.endTime);
  const remainingMinutes = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 1000 / 60));

  return {
    hasActiveSession: true,
    sessionId: session.id,
    currentPhase: session.currentPhase,
    sessionsCompleted: session.sessionsCompleted,
    workDuration: session.workDuration,
    breakDuration: session.breakDuration,
    remainingMinutes,
    startTime: session.startTime,
    endTime: session.endTime
  };
}

/**
 * Get all active sessions
 * @returns {Array} - Array of active sessions
 */
export function getAllActiveSessions() {
  return Array.from(activeSessions.values());
}

/**
 * Get Pomodoro system statistics
 * @returns {Object} - Statistics
 */
export function getPomodoroSystemStats() {
  const sessions = getAllActiveSessions();
  
  let totalWorkSessions = 0;
  let totalBreakSessions = 0;
  let totalLongBreakSessions = 0;

  sessions.forEach(session => {
    if (session.currentPhase === 'work') totalWorkSessions++;
    if (session.currentPhase === 'break') totalBreakSessions++;
    if (session.currentPhase === 'longBreak') totalLongBreakSessions++;
  });

  return {
    totalActiveSessions: sessions.length,
    totalWorkSessions,
    totalBreakSessions,
    totalLongBreakSessions,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions() {
  activeSessions.forEach(session => {
    if (session.timer) {
      clearTimeout(session.timer);
    }
  });
  activeSessions.clear();
  console.log('🗑️ All Pomodoro sessions cleared');
}
