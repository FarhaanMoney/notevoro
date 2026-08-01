/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables for payment system
 */

interface EnvValidationResult {
  valid: boolean
  errors: string[]
  config: {
    razorpayKeyId: string | null
    razorpayKeySecret: string | null
    razorpayWebhookSecret: string | null
    publicRazorpayKeyId: string | null
  }
}

export function validatePaymentEnv(): EnvValidationResult {
  const errors: string[] = []
  
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim()
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  const publicRazorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || process.env.RAZORPAY_KEY_ID?.trim()

  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_PAYMENTS === 'true'
  const hasServerKeys = Boolean(razorpayKeyId && razorpayKeySecret)

  if (!razorpayKeyId) {
    if (!isDevelopment) {
      errors.push('RAZORPAY_KEY_ID is missing or empty')
    } else {
      console.warn('[Env] RAZORPAY_KEY_ID not set, will use mock mode')
    }
  }
  
  if (!razorpayKeySecret) {
    if (!isDevelopment) {
      errors.push('RAZORPAY_KEY_SECRET is missing or empty')
    } else {
      console.warn('[Env] RAZORPAY_KEY_SECRET not set, will use mock mode')
    }
  }
  
  if (!razorpayWebhookSecret) {
    errors.push('RAZORPAY_WEBHOOK_SECRET is missing or empty')
  }
  
  if (!publicRazorpayKeyId) {
    if (!isDevelopment) {
      errors.push('NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_ID is missing or empty')
    } else {
      console.warn('[Env] NEXT_PUBLIC_RAZORPAY_KEY_ID not set, using RAZORPAY_KEY_ID if available')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    config: {
      razorpayKeyId: razorpayKeyId || null,
      razorpayKeySecret: razorpayKeySecret || null,
      razorpayWebhookSecret: razorpayWebhookSecret || null,
      publicRazorpayKeyId: publicRazorpayKeyId || null,
    }
  }
}

export function getPaymentConfig() {
  const validation = validatePaymentEnv()
  
  if (!validation.valid) {
    throw new Error(`Payment system misconfigured: ${validation.errors.join(', ')}`)
  }

  return validation.config
}