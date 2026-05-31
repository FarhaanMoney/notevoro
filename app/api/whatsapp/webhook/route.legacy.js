import { NextResponse } from 'next/server';
import crypto from 'crypto';

// WhatsApp Cloud API Webhook Handler
// Meta Business Platform webhook verification and message receiving

// Environment Variables (from Vercel)
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Import AI modules
import { sendWhatsAppMessage } from '../../../../lib/whatsapp/sendMessage.js';
import { generateReply } from '../../../../lib/ai/generateReply.js';
import { consumeLinkingToken } from '../../../../lib/auth/whatsappLinking.js';
import { startProTrialDb } from '../../../../lib/subscription/trialManagerDb.js';

// Import memory modules
import { initializeUserMemory, getUserMemory, updateUserMemory } from '../../../../lib/memory/memoryStore.js';
import { addToConversationHistory, getConversationHistoryForAI } from '../../../../lib/memory/conversationHistory.js';
import { extractFromMessage } from '../../../../lib/memory/smartExtraction.js';

// Import command parser
import { parseCommand, executeCommand } from '../../../../lib/commands/commandParser.js';

// Import access control
import { checkEnergyAccess, consumeEnergyForAction, formatAccessDenialMessage } from '../../../../lib/auth/accessControl.js';

// Duplicate message protection
const processedMessages = new Set();
const MESSAGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if message has already been processed
 * @param {string} messageId - Message ID
 * @returns {boolean} - True if already processed
 */
function isMessageProcessed(messageId) {
  return processedMessages.has(messageId);
}

/**
 * Mark message as processed
 * @param {string} messageId - Message ID
 */
function markMessageProcessed(messageId) {
  processedMessages.add(messageId);
  
  // Clean up old message IDs after expiry
  setTimeout(() => {
    processedMessages.delete(messageId);
  }, MESSAGE_EXPIRY_MS);
}

/**
 * Clean up expired message IDs
 */
function cleanupExpiredMessages() {
  const now = Date.now();
  for (const messageId of processedMessages) {
    // This is a simplified cleanup - in production, you'd store timestamps
    // For now, we rely on the setTimeout in markMessageProcessed
  }
}

/**
 * Chunk message into smaller parts
 * @param {string} message - Message to chunk
 * @param {number} maxLength - Maximum length per chunk
 * @returns {Array} - Array of message chunks
 */
