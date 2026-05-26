/**
 * WhatsApp Message Sender
 * Sends messages via WhatsApp Cloud API with retry logic
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRY_DELAY_MULTIPLIER = 2;

/**
 * Send message via WhatsApp Cloud API with retry logic
 * @param {string} recipientPhone - Recipient phone number
 * @param {string} messageText - Message text to send
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} - Result object with success status and data
 */
export async function sendWhatsAppMessage(recipientPhone, messageText, maxRetries = MAX_RETRIES) {
  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (!recipientPhone || typeof recipientPhone !== 'string') {
        console.error('❌ Invalid recipient phone', { recipientPhone });
        return { success: false, error: 'Invalid recipient phone number' };
      }

      if (!messageText || typeof messageText !== 'string') {
        console.error('❌ Invalid message text', { messageText });
        return { success: false, error: 'Invalid message text' };
      }

      if (!WHATSAPP_PHONE_NUMBER_ID) {
        console.error('❌ WHATSAPP_PHONE_NUMBER_ID not configured');
        return { success: false, error: 'WhatsApp Phone Number ID not configured' };
      }

      if (!WHATSAPP_ACCESS_TOKEN) {
        console.error('❌ WHATSAPP_ACCESS_TOKEN not configured');
        return { success: false, error: 'WhatsApp Access Token not configured' };
      }

      const apiUrl = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

      console.log('📤 Sending WhatsApp message:', {
        to: recipientPhone,
        messageLength: messageText.length,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        timestamp: new Date().toISOString()
      });

      const payload = {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: {
          body: messageText
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        const error = result?.error?.message || 'WhatsApp API error';
        lastError = { status: response.status, error, details: result };

        console.error('❌ WhatsApp API error:', {
          status: response.status,
          to: recipientPhone,
          error,
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            error,
            details: result
          };
        }

        // Retry on server errors (5xx) or network issues
        if (attempt < maxRetries) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_DELAY_MULTIPLIER, attempt);
          console.log(`🔄 Retrying in ${delay}ms...`);
          await sleep(delay);
          attempt++;
          continue;
        }

        return {
          success: false,
          error,
          details: result
        };
      }

      const messageId = result.messages?.[0]?.id;

      console.log('✅ WhatsApp message sent successfully:', {
        to: recipientPhone,
        messageId,
        attempt: attempt + 1,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        messageId,
        data: result
      };

    } catch (error) {
      lastError = { message: error.message, stack: error.stack };

      console.error('❌ WhatsApp send error:', {
        to: recipientPhone,
        errorMessage: error.message,
        attempt: attempt + 1,
        timestamp: new Date().toISOString()
      });

      // Retry on network errors
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_DELAY_MULTIPLIER, attempt);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await sleep(delay);
        attempt++;
        continue;
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Max retries exceeded'
  };
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
