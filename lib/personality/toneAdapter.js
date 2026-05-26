/**
 * Tone Adapter
 * Dynamically adapts AI tone based on user mood, stress level, and context
 */

import { getCurrentMood, getMoodBasedResponseStyle } from './moodDetector.js';
import { getUserMemory } from '../memory/memoryStore.js';

/**
 * Adapt AI response based on user context
 * @param {string} phoneNumber - User's phone number
 * @param {string} baseResponse - Base AI response
 * @param {Object} context - Additional context
 * @returns {string} - Adapted response
 */
export function adaptTone(phoneNumber, baseResponse, context = {}) {
  const moodInfo = getCurrentMood(phoneNumber);
  const memory = getUserMemory(phoneNumber);
  
  if (!moodInfo && !memory) {
    return baseResponse;
  }

  const mood = moodInfo?.mood || 'neutral';
  const stressLevel = moodInfo?.stressLevel || 'moderate';
  const responseStyle = memory?.preferences?.responseStyle || 'balanced';
  const motivationStyle = memory?.motivationStyle || 'balanced';

  let adaptedResponse = baseResponse;

  // Adapt based on stress level
  if (stressLevel === 'high') {
    adaptedResponse = addGentleTone(adaptedResponse);
  } else if (stressLevel === 'low' && mood === 'motivated') {
    adaptedResponse = addEnergeticTone(adaptedResponse);
  }

  // Adapt based on mood
  adaptedResponse = adaptForMood(adaptedResponse, mood);

  // Adapt based on user's preferred response style
  adaptedResponse = adaptForResponseStyle(adaptedResponse, responseStyle);

  // Adapt based on motivation style
  adaptedResponse = adaptForMotivationStyle(adaptedResponse, motivationStyle);

  // Adapt based on time of day
  adaptedResponse = adaptForTimeOfDay(adaptedResponse);

  return adaptedResponse;
}

/**
 * Add gentle tone to response
 * @param {string} response - Base response
 * @returns {string} - Adapted response
 */
function addGentleTone(response) {
  const gentlePrefixes = [
    'Take your time. ',
    'No rush at all. ',
    'It\'s okay to go at your own pace. ',
    'Remember to breathe. '
  ];

  const gentleSuffixes = [
    ' You\'re doing great, even if it doesn\'t feel like it right now.',
    ' Take care of yourself first.',
    ' Small steps forward are still progress.'
  ];

  const prefix = gentlePrefixes[Math.floor(Math.random() * gentlePrefixes.length)];
  const suffix = gentleSuffixes[Math.floor(Math.random() * gentleSuffixes.length)];

  return prefix + response + suffix;
}

/**
 * Add energetic tone to response
 * @param {string} response - Base response
 * @returns {string} - Adapted response
 */
function addEnergeticTone(response) {
  const energeticPrefixes = [
    'Let\'s go! ',
    'You\'ve got this! ',
    'Time to crush it! ',
    'Amazing energy! '
  ];

  const energeticSuffixes = [
    ' Keep that momentum going!',
    ' You\'re on fire today!',
    ' Let\'s make the most of this energy!'
  ];

  const prefix = energeticPrefixes[Math.floor(Math.random() * energeticPrefixes.length)];
  const suffix = energeticSuffixes[Math.floor(Math.random() * energeticSuffixes.length)];

  return prefix + response + suffix;
}

/**
 * Adapt response for specific mood
 * @param {string} response - Base response
 * @param {string} mood - User's mood
 * @returns {string} - Adapted response
 */
function adaptForMood(response, mood) {
  const moodAdaptations = {
    sad: {
      prefix: 'I understand things are tough right now. ',
      suffix: ' Remember, it\'s okay to not be okay sometimes.'
    },
    stressed: {
      prefix: 'I know you\'re under pressure. ',
      suffix: ' Take it one step at a time.'
    },
    tired: {
      prefix: 'Rest is important too. ',
      suffix: ' Don\'t forget to take care of yourself.'
    },
    frustrated: {
      prefix: 'I hear your frustration. ',
      suffix: ' Let\'s work through this together.'
    },
    motivated: {
      prefix: 'Love the energy! ',
      suffix: ' Keep pushing forward!'
    },
    happy: {
      prefix: 'Great to hear you\'re doing well! ',
      suffix: ' Keep that positive momentum!'
    },
    calm: {
      prefix: '',
      suffix: ' Stay balanced and focused.'
    },
    confused: {
      prefix: 'Let me help clarify. ',
      suffix: ' Don\'t worry, we\'ll figure this out.'
    },
    productive: {
      prefix: 'Excellent progress! ',
      suffix: ' Keep up the great work!'
    }
  };

  const adaptation = moodAdaptations[mood];
  
  if (adaptation) {
    return adaptation.prefix + response + adaptation.suffix;
  }

  return response;
}

