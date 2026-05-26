/**
 * Smart Extraction Module
 * Automatically extracts goals, schedules, study topics, routines, and preferences
 * from natural conversation
 */

import { getUserMemory, updateUserMemory } from './memoryStore.js';

/**
 * Extract information from user message
 * @param {string} phoneNumber - User's phone number
 * @param {string} message - User's message
 * @returns {Object} - Extracted information
 */
export function extractFromMessage(phoneNumber, message) {
  if (!message || typeof message !== 'string') {
    return { extracted: [] };
  }

  const extracted = [];
  const lowerMessage = message.toLowerCase();

  // Extract study subjects
  const studySubjects = extractStudySubjects(message);
  if (studySubjects.length > 0) {
    extracted.push({ type: 'studySubjects', data: studySubjects });
  }

  // Extract goals
  const goals = extractGoals(message);
  if (goals.length > 0) {
    extracted.push({ type: 'goals', data: goals });
  }

  // Extract preferred study times
  const studyTimes = extractStudyTimes(message);
  if (studyTimes.length > 0) {
    extracted.push({ type: 'preferredStudyTimes', data: studyTimes });
  }

  // Extract focus duration
  const focusDuration = extractFocusDuration(message);
  if (focusDuration) {
    extracted.push({ type: 'focusDuration', data: focusDuration });
  }

  // Extract motivation style
  const motivationStyle = extractMotivationStyle(message);
  if (motivationStyle) {
    extracted.push({ type: 'motivationStyle', data: motivationStyle });
  }

  // Extract response style preference
  const responseStyle = extractResponseStyle(message);
  if (responseStyle) {
    extracted.push({ type: 'responseStyle', data: responseStyle });
  }

  // Update memory with extracted information
  if (extracted.length > 0) {
    updateMemoryWithExtractions(phoneNumber, extracted);
  }

  console.log('🧠 Information extracted from message:', {
    phoneNumber,
    extractedCount: extracted.length,
    extractedTypes: extracted.map(e => e.type),
    timestamp: new Date().toISOString()
  });

  return { extracted };
}

/**
 * Extract study subjects from message
 * @param {string} message - User's message
 * @returns {Array} - Array of study subjects
 */
function extractStudySubjects(message) {
  const subjects = [];
  const lowerMessage = message.toLowerCase();

  // Common study subjects
  const subjectKeywords = [
    'physics', 'chemistry', 'biology', 'mathematics', 'math',
    'english', 'history', 'geography', 'economics',
    'computer science', 'programming', 'coding',
    'calculus', 'algebra', 'geometry', 'statistics',
    'literature', 'philosophy', 'psychology', 'sociology'
  ];

  subjectKeywords.forEach(subject => {
    if (lowerMessage.includes(subject)) {
      subjects.push(subject.charAt(0).toUpperCase() + subject.slice(1));
    }
  });

  return subjects;
}

/**
 * Extract goals from message
 * @param {string} message - User's message
 * @returns {Array} - Array of goals
 */
function extractGoals(message) {
  const goals = [];
  const lowerMessage = message.toLowerCase();

  // Goal indicators
  const goalPatterns = [
    /i want to (.+)/i,
    /i need to (.+)/i,
    /my goal is to (.+)/i,
    /i'm trying to (.+)/i,
    /i'm working on (.+)/i,
    /i plan to (.+)/i
  ];

  goalPatterns.forEach(pattern => {
    const match = message.match(pattern);
    if (match) {
      goals.push(match[1].trim());
    }
  });

  // Specific goal keywords
  if (lowerMessage.includes('pass exam') || lowerMessage.includes('pass test')) {
    goals.push('Pass exams');
  }
  if (lowerMessage.includes('improve grades')) {
    goals.push('Improve grades');
  }
  if (lowerMessage.includes('learn') && lowerMessage.includes('skill')) {
    goals.push('Learn new skills');
  }
  if (lowerMessage.includes('finish project')) {
    goals.push('Finish project');
  }

  return goals;
}