function chunkMessage(message, maxLength = 1000) {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks = [];
  const words = message.split(' ');
  let currentChunk = '';

  words.forEach(word => {
    if ((currentChunk + ' ' + word).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = word;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Simulate typing delay based on message length
 * @param {number} messageLength - Length of message
 * @returns {Promise<void>}
 */
async function simulateTypingDelay(messageLength) {
  // Calculate delay: ~50ms per character, min 1s, max 3s
  const baseDelay = Math.min(3000, Math.max(1000, messageLength * 50));
  const randomDelay = baseDelay + (Math.random() * 500 - 250); // Add some randomness
  
  await sleep(randomDelay);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limiting
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per phone number

/**
 * Check if rate limit exceeded
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if rate limit exceeded
 */
function isRateLimited(phoneNumber) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(phoneNumber) || [];
  
  // Filter out old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    console.log('⚠️ Rate limit exceeded:', { phoneNumber, requestCount: recentRequests.length });
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(phoneNumber, recentRequests);
  
  // Clean up old entries periodically
  if (recentRequests.length > RATE_LIMIT_MAX_REQUESTS * 2) {
    rateLimitStore.set(phoneNumber, recentRequests.slice(-RATE_LIMIT_MAX_REQUESTS));
  }
  
  return false;
}

// Debug: Log environment variables (without exposing secrets)
console.log('WhatsApp webhook environment check:', {
  hasVerifyToken: !!WHATSAPP_VERIFY_TOKEN,
  hasAccessToken: !!WHATSAPP_ACCESS_TOKEN,
  hasPhoneNumberId: !!WHATSAPP_PHONE_NUMBER_ID,
  verifyTokenLength: WHATSAPP_VERIFY_TOKEN?.length
});

// Webhook verification endpoint (GET)
export async function GET(req) {
  try {
    // Parse URL query parameters for Meta verification
    const { searchParams } = new URL(req.url);
    const hubMode = searchParams.get('hub.mode');
    const hubChallenge = searchParams.get('hub.challenge');
    const hubVerifyToken = searchParams.get('hub.verify_token');

    console.log('WhatsApp webhook verification DEBUG:', {
      url: req.url,
      hubMode,
      hubChallenge,
      hubVerifyToken,
      expectedToken: WHATSAPP_VERIFY_TOKEN,
      tokensMatch: hubVerifyToken === WHATSAPP_VERIFY_TOKEN
    });

    // Verify this is a webhook verification request
    if (hubMode === 'subscribe' && hubChallenge && hubVerifyToken) {
      // Verify the webhook token
      if (hubVerifyToken === WHATSAPP_VERIFY_TOKEN) {
        console.log('✅ Webhook verification SUCCESSFUL');
        
        // Return the challenge as plain text (Meta requirement)
        return new NextResponse(hubChallenge, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache'
          }
        });
      } else {
        console.error('❌ Invalid webhook verify token:', {
          received: hubVerifyToken,
          expected: WHATSAPP_VERIFY_TOKEN
        });
        return NextResponse.json({ 
          error: 'Invalid verification token',
          debug: {
            received: hubVerifyToken,
            expected_length: WHATSAPP_VERIFY_TOKEN?.length
          }
        }, { status: 403 });
      }
    } else {
      console.error('❌ Invalid webhook request:', {
        hubMode,
        hubChallenge: !!hubChallenge,
        hubVerifyToken: !!hubVerifyToken
      });
      return NextResponse.json({ 
        error: 'Invalid webhook request',
        debug: { hubMode, hasChallenge: !!hubChallenge, hasToken: !!hubVerifyToken }
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Webhook verification ERROR:', error);
    return NextResponse.json({ 
      error: 'Webhook verification failed',
      debug: { error: error.message, stack: error.stack }
    }, { status: 500 });
  }
}

// Message receiver endpoint (POST)
export async function POST(req) {
  try {
    // Log incoming request details
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    console.log('📨 WhatsApp webhook POST received:', {
      url: req.url,
      contentType: req.headers.get('content-type'),
      userAgent: req.headers.get('user-agent'),
      signature: signatureHeader
    });

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      console.error('❌ WhatsApp webhook secret is not configured');
      return NextResponse.json({ error: 'WHATSAPP_APP_SECRET not configured' }, { status: 500 });
    }

    if (!signatureHeader) {
      console.error('❌ Missing WhatsApp webhook signature');
      return NextResponse.json({ error: 'Missing x-hub-signature-256 header' }, { status: 400 });
    }

    let receivedSignature = signatureHeader;
    if (receivedSignature.startsWith('sha256=')) {
      receivedSignature = receivedSignature.slice('sha256='.length);
    }

    const expectedSignature = crypto.createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      console.error('❌ Invalid WhatsApp webhook signature', {
        receivedSignature,
        expectedSignature
      });
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON payload',
        debug: { error: parseError.message }
      }, { status: 400 });
    }

    console.log('📨 WhatsApp webhook payload:', {
      object: body.object,
      hasEntry: !!body.entry,
      entryCount: body.entry?.length,
      firstEntry: body.entry?.[0],
      firstChange: body.entry?.[0]?.changes?.[0]
    });

    // Validate basic webhook structure
    if (!body || typeof body !== 'object') {
      console.error('❌ Invalid payload structure');
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    if (!body.object) {
      console.error('❌ Missing object field');
      return NextResponse.json({ error: 'Missing object field' }, { status: 400 });
    }

    // Check if this is a WhatsApp Business Account event
    if (body.object !== 'whatsapp_business_account') {
      console.log('📋 Non-WhatsApp event received:', body.object);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Extract message data from webhook payload with safe optional chaining
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;
    const messageData = messages?.[0];

    console.log('📨 Webhook payload structure:', {
      hasEntry: !!entry,
      hasChange: !!change,
      hasValue: !!value,
      hasMessages: !!messages,
      messageCount: messages?.length,
      field: change?.field,
      messageData: messageData ? {
        from: messageData.from,
        id: messageData.id,
        type: messageData.type,
        timestamp: messageData.timestamp
      } : null
    });

    // Only process events that contain messages
    if (!messageData) {
      console.log('📋 No message data in webhook, skipping');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Process the message
    await processWhatsAppMessage(messageData, value);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('❌ WhatsApp webhook ERROR:', error);
    
    // Prevent crashes on malformed payloads
    if (error instanceof SyntaxError) {
      return NextResponse.json({ 
        error: 'Invalid payload format',
        debug: { error: error.message }
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      debug: { error: error.message, stack: error.stack }
    }, { status: 500 });
  }
}

// Process incoming WhatsApp message
async function processWhatsAppMessage(messageData, value) {
  try {
    // Extract message details with safe optional chaining
    const senderPhone = messageData.from;
    const messageId = messageData.id;
    const messageType = messageData.type;
    const timestamp = messageData.timestamp;
    const messageText = (messageData.text?.body || '').trim();
    const profileName = value?.contact?.[0]?.profile?.name;

    console.log('💬 Incoming WhatsApp message extracted:', {
      senderPhone,
      messageId,
      messageType,
      timestamp,
      messageText,
      profileName
    });

    try {
      const { recordInboundMessage } = await import('@/lib/whatsapp/service');
      await recordInboundMessage({
        phone: senderPhone,
        text: messageText,
        metadata: messageData,
      });
    } catch (syncError) {
      console.warn('WhatsApp dashboard sync skipped:', syncError?.message || syncError);
    }

    // If the message is a connect token, consume it and verify the user.
    const tokenMatch = messageText.match(/CONNECT_[A-Z0-9]{12}/);
    if (tokenMatch) {
      const token = tokenMatch[0];
      try {
        const updatedUser = await consumeLinkingToken(token, senderPhone);
        // Try to start a DB-backed trial for the linked user
        try {
          await startProTrialDb(updatedUser.id);
        } catch (e) {
          // if trial cannot be started, log and continue
          console.warn('Could not auto-start DB trial after linking:', e?.message || e);
        }

        const reply = '✅ WhatsApp connected successfully! Return to the app to continue.';
        await sendWhatsAppMessage(senderPhone, reply);
        return;
      } catch (linkError) {
        console.error('❌ WhatsApp linking failed:', linkError);
        await sendWhatsAppMessage(senderPhone, `Unable to verify your WhatsApp connection: ${linkError.message}`);
        return;
      }
    }

    // Skip group messages
    if (senderPhone?.includes('@g.us')) {
      console.log('📋 Skipping group message');
      return;
    }

    // Only process text messages
    if (messageType !== 'text') {
      console.log('� Skipping non-text message:', messageType);
      return;
    }

    console.log('💬 Processing text message from:', senderPhone);

    // Rate limiting check
    if (isRateLimited(senderPhone)) {
      console.log('⚠️ Rate limit exceeded, skipping:', { senderPhone });
      return;
    }

    // Duplicate message protection
    if (isMessageProcessed(messageId)) {
      console.log('📋 Duplicate message detected, skipping:', { messageId, senderPhone });
      return;
    }
    markMessageProcessed(messageId);

    // Check for commands
    const parsedCommand = parseCommand(messageText);
    if (parsedCommand && parsedCommand.isValid) {
      console.log('🔧 Command detected:', { command: parsedCommand.command });
      
      // Check access for commands
      const energyCheck = await checkEnergyAccess(senderPhone, 'SHORT_REPLY');
      if (!energyCheck.allowed) {
        const denialMessage = formatAccessDenialMessage(energyCheck.reason, energyCheck);
        await sendWhatsAppMessage(senderPhone, denialMessage);
        return;
      }
      
      const commandResponse = await executeCommand(parsedCommand, senderPhone);
      
      if (commandResponse) {
        // Consume energy for command
        await consumeEnergyForAction(senderPhone, 'SHORT_REPLY');
        
        const sendResult = await sendWhatsAppMessage(senderPhone, commandResponse);
        
        if (sendResult.success) {
          console.log('✅ Command response sent successfully');
        } else {
          console.error('❌ Failed to send command response');
        }
      }
      
      return;
    }

    // Check access for AI reply
    const energyCheck = await checkEnergyAccess(senderPhone, 'SHORT_REPLY');
    if (!energyCheck.allowed) {
      const denialMessage = formatAccessDenialMessage(energyCheck.reason, energyCheck);
      await sendWhatsAppMessage(senderPhone, denialMessage);
      return;
    }

    // Initialize or get user memory
    const userMemory = initializeUserMemory(senderPhone);

    // Set user name if available
    if (profileName && !userMemory.name) {
      updateUserMemory(senderPhone, { name: profileName });
      console.log('👤 User name set:', { phoneNumber: senderPhone, name: profileName });
    }

    // Add user message to conversation history
    addToConversationHistory(senderPhone, 'user', messageText);
    extractFromMessage(senderPhone, messageText);

    const conversationHistory = getConversationHistoryForAI(senderPhone);
    const updatedMemory = getUserMemory(senderPhone);

    console.log('🧠 Generating AI reply with context:', {
      phoneNumber: senderPhone,
      conversationLength: conversationHistory.length,
      timestamp: new Date().toISOString()
    });

    const replyText = await generateReply(messageText, senderPhone, conversationHistory, updatedMemory);

    if (!replyText) {
      console.error('❌ AI generation failed, using fallback');
      const fallbackReply = "I'm having trouble processing your request right now. Please try again later.";
      const sendResult = await sendWhatsAppMessage(senderPhone, fallbackReply);
      return;
    }
    
    console.log('🤖 AI reply generated:', replyText);
    console.log('📤 Sending AI reply to:', senderPhone);

    // Consume energy for AI reply
    await consumeEnergyForAction(senderPhone, 'SHORT_REPLY');

    // Chunk long replies for better UX
    const chunks = chunkMessage(replyText, 1000);
    let finalSendResult = { success: false };
    
    for (let i = 0; i < chunks.length; i++) {
      // Simulate typing delay between chunks
      if (i > 0) {
        await simulateTypingDelay(chunks[i].length);
      }
      
      const sendResult = await sendWhatsAppMessage(senderPhone, chunks[i]);
      finalSendResult = sendResult;

      if (sendResult.success) {
        console.log(`✅ Chunk ${i + 1}/${chunks.length} sent successfully`);
      } else {
        console.error(`❌ Failed to send chunk ${i + 1}/${chunks.length}`);
        break;
      }
    }

    if (finalSendResult.success) {
      console.log('✅ Reply sent successfully to:', senderPhone);
      
      // Add AI response to conversation history
      addToConversationHistory(senderPhone, 'assistant', replyText);
      
      // Update productivity stats
      const currentStats = updatedMemory.productivityStats;
      updateUserMemory(senderPhone, {
        productivityStats: {
          ...currentStats,
          totalSessions: currentStats.totalSessions + 1,
          lastActiveDate: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Failed to send reply to:', senderPhone, sendResult);
    }

    console.log('✅ WhatsApp message processed successfully');

  } catch (error) {
    console.error('❌ Error processing WhatsApp message:', error);
  }
}

