// WhatsApp Cloud API Webhook Utilities
// Meta Business Platform integration for Notevoro

// Webhook signature verification
export const webhookVerification = {
  // Generate webhook challenge response
  generateChallengeResponse(challenge, verifyToken) {
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'x-hub-challenge': challenge
      },
      body: challenge
    };
  },

  // Verify webhook signature
  verifySignature(payload, signature, appSecret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', JSON.stringify(payload), appSecret)
      .digest('base64');
    
    return crypto.timingSafeEqual(expectedSignature, signature);
  },

  // Validate webhook payload structure
  validatePayload(payload) {
    try {
      // Basic structure validation
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Invalid payload structure' };
      }

      // Check for required fields
      if (!payload.object) {
        return { valid: false, error: 'Missing object field' };
      }

      // Validate entry structure
      if (!payload.entry || !Array.isArray(payload.entry)) {
        return { valid: false, error: 'Invalid entry structure' };
      }

      // Validate changes structure
      for (const entry of payload.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) {
          return { valid: false, error: 'Invalid changes structure' };
        }

        for (const change of entry.changes) {
          if (!change.field || !change.value) {
            return { valid: false, error: 'Invalid change structure' };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
};

// Message processing utilities
export const messageProcessor = {
  // Extract message content
  extractMessageData(messageData) {
    const extracted = {
      senderPhone: messageData.from,
      messageText: messageData.text?.body || '',
      messageType: messageData.type,
      timestamp: messageData.timestamp,
      metadata: {
        hasMedia: !!messageData.image || !!messageData.document,
        isReply: !!messageData.context?.forwarded,
        isGroup: messageData.from?.includes('@g.us'),
        hasLocation: !!messageData.location,
        isInteractive: !!messageData.interactive,
        isSystemMessage: messageData.from?.includes('@g.us') && messageData.type === 'system'
      }
    };

    return extracted;
  },

  // Process different message types
  processMessageType(messageData, extracted) {
    switch (extracted.messageType) {
      case 'text':
        return {
          category: 'user_message',
          priority: 'normal',
          action: 'respond'
        };
        
      case 'image':
        return {
          category: 'media_message',
          priority: 'normal',
          action: 'analyze',
          mediaType: 'image',
          mediaUrl: messageData.image
        };
        
      case 'document':
        return {
          category: 'media_message',
          priority: 'normal',
          action: 'analyze',
          mediaType: 'document',
          mediaUrl: messageData.document
        };
        
      case 'interactive':
        return {
          category: 'interactive_message',
          priority: 'high',
          action: 'respond',
          interactionType: messageData.interactive?.type,
          interactionData: messageData.interactive
        };
        
      case 'system':
        return {
          category: 'system_message',
          priority: 'low',
          action: 'log',
          systemType: messageData.type
        };
        
      default:
        return {
          category: 'unknown_message',
          priority: 'normal',
          action: 'log'
        };
    }
  },

  // Generate AI response context
  generateAIContext(messageData, extracted) {
    const context = {
      messageSource: 'whatsapp',
      senderPhone: extracted.senderPhone,
      messageContent: extracted.messageText,
      messageType: extracted.messageType,
      timestamp: extracted.timestamp,
      metadata: extracted.metadata,
      processedAt: new Date().toISOString()
    };

    return context;
  },

  // Determine if message requires AI response
  requiresAIResponse(messageData, extracted) {
    // Check if message is from user (not system)
    if (extracted.metadata.isSystemMessage) {
      return false;
    }

    // Check if message is asking for help or study-related
    const studyKeywords = [
      'study', 'learn', 'homework', 'assignment', 'exam', 'test', 'quiz', 'notes', 'focus', 'timer', 'streak', 'goal', 'plan', 'schedule'
    ];

    const messageText = (extracted.messageText || '').toLowerCase();
    const hasStudyKeyword = studyKeywords.some(keyword => messageText.includes(keyword));

    // Check if message is a question
    const questionIndicators = ['?', 'how', 'what', 'when', 'where', 'why', 'help', 'can', 'could', 'would', 'should'];
    const isQuestion = questionIndicators.some(indicator => messageText.includes(indicator));

    // Check if message is asking about Notevoro features
    const notevoroKeywords = [
      'notevoro', 'companion', 'ai', 'chat', 'assistant', 'reminder', 'checkin', 'streak', 'timer', 'focus'
    ];

    const hasNotevoroKeyword = notevoroKeywords.some(keyword => messageText.includes(keyword));

    return hasStudyKeyword || isQuestion || hasNotevoroKeyword;
  },

  // Generate response suggestions
  generateResponseSuggestions(messageData, extracted) {
    const suggestions = [];

    // Study-related responses
    if (extracted.messageType === 'text') {
      const messageText = extracted.messageText.toLowerCase();
      
      if (messageText.includes('study') || MessageText.includes('focus')) {
        suggestions.push('Start a focus session? Use the timer feature!');
      }
      
      if (MessageText.includes('streak')) {
        suggestions.push('Your current streak is available in the dashboard!');
      }
      
      if (MessageText.includes('reminder')) {
        suggestions.push('You can set reminders in the dashboard!');
      }
      
      if (MessageText.includes('goal')) {
        suggestions.push('Set your daily study goal in the check-in!');
      }
    }

    // Media-related responses
    if (extracted.messageType === 'image' || extracted.messageType === 'document') {
      suggestions.push('I can analyze this content for your studies!');
    }

    // Interactive responses
    if (extracted.messageType === 'interactive') {
      suggestions.push('I can help you with study planning!');
    }

    return suggestions;
  }
};

// Database utilities
export const databaseUtils = {
  // Log WhatsApp message for future AI integration
  async logWhatsAppMessage(messageData, extracted, processed) {
    try {
      const logEntry = {
        id: require('crypto').randomUUID(),
        timestamp: new Date().toISOString(),
        source: 'whatsapp',
        sender_phone: extracted.senderPhone,
        message_type: extracted.messageType,
        message_content: extracted.messageText,
        metadata: extracted.metadata,
        processed: processed || false,
        ai_response: null,
        created_at: new Date().toISOString()
      };

      console.log('WhatsApp message logged:', logEntry);
      
      // Future: Save to database
      // await saveWhatsAppMessageToDatabase(logEntry);
      
      return logEntry;
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
      throw error;
    }
  },

  // Get user's WhatsApp history
  async getWhatsAppHistory(userId, limit = 50) {
    try {
      // Future: Implement database query
      // const history = await getWhatsAppMessagesFromDatabase(userId, limit);
      // return history;
      
      return [];
    } catch (error) {
      console.error('Error getting WhatsApp history:', error);
      return [];
    }
  },

  // Save AI response for WhatsApp
  async saveAIResponse(messageId, response, context) {
    try {
      const aiResponse = {
        id: require('crypto').randomUUID(),
        message_id: messageId,
        response_content: response,
        response_context: context,
        created_at: new Date().toISOString(),
        processed: false
      };

      console.log('AI response saved:', aiResponse);
      
      // Future: Save to database
      // await saveAIResponseToDatabase(aiResponse);
      
      return aiResponse;
    } catch (error) {
      console.error('Error saving AI response:', error);
      throw error;
    }
  }
};

// WhatsApp API utilities
export const whatsappAPI = {
  // Send message via WhatsApp Cloud API
  async sendMessage(to, message, messageType = 'text') {
    try {
      // This would use WHATSAPP_ACCESS_TOKEN
      // For now, just log the attempt
      console.log('WhatsApp message send attempt:', {
        to,
        message,
        messageType,
        timestamp: new Date().toISOString()
      });

      // Future implementation:
      // const response = await fetch('https://graph.facebook.com/v18.0/...', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     messaging_product: 'whatsapp',
      //     to: to,
      //     type: messageType,
      //     text: message
      //   })
      // });

      // return await response.json();
      
      return { success: true, message: 'Message logged for future sending' };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  },

  // Get WhatsApp business account info
  async getBusinessInfo() {
    try {
      // Future implementation using WHATSAPP_ACCESS_TOKEN
      console.log('Getting WhatsApp business info...');
      
      return {
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        verified_name: 'Notevoro AI',
        display_phone_number: '+1234567890'
      };
    } catch (error) {
      console.error('Error getting business info:', error);
      return null;
    }
  }
};
