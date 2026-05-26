/**
 * Study Planner
 * Generates personalized study plans based on user preferences and goals
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';

/**
 * Generate personalized study plan
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Study plan
 */
export function generateStudyPlan(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const subjects = memory.studySubjects || [];
  const goals = memory.goals || [];
  const preferredTimes = memory.preferredStudyTimes || [];
  const focusDuration = memory.focusDuration || 25;
  const weakSubjects = memory.weakSubjects || [];

  // Prioritize weak subjects
  const prioritizedSubjects = [...subjects].sort((a, b) => {
    if (weakSubjects.includes(a) && !weakSubjects.includes(b)) return -1;
    if (!weakSubjects.includes(a) && weakSubjects.includes(b)) return 1;
    return 0;
  });

  // Generate daily schedule
  const dailySchedule = generateDailySchedule(prioritizedSubjects, preferredTimes, focusDuration);

  // Generate weekly plan
  const weeklyPlan = generateWeeklyPlan(prioritizedSubjects, goals, preferredTimes);

  const studyPlan = {
    phoneNumber,
    subjects: prioritizedSubjects,
    weakSubjects,
    goals,
    preferredTimes,
    focusDuration,
    dailySchedule,
    weeklyPlan,
    generatedAt: new Date().toISOString()
  };

  // Save study plan to memory
  updateUserMemory(phoneNumber, { studyPlan });

  console.log('📚 Study plan generated:', {
    phoneNumber,
    subjectCount: subjects.length,
    goalCount: goals.length,
    timestamp: new Date().toISOString()
  });

  return studyPlan;
}

/**
 * Generate daily study schedule
 * @param {Array} subjects - Study subjects
 * @param {Array} preferredTimes - Preferred study times
 * @param {number} focusDuration - Focus duration in minutes
 * @returns {Array} - Daily schedule
 */
function generateDailySchedule(subjects, preferredTimes, focusDuration) {
  const schedule = [];
  
  if (subjects.length === 0) {
    return schedule;
  }

  // Default times if none specified
  const times = preferredTimes.length > 0 ? preferredTimes : ['morning', 'afternoon', 'evening'];
  
  // Distribute subjects across time slots
  subjects.forEach((subject, index) => {
    const timeSlot = times[index % times.length];
    schedule.push({
      subject,
      timeSlot,
      duration: focusDuration,
      breakAfter: 5,
      priority: index === 0 ? 'high' : 'medium'
    });
  });

  return schedule;
}

/**
 * Generate weekly study plan
 * @param {Array} subjects - Study subjects
 * @param {Array} goals - User goals
 * @param {Array} preferredTimes - Preferred study times
 * @returns {Object} - Weekly plan
 */
function generateWeeklyPlan(subjects, goals, preferredTimes) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklyPlan = {};

  days.forEach(day => {
    // Rotate subjects each day
    const daySubjects = subjects.map((subject, index) => {
      const dayIndex = days.indexOf(day);
      const rotatedIndex = (index + dayIndex) % subjects.length;
      return subjects[rotatedIndex];
    });

    weeklyPlan[day] = {
      subjects: daySubjects,
      focusTime: preferredTimes.length > 0 ? preferredTimes[0] : 'morning',
      totalSessions: Math.max(2, subjects.length),
      goals: goals.slice(0, 2) // Focus on top 2 goals per day
    };
  });

  return weeklyPlan;
}

/**
 * Get study plan for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Study plan or null
 */
export function getStudyPlan(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  return memory.studyPlan || null;
}

/**
 * Get today's study schedule
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Today's schedule or null
 */
export function getTodaySchedule(phoneNumber) {
  const studyPlan = getStudyPlan(phoneNumber);
  
  if (!studyPlan) {
    return null;
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  
  return studyPlan.weeklyPlan[today] || null;
}

/**
 * Format study plan for WhatsApp message
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted study plan
 */
export function formatStudyPlan(phoneNumber) {
  const studyPlan = getStudyPlan(phoneNumber);
  
  if (!studyPlan) {
    return 'No study plan found. Use /studyplan to generate one!';
  }

  let message = '📚 Your Personalized Study Plan\n\n';
  
  message += `📖 Subjects:\n`;
  studyPlan.subjects.forEach((subject, index) => {
    const priority = studyPlan.dailySchedule[index]?.priority || 'medium';
    const icon = studyPlan.weakSubjects.includes(subject) ? '⚠️' : '✅';
    message += `${icon} ${subject} (Priority: ${priority})\n`;
  });
  
  message += `\n⏰ Daily Schedule:\n`;
  studyPlan.dailySchedule.forEach((slot, index) => {
    message += `${index + 1}. ${slot.subject} - ${slot.timeSlot} (${slot.duration} min)\n`;
  });
  
  message += `\n🎯 Goals:\n`;
  studyPlan.goals.forEach((goal, index) => {
    message += `${index + 1}. ${goal}\n`;
  });

  return message;
}

/**
 * Update study subjects
 * @param {string} phoneNumber - User's phone number
 * @param {Array} subjects - New subjects list
 * @returns {Object} - Updated memory
 */
export function updateStudySubjects(phoneNumber, subjects) {
  return updateUserMemory(phoneNumber, { studySubjects: subjects });
}

/**
 * Add study subject
 * @param {string} phoneNumber - User's phone number
 * @param {string} subject - Subject to add
 * @returns {Object} - Updated memory
 */
export function addStudySubject(phoneNumber, subject) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const subjects = memory.studySubjects || [];
  
  if (!subjects.includes(subject)) {
    subjects.push(subject);
    return updateUserMemory(phoneNumber, { studySubjects: subjects });
  }

  return memory;
}

/**
 * Mark subject as weak
 * @param {string} phoneNumber - User's phone number
 * @param {string} subject - Subject to mark as weak
 * @returns {Object} - Updated memory
 */
export function markWeakSubject(phoneNumber, subject) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return null;
  }

  const weakSubjects = memory.weakSubjects || [];
  
  if (!weakSubjects.includes(subject)) {
    weakSubjects.push(subject);
    return updateUserMemory(phoneNumber, { weakSubjects });
  }

  return memory;
}
