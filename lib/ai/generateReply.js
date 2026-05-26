/**
 * AI Reply Generator
 * Generates intelligent AI responses for WhatsApp messages
 * Uses AICredits.in API (OpenAI-compatible) with Notevoro personality
 */

import { getPersonalizedSystemPrompt } from './systemPrompt.js';

const API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.aicredits.in/v1';

/**
 * Generate AI reply using AICredits.in API (OpenAI-compatible)
 * @param {string} userMessage - The user's message
 * @param {string} phoneNumber - User's phone number for logging
 * @param {Array} conversationHistory - Recent conversation history
 * @param {Object} userContext - User's context and preferences
 * @returns {Promise<string|null>} - Generated reply or null on error
 */
export async function generateReply(userMessage, phoneNumber, conversationHistory = [], userContext = null) {
  try {
    if (!userMessage || typeof userMessage !== 'string') {
      console.error('❌ Invalid user message', { phoneNumber });
      return null;
    }

    if (!API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return null;
    }

    console.log('🤖 Generating AI reply:', {
      userMessage,
      phoneNumber,
      historyLength: conversationHistory.length,
      hasUserContext: !!userContext,
      apiBaseUrl: OPENAI_BASE_URL,
      timestamp: new Date().toISOString()
    });

    // Get personalized system prompt
    const systemPrompt = getPersonalizedSystemPrompt(userContext);

    // Build messages array with history
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    console.log('📋 AI API request:', {
      phoneNumber,
      messageCount: messages.length,
      userMessageLength: userMessage.length,
      systemPromptLength: systemPrompt.length,
      apiBaseUrl: OPENAI_BASE_URL,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1
      })
    });

    console.log('📥 AI API response status:', {
      status: response.status,
      statusText: response.statusText,
      phoneNumber,
      timestamp: new Date().toISOString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ AI API error:', {
        status: response.status,
        error: result?.error,
        phoneNumber,
        apiBaseUrl: OPENAI_BASE_URL,
        timestamp: new Date().toISOString()
      });
      
      // Fallback: try with gpt-3.5-turbo if gpt-4-turbo fails
      if (response.status === 401 || response.status === 403) {
        console.log('🔄 Attempting fallback with gpt-3.5-turbo...');
        return await generateReplyWithFallback(userMessage, phoneNumber, conversationHistory, userContext);
      }
      
      return null;
    }

    const aiReply = result.choices?.[0]?.message?.content;

    if (!aiReply) {
      console.error('❌ No content in AI API response', {
        phoneNumber,
        response: result,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // Trim reply if too long for WhatsApp
    const trimmedReply = aiReply.substring(0, 1024);

    console.log('✅ AI reply generated successfully:', {
      phoneNumber,
      replyLength: trimmedReply.length,
      usageTokens: result.usage,
      model: result.model,
      timestamp: new Date().toISOString()
    });

    return trimmedReply;

  } catch (error) {
    console.error('❌ AI generation error:', {
      phoneNumber,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

/**
 * Fallback function using gpt-3.5-turbo
 * @param {string} userMessage - The user's message
 * @param {string} phoneNumber - User's phone number for logging
 * @param {Array} conversationHistory - Recent conversation history
 * @param {Object} userContext - User's context and preferences
 * @returns {Promise<string|null>} - Generated reply or null on error
 */
async function generateReplyWithFallback(userMessage, phoneNumber, conversationHistory = [], userContext = null) {
  try {
    const systemPrompt = getPersonalizedSystemPrompt(userContext);
    
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Fallback AI API error:', {
        status: response.status,
        error: result?.error,
        phoneNumber,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const aiReply = result.choices?.[0]?.message?.content;

    if (!aiReply) {
      console.error('❌ No content in fallback AI API response', {
        phoneNumber,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const trimmedReply = aiReply.substring(0, 1024);

    console.log('✅ Fallback AI reply generated successfully:', {
      phoneNumber,
      replyLength: trimmedReply.length,
      model: 'gpt-3.5-turbo',
      timestamp: new Date().toISOString()
    });

    return trimmedReply;

  } catch (error) {
    console.error('❌ Fallback AI generation error:', {
      phoneNumber,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}
