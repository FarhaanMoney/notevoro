/**
 * Mood Detector
 * Analyzes user messages to detect mood and emotional state
 */

import { getUserMemory, updateUserMemory } from '../memory/memoryStore.js';

/**
 * Detect mood from message
 * @param {string} message - User's message
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Detected mood information
 */
export function detectMood(message, phoneNumber) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const lowerMessage = message.toLowerCase();
  
  // Mood indicators
  const moodIndicators = {
    happy: ['happy', 'great', 'awesome', 'excited', 'amazing', 'love', 'fantastic', 'wonderful', 'joy', 'celebrate'],
    sad: ['sad', 'depressed', 'unhappy', 'down', 'upset', 'cry', 'disappointed', 'hurt', 'lonely'],
    stressed: ['stressed', 'overwhelmed', 'anxious', 'worried', 'pressure', 'deadline', 'panic', 'nervous'],
    tired: ['tired', 'exhausted', 'sleepy', 'fatigue', 'burnout', 'drained', 'weary'],
    motivated: ['motivated', 'excited', 'ready', 'energized', 'focused', 'determined', 'driven'],
    frustrated: ['frustrated', 'annoyed', 'irritated', 'angry', 'upset', 'mad', 'stuck'],
    calm: ['calm', 'relaxed', 'peaceful', 'zen', 'chill', 'balanced', 'centered'],
    confused: ['confused', 'lost', 'uncertain', 'unsure', 'don\'t understand', 'help'],
    productive: ['productive', 'accomplished', 'finished', 'done', 'completed', 'progress']
  };

  let detectedMood = 'neutral';
  let confidence = 0;
  const matchedIndicators = [];

  // Check each mood category
  for (const [mood, indicators] of Object.entries(moodIndicators)) {
    const matches = indicators.filter(indicator => lowerMessage.includes(indicator));
    
    if (matches.length > 0) {
      detectedMood = mood;
      confidence = Math.min(100, matches.length * 25);
      matchedIndicators.push(...matches);
    }
  }

  // Analyze message length and punctuation
  const exclamationCount = (message.match(/!/g) || []).length;
  const questionCount = (message.match(/\?/g) || []).length;
  const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;

  // Adjust confidence based on message characteristics
  if (exclamationCount > 2) {
    confidence = Math.min(100, confidence + 15);
  }
  if (capsRatio > 0.5) {
    confidence = Math.min(100, confidence + 10);
  }

  // Store mood in memory
  storeMood(phoneNumber, detectedMood, confidence, message);

  const moodInfo = {
    mood: detectedMood,
    confidence,
    indicators: matchedIndicators,
    messageLength: message.length,
    timestamp: new Date().toISOString()
  };

  console.log('🎭 Mood detected:', {
    phoneNumber,
    mood: detectedMood,
    confidence,
    indicators: matchedIndicators,
    timestamp: new Date().toISOString()
  });

  return moodInfo;
}

/**
 * Store mood in user memory
 * @param {string} phoneNumber - User's phone number
 * @param {string} mood - Detected mood
 * @param {number} confidence - Confidence score
 * @param {string} message - Original message
 */
function storeMood(phoneNumber, mood, confidence, message) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory) {
    return;
  }

  const moodEntry = {
    mood,
    confidence,
    message: message.substring(0, 100), // Store truncated message
    timestamp: new Date().toISOString()
  };

  // Initialize mood history if not exists
  if (!memory.emotionalPatterns) {
    memory.emotionalPatterns = {
      stressLevel: 'moderate',
      moodHistory: [],
      stressTriggers: [],
      copingMechanisms: []
    };
  }

  // Add to mood history
  memory.emotionalPatterns.moodHistory.push(moodEntry);

  // Keep only last 50 mood entries
  if (memory.emotionalPatterns.moodHistory.length > 50) {
    memory.emotionalPatterns.moodHistory = memory.emotionalPatterns.moodHistory.slice(-50);
  }

  // Update stress level based on recent moods
  updateStressLevel(memory);

  updateUserMemory(phoneNumber, { emotionalPatterns: memory.emotionalPatterns });
}

/**
 * Update stress level based on mood history
 * @param {Object} memory - User memory
 */
function updateStressLevel(memory) {
  const moodHistory = memory.emotionalPatterns?.moodHistory || [];
  
  if (moodHistory.length < 3) {
    return;
  }

  // Get last 10 moods
  const recentMoods = moodHistory.slice(-10);
  
  // Count stress-related moods
  const stressMoods = recentMoods.filter(m => 
    ['stressed', 'frustrated', 'tired', 'sad'].includes(m.mood)
  ).length;

  const totalMoods = recentMoods.length;
  const stressRatio = stressMoods / totalMoods;

  if (stressRatio > 0.6) {
    memory.emotionalPatterns.stressLevel = 'high';
  } else if (stressRatio > 0.3) {
    memory.emotionalPatterns.stressLevel = 'moderate';
  } else {
    memory.emotionalPatterns.stressLevel = 'low';
  }
}

/**
 * Get current mood for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Current mood information
 */
export function getCurrentMood(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory || !memory.emotionalPatterns) {
    return null;
  }

  const moodHistory = memory.emotionalPatterns.moodHistory || [];
  
  if (moodHistory.length === 0) {
    return null;
  }

  const latestMood = moodHistory[moodHistory.length - 1];

  return {
    mood: latestMood.mood,
    confidence: latestMood.confidence,
    stressLevel: memory.emotionalPatterns.stressLevel,
    timestamp: latestMood.timestamp
  };
}

/**
 * Get mood trends for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Mood trend analysis
 */
export function getMoodTrends(phoneNumber) {
  const memory = getUserMemory(phoneNumber);
  
  if (!memory || !memory.emotionalPatterns) {
    return null;
  }

  const moodHistory = memory.emotionalPatterns.moodHistory || [];
  
  if (moodHistory.length < 5) {
    return null;
  }

  // Get last 7 days of moods
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentMoods = moodHistory.filter(m => 
    new Date(m.timestamp) >= sevenDaysAgo
  );

  // Count mood frequencies
  const moodCounts = {};
  recentMoods.forEach(m => {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  });

  // Find most common mood
  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    mostCommonMood: mostCommonMood ? mostCommonMood[0] : 'neutral',
    moodCounts,
    totalEntries: recentMoods.length,
    stressLevel: memory.emotionalPatterns.stressLevel,
    period: '7 days'
  };
}

/**
 * Get mood-based response style
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Recommended response style
 */
export function getMoodBasedResponseStyle(phoneNumber) {
  const currentMood = getCurrentMood(phoneNumber);
  
  if (!currentMood) {
    return 'balanced';
  }

  const mood = currentMood.mood;
  const stressLevel = currentMood.stressLevel;

  // Adjust response style based on mood and stress
  if (stressLevel === 'high' || mood === 'stressed' || mood === 'frustrated') {
    return 'gentle';
  }
  
  if (mood === 'sad') {
    return 'supportive';
  }
  
  if (mood === 'motivated' || mood === 'happy') {
    return 'energetic';
  }
  
  if (mood === 'calm') {
    return 'balanced';
  }

  return 'balanced';
}