/**
 * Adapt response for user's preferred response style
 * @param {string} response - Base response
 * @param {string} responseStyle - User's preferred style
 * @returns {string} - Adapted response
 */
function adaptForResponseStyle(response, responseStyle) {
  switch (responseStyle) {
    case 'concise':
      // Keep it brief
      return response.split('\n').slice(0, 3).join('\n').trim();
    
    case 'detailed':
      // Add more context (simplified for now)
      return response + '\n\nLet me know if you need more details on any of this.';
    
    case 'balanced':
    default:
      return response;
  }
}

/**
 * Adapt response for motivation style
 * @param {string} response - Base response
 * @param {string} motivationStyle - User's motivation style
 * @returns {string} - Adapted response
 */
function adaptForMotivationStyle(response, motivationStyle) {
  switch (motivationStyle) {
    case 'gentle':
      // Soften language
      return response.replace(/!/g, '.').replace(/must/g, 'could').replace(/should/g, 'might want to');
    
    case 'intense':
      // Add more urgency
      return response.replace(/can/g, 'must').replace(/might/g, 'will');
    
    case 'balanced':
    default:
      return response;
  }
}

/**
 * Adapt response for time of day
 * @param {string} response - Base response
 * @returns {string} - Adapted response
 */
function adaptForTimeOfDay(response) {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    // Morning
    return 'Good morning! ' + response;
  } else if (hour >= 12 && hour < 17) {
    // Afternoon
    return response; // No greeting needed
  } else if (hour >= 17 && hour < 21) {
    // Evening
    return 'Good evening! ' + response;
  } else {
    // Night
    return response; // No greeting for late night
  }
}

/**
 * Get tone recommendations for AI
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Tone recommendations
 */
export function getToneRecommendations(phoneNumber) {
  const moodInfo = getCurrentMood(phoneNumber);
  const memory = getUserMemory(phoneNumber);
  
  if (!moodInfo && !memory) {
    return {
      recommendedTone: 'balanced',
      reasoning: 'No user data available'
    };
  }

  const mood = moodInfo?.mood || 'neutral';
  const stressLevel = moodInfo?.stressLevel || 'moderate';
  const responseStyle = memory?.preferences?.responseStyle || 'balanced';

  let recommendedTone = 'balanced';
  let reasoning = [];

  if (stressLevel === 'high') {
    recommendedTone = 'gentle';
    reasoning.push('High stress level detected - using gentle tone');
  } else if (mood === 'motivated' || mood === 'happy') {
    recommendedTone = 'energetic';
    reasoning.push('Positive mood detected - using energetic tone');
  } else if (mood === 'sad' || mood === 'tired') {
    recommendedTone = 'supportive';
    reasoning.push('Negative mood detected - using supportive tone');
  }

  reasoning.push(`User prefers ${responseStyle} responses`);

  return {
    recommendedTone,
    reasoning: reasoning.join('. '),
    mood,
    stressLevel,
    responseStyle
  };
}

/**
 * Format tone information for debugging
 * @param {string} phoneNumber - User's phone number
 * @returns {string} - Formatted tone information
 */
export function formatToneInfo(phoneNumber) {
  const recommendations = getToneRecommendations(phoneNumber);
  
  return `🎭 Tone Adaptation Info:\n\n` +
         `Recommended Tone: ${recommendations.recommendedTone}\n` +
         `Mood: ${recommendations.mood}\n` +
         `Stress Level: ${recommendations.stressLevel}\n` +
         `Response Style: ${recommendations.responseStyle}\n` +
         `Reasoning: ${recommendations.reasoning}`;
}
