/**
 * Memory Store
 * In-memory Map-based storage for user memory and preferences
 * Designed for easy migration to PostgreSQL/Supabase/Redis
 */

// In-memory storage (keyed by phone number)
const userMemoryStore = new Map();

/**
 * Initialize user memory storage
 * @param {string} phoneNumber - User's phone number (unique ID)
 * @returns {Object} - User memory object
 */
export function initializeUserMemory(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    console.error('❌ Invalid phone number for memory initialization');
    return null;
  }

  if (userMemoryStore.has(phoneNumber)) {
    console.log('📦 User memory already exists:', { phoneNumber });
    return userMemoryStore.get(phoneNumber);
  }

  const userMemory = {
    phoneNumber,
    name: null,
    studySubjects: [],
    weakSubjects: [],
    goals: [],
    routines: [],
    preferredStudyTimes: [],
    focusDuration: 25, // default 25 minutes (Pomodoro)
    motivationStyle: 'balanced', // gentle, intense, balanced
    conversationHistory: [],
    streakCount: 0,
    lastInteraction: null,
    reminders: [],
    productivityStats: {
      totalSessions: 0,
      totalFocusMinutes: 0,
      tasksCompleted: 0,
      lastActiveDate: null
    },
    preferences: {
      responseStyle: 'balanced', // concise, detailed, balanced
      notificationTime: '09:00',
      timezone: null
    },
    // Advanced memory features
    emotionalPatterns: {
      stressLevel: 'moderate', // low, moderate, high
      moodHistory: [],
      stressTriggers: [],
      copingMechanisms: []
    },
    energyLevels: {
      peakHours: [], // times when user is most productive
      lowEnergyTimes: [],
      averageEnergyLevel: 'moderate',
      energyHistory: []
    },
    productivityHabits: {
      mostProductiveDay: null,
      averageDailyFocusMinutes: 0,
      preferredSessionLength: 25,
      breakPreferences: 'short', // short, medium, long
      workEnvironment: null
    },
    sleepSchedule: {
      bedTime: null,
      wakeTime: null,
      averageSleepHours: 7,
      sleepQuality: 'good' // poor, fair, good, excellent
    },
    learningPatterns: {
      learningStyle: 'visual', // visual, auditory, kinesthetic, reading
      difficultySubjects: [],
      preferredTeachingMethod: 'explanation',
      retentionRate: 'moderate'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  userMemoryStore.set(phoneNumber, userMemory);

  console.log('✅ User memory initialized:', {
    phoneNumber,
    timestamp: new Date().toISOString()
  });

  return userMemory;
}

/**
 * Get user memory
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} - User memory object or null
 */
export function getUserMemory(phoneNumber) {
  if (!phoneNumber) {
    return null;
  }

  const memory = userMemoryStore.get(phoneNumber);

  if (!memory) {
    console.log('📦 User memory not found:', { phoneNumber });
    return null;
  }

  console.log('📦 User memory retrieved:', {
    phoneNumber,
    hasName: !!memory.name,
    studySubjectsCount: memory.studySubjects.length,
    goalsCount: memory.goals.length,
    conversationHistoryCount: memory.conversationHistory.length,
    timestamp: new Date().toISOString()
  });

  return memory;
}

/**
 * Update user memory
 * @param {string} phoneNumber - User's phone number
 * @param {Object} updates - Fields to update
 * @returns {Object|null} - Updated user memory or null
 */
export function updateUserMemory(phoneNumber, updates) {
  const memory = userMemoryStore.get(phoneNumber);

  if (!memory) {
    console.error('❌ Cannot update non-existent user memory:', { phoneNumber });
    return null;
  }

  // Merge updates
  const updatedMemory = {
    ...memory,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  userMemoryStore.set(phoneNumber, updatedMemory);

  console.log('✅ User memory updated:', {
    phoneNumber,
    updatedFields: Object.keys(updates),
    timestamp: new Date().toISOString()
  });

  return updatedMemory;
}

/**
 * Delete user memory
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if deleted
 */
export function deleteUserMemory(phoneNumber) {
  const deleted = userMemoryStore.delete(phoneNumber);

  if (deleted) {
    console.log('🗑️ User memory deleted:', { phoneNumber });
  }

  return deleted;
}

/**
 * Get all users in memory store
 * @returns {Array} - Array of all user memories
 */
export function getAllUserMemories() {
  return Array.from(userMemoryStore.values());
}

/**
 * Get memory store statistics
 * @returns {Object} - Statistics
 */
export function getMemoryStoreStats() {
  const memories = getAllUserMemories();

  return {
    totalUsers: memories.length,
    usersWithNames: memories.filter(m => m.name).length,
    usersWithGoals: memories.filter(m => m.goals.length > 0).length,
    usersWithStudySubjects: memories.filter(m => m.studySubjects.length > 0).length,
    totalConversationMessages: memories.reduce((sum, m) => sum + m.conversationHistory.length, 0),
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all memory (for testing)
 */
export function clearAllMemory() {
  const count = userMemoryStore.size;
  userMemoryStore.clear();
  console.log('🗑️ All memory cleared:', { count });
}
