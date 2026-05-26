/**
 * Conversation History Manager
 * Manages conversation history for users (last 20 messages)
 */

import { getUserMemory, updateUserMemory } from './memoryStore.js';

const MAX_HISTORY_LENGTH = 20;

/**
 * Add message to conversation history
 * @param {string} phoneNumber - User's phone number
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @returns {Object|null} - Updated memory or null
 */
export function addToConversationHistory(phoneNumber, role, content) {
  const memory = getUserMemory(phoneNumber);

  if (!memory) {
    console.error('❌ Cannot add to history - user memory not found:', { phoneNumber });
    return null;
  }

  const message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };

  // Add new message
  memory.conversationHistory.push(message);

  // Keep only last MAX_HISTORY_LENGTH messages
  if (memory.conversationHistory.length > MAX_HISTORY_LENGTH) {
    memory.conversationHistory = memory.conversationHistory.slice(-MAX_HISTORY_LENGTH);
  }

  // Update memory
  const updatedMemory = updateUserMemory(phoneNumber, {
    conversationHistory: memory.conversationHistory,
    lastInteraction: new Date().toISOString()
  });

  console.log('💬 Message added to conversation history:', {
    phoneNumber,
    role,
    contentLength: content.length,
    historyLength: memory.conversationHistory.length,
    timestamp: new Date().toISOString()
  });

  return updatedMemory;
}

/**
 * Get conversation history for AI context
 * @param {string} phoneNumber - User's phone number
 * @param {number} limit - Optional limit (default: all)
 * @returns {Array} - Conversation history array
 */
export function getConversationHistory(phoneNumber, limit = null) {
  const memory = getUserMemory(phoneNumber);

  if (!memory) {
    return [];
  }

  const history = memory.conversationHistory || [];

  if (limit && limit > 0) {
    return history.slice(-limit);
  }

  return history;
}

/**
 * Get conversation history in OpenAI format
 * @param {string} phoneNumber - User's phone number
 * @param {number} limit - Optional limit (default: all)
 * @returns {Array} - Array of message objects with role and content
 */
export function getConversationHistoryForAI(phoneNumber, limit = null) {
  const history = getConversationHistory(phoneNumber, limit);

  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Clear conversation history
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - Updated memory or null
 */
export function clearConversationHistory(phoneNumber) {
  const memory = getUserMemory(phoneNumber);

  if (!memory) {
    return null;
  }

  const updatedMemory = updateUserMemory(phoneNumber, {
    conversationHistory: []
  });

  console.log('🗑️ Conversation history cleared:', {
    phoneNumber,
    timestamp: new Date().toISOString()
  });

  return updatedMemory;
}

/**
 * Get recent conversation summary
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} - Summary object
 */
export function getConversationSummary(phoneNumber) {
  const memory = getUserMemory(phoneNumber);

  if (!memory) {
    return null;
  }

  const history = memory.conversationHistory || [];

  return {
    phoneNumber,
    totalMessages: history.length,
    userMessages: history.filter(m => m.role === 'user').length,
    assistantMessages: history.filter(m => m.role === 'assistant').length,
    lastMessage: history[history.length - 1] || null,
    lastInteraction: memory.lastInteraction,
    timestamp: new Date().toISOString()
  };
}
