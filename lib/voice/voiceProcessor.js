/**
 * Voice Note Processor
 * Handles WhatsApp voice note transcription and AI processing
 */

import { getUserByPhone } from '../auth/userManager.js';
import { getUserMemoryDB, updateUserMemoryDB } from '../database/memoryStore.js';
import { sendWhatsAppMessage } from '../whatsapp/sendMessage.js';
import { checkEnergyAccess, consumeEnergyForAction } from '../auth/accessControl.js';

/**
 * Process voice note from WhatsApp
 * @param {string} phoneNumber - User's phone number
 * @param {string} mediaUrl - Voice note media URL
 * @returns {string} - AI response
 */
export async function processVoiceNote(phoneNumber, mediaUrl) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return 'Please connect your WhatsApp to Notevoro to use voice features.';
  }

  // Check energy for voice transcription
  const energyCheck = await checkEnergyAccess(phoneNumber, 'VOICE_TRANSCRIPTION');
  if (!energyCheck.allowed) {
    return `⚡ Not enough AI Energy for voice transcription. You have ${energyCheck.energyRemaining}/${energyCheck.energyMax} ⚡ remaining.`;
  }

  // Check feature access
  if (user.subscriptionPlan === 'free') {
    return '🔒 Voice notes are a Pro feature. Upgrade to Pro to use voice transcription.';
  }

  try {
    // Transcribe voice note
    const transcription = await transcribeVoiceNote(mediaUrl);
    
    if (!transcription) {
      return 'Sorry, I couldn\'t transcribe your voice note. Please try again.';
    }

    // Consume energy
    await consumeEnergyForAction(phoneNumber, 'VOICE_TRANSCRIPTION');

    // Process transcription with AI
    const aiResponse = await processVoiceTranscription(user.id, transcription);

    return aiResponse;

  } catch (error) {
    console.error('❌ Voice note processing error:', error);
    return 'Sorry, there was an error processing your voice note. Please try again.';
  }
}

/**
 * Transcribe voice note using speech-to-text
 * @param {string} mediaUrl - Voice note media URL
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeVoiceNote(mediaUrl) {
  // In production, this would use OpenAI Whisper, Google Speech-to-Text, or similar
  // For now, return a placeholder
  
  console.log('🎤 Transcribing voice note:', { mediaUrl });
  
  // Placeholder - in production:
  // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     url: mediaUrl,
  //     model: 'whisper-1'
  //   })
  // });
  // const data = await response.json();
  // return data.text;
  
  return null; // Placeholder
}

/**
 * Process voice transcription with AI
 * @param {string} userId - User ID
 * @param {string} transcription - Transcribed text
 * @returns {Promise<string>} - AI response
 */
async function processVoiceTranscription(userId, transcription) {
  const memory = getUserMemoryDB(userId);
  
  // Extract goals, tasks, and insights from transcription
  const extracted = extractFromVoiceText(transcription);
  
  // Update memory with extracted data
  if (extracted.goals.length > 0) {
    const currentGoals = memory.goals || [];
    const updatedGoals = [...currentGoals, ...extracted.goals];
    updateUserMemoryDB(userId, { goals: updatedGoals });
  }

  if (extracted.tasks.length > 0) {
    const currentTasks = memory.tasks || [];
    const updatedTasks = [...currentTasks, ...extracted.tasks];
    updateUserMemoryDB(userId, { tasks: updatedTasks });
  }

  // Generate AI response
  const response = generateVoiceResponse(extracted, memory);
  
  return response;
}

/**
 * Extract goals, tasks, and insights from voice text
 * @param {string} text - Transcribed text
 * @returns {Object} - Extracted data
 */
function extractFromVoiceText(text) {
  const lowerText = text.toLowerCase();
  
  const goals = [];
  const tasks = [];
  const mood = detectMoodFromText(text);
  
  // Extract goals
  const goalKeywords = ['goal', 'want to', 'need to', 'plan to', 'aim to'];
  goalKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]/);
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes(keyword)) {
          goals.push(sentence.trim());
        }
      });
    }
  });

  // Extract tasks
  const taskKeywords = ['task', 'todo', 'need to do', 'have to', 'must'];
  taskKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      const sentences = text.split(/[.!?]/);
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes(keyword)) {
          tasks.push(sentence.trim());
        }
      });
    }
  });

  return {
    goals: goals.slice(0, 3),
    tasks: tasks.slice(0, 5),
    mood,
    originalText: text
  };
}

/**
 * Detect mood from voice text
 * @param {string} text - Transcribed text
 * @returns {string} - Detected mood
 */
function detectMoodFromText(text) {
  const lowerText = text.toLowerCase();
  
  const moodIndicators = {
    happy: ['happy', 'great', 'excited', 'awesome', 'love'],
    stressed: ['stressed', 'overwhelmed', 'anxious', 'worried', 'pressure'],
    tired: ['tired', 'exhausted', 'sleepy', 'fatigue'],
    motivated: ['motivated', 'excited', 'ready', 'energized'],
    frustrated: ['frustrated', 'annoyed', 'irritated', 'angry']
  };

  for (const [mood, indicators] of Object.entries(moodIndicators)) {
    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        return mood;
      }
    }
  }

  return 'neutral';
}

/**
 * Generate AI response to voice note
 * @param {Object} extracted - Extracted data
 * @param {Object} memory - User memory
 * @returns {string} - AI response
 */
function generateVoiceResponse(extracted, memory) {
  let response = `🎤 Voice note received!\n\n`;
  
  if (extracted.mood !== 'neutral') {
    response += `I noticed you're feeling ${extracted.mood}. `;
  }

  if (extracted.goals.length > 0) {
    response += `\n🎯 Goals I heard:\n`;
    extracted.goals.forEach((goal, i) => {
      response += `${i + 1}. ${goal}\n`;
    });
    response += `\nI've added these to your goals.\n`;
  }

  if (extracted.tasks.length > 0) {
    response += `\n✅ Tasks I heard:\n`;
    extracted.tasks.forEach((task, i) => {
      response += `${i + 1}. ${task}\n`;
    });
    response += `\nI've added these to your tasks.\n`;
  }

  response += `\n💡 Here's what I can help with:\n`;
  response += `• Set reminders for these tasks\n`;
  response += `• Create a study plan\n`;
  response += `• Start a focus session\n\n`;
  response += `Just let me know what you'd like to do!`;

  return response;
}

/**
 * Get voice note status
 * @param {string} phoneNumber - Phone number
 * @returns {Object} - Voice feature status
 */
export function getVoiceFeatureStatus(phoneNumber) {
  const user = getUserByPhone(phoneNumber);
  
  if (!user) {
    return {
      available: false,
      reason: 'not_verified'
    };
  }

  const hasAccess = user.subscriptionPlan !== 'free';
  
  return {
    available: hasAccess,
    plan: user.subscriptionPlan,
    energyCost: 6,
    features: hasAccess ? ['transcription', 'ai_processing', 'goal_extraction'] : []
  };
}

/**
 * Format voice feature denial message
 * @param {string} phoneNumber - Phone number
 * @returns {string} - Denial message
 */
export function formatVoiceDenialMessage(phoneNumber) {
  const status = getVoiceFeatureStatus(phoneNumber);
  
  if (!status.available) {
    return `🔒 Voice notes are a Pro feature.\n\nUpgrade to Pro to:\n• Transcribe voice notes\n• Extract goals and tasks\n• AI-powered voice processing\n\nnotevoro.com/upgrade`;
  }

  return 'Voice notes are available with your current plan.';
}