/**
 * Extract preferred study times from message
 * @param {string} message - User's message
 * @returns {Array} - Array of study times
 */
function extractStudyTimes(message) {
  const times = [];
  const lowerMessage = message.toLowerCase();

  // Time patterns
  const timePatterns = [
    /morning/i,
    /afternoon/i,
    /evening/i,
    /night/i,
    /(\d{1,2}:\d{2})/i
  ];

  timePatterns.forEach(pattern => {
    const match = message.match(pattern);
    if (match) {
      times.push(match[0]);
    }
  });

  return times;
}

/**
 * Extract focus duration from message
 * @param {string} message - User's message
 * @returns {number|null} - Focus duration in minutes or null
 */
function extractFocusDuration(message) {
  const lowerMessage = message.toLowerCase();

  // Pattern for X minutes/hours
  const durationMatch = message.match(/(\d+)\s*(minute|min|hour|hr)/i);
  
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    
    if (unit.includes('hour') || unit.includes('hr')) {
      return value * 60;
    }
    return value;
  }

  return null;
}

/**
 * Extract motivation style from message
 * @param {string} message - User's message
 * @returns {string|null} - Motivation style or null
 */
function extractMotivationStyle(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('gentle') || lowerMessage.includes('calm') || lowerMessage.includes('relaxed')) {
    return 'gentle';
  }
  if (lowerMessage.includes('intense') || lowerMessage.includes('push') || lowerMessage.includes('strict')) {
    return 'intense';
  }
  if (lowerMessage.includes('balanced') || lowerMessage.includes('moderate')) {
    return 'balanced';
  }

  return null;
}

/**
 * Extract response style preference from message
 * @param {string} message - User's message
 * @returns {string|null} - Response style or null
 */
function extractResponseStyle(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('short') || lowerMessage.includes('brief') || lowerMessage.includes('concise')) {
    return 'concise';
  }
  if (lowerMessage.includes('detailed') || lowerMessage.includes('explain more') || lowerMessage.includes('elaborate')) {
    return 'detailed';
  }
  if (lowerMessage.includes('balanced') || lowerMessage.includes('normal')) {
    return 'balanced';
  }

  return null;
}

/**
 * Update user memory with extracted information
 * @param {string} phoneNumber - User's phone number
 * @param {Array} extractions - Array of extracted information
 */
function updateMemoryWithExtractions(phoneNumber, extractions) {
  const memory = getUserMemory(phoneNumber);

  if (!memory) {
    return;
  }

  const updates = {};

  extractions.forEach(extraction => {
    switch (extraction.type) {
      case 'studySubjects':
        // Add new subjects without duplicates
        const newSubjects = extraction.data.filter(
          subject => !memory.studySubjects.includes(subject)
        );
        if (newSubjects.length > 0) {
          updates.studySubjects = [...memory.studySubjects, ...newSubjects];
        }
        break;

      case 'goals':
        // Add new goals without duplicates
        const newGoals = extraction.data.filter(
          goal => !memory.goals.includes(goal)
        );
        if (newGoals.length > 0) {
          updates.goals = [...memory.goals, ...newGoals];
        }
        break;

      case 'preferredStudyTimes':
        // Add new times without duplicates
        const newTimes = extraction.data.filter(
          time => !memory.preferredStudyTimes.includes(time)
        );
        if (newTimes.length > 0) {
          updates.preferredStudyTimes = [...memory.preferredStudyTimes, ...newTimes];
        }
        break;

      case 'focusDuration':
        updates.focusDuration = extraction.data;
        break;

      case 'motivationStyle':
        updates.motivationStyle = extraction.data;
        break;

      case 'responseStyle':
        updates.preferences = {
          ...memory.preferences,
          responseStyle: extraction.data
        };
        break;
    }
  });

  if (Object.keys(updates).length > 0) {
    updateUserMemory(phoneNumber, updates);
  }
}
