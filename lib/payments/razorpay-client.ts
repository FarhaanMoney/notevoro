/**
 * Production Razorpay Client
 * 
 * Proper Razorpay integration with error handling and logging
 */

import { getPaymentConfig } from './env'
import { getPlanPriceInPaise, validatePlan, PlanType } from './config'

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  attempts: number
  notes?: any
  created_at: number
}

export interface RazorpayOrderResponse {
  orderId: string
  amount: number
  currency: string
  keyId: string
  mock?: boolean
}

let razorpayClient: any = null

/**
 * Check if running in development mode
 */
function isDevelopmentMode(): boolean {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_PAYMENTS === 'true'
  
  console.log('[Razorpay] Development mode check:', {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_MOCK_PAYMENTS: process.env.ENABLE_MOCK_PAYMENTS,
    hasKeyId: !!process.env.RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    isDevMode: isDev
  })
  
  return isDev
}

/**
 * Initialize Razorpay client
 */
async function initializeRazorpayClient() {
  if (razorpayClient) {
    return razorpayClient
  }

  try {
    let config
    try {
      config = getPaymentConfig()
    } catch (configError) {
      console.warn('[Razorpay] Payment config not available:', configError.message)
      if (isDevelopmentMode()) {
        console.log('[Razorpay] Using mock mode due to missing config')
        return null
      }
      throw configError
    }
    
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      if (isDevelopmentMode()) {
        console.warn('[Razorpay] Running in development mode without real credentials')
        return null
      }
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.')
    }
    
    let Razorpay
    try {
      const imported = await import('razorpay')
      Razorpay = imported.default || imported
    } catch (importError) {
      console.error('[Razorpay] Failed to import razorpay package:', importError)
      if (isDevelopmentMode()) {
        console.log('[Razorpay] Using mock mode due to missing razorpay package')
        return null
      }
      throw new Error('Razorpay package not installed. Run: npm install razorpay')
    }
    
    razorpayClient = new Razorpay({
      key_id: config.razorpayKeyId!,
      key_secret: config.razorpayKeySecret!,
    })

    console.log('[Razorpay] Client initialized successfully')
    return razorpayClient
  } catch (error) {
    console.error('[Razorpay] Failed to initialize client:', error)
    
    if (error.message.includes('credentials not configured') || error.message.includes('package not installed')) {
      throw error
    }
    
    throw new Error('Failed to initialize Razorpay client. Please check your credentials and ensure the razorpay package is installed.')
  }
}

/**
 * Create Razorpay order
 */
export async function createRazorpayOrder(
  plan: PlanType,
  userId: string,
  userEmail: string
): Promise<RazorpayOrderResponse> {
  let validatedPlan: PlanType | null = null
  
  try {
    console.log('[Razorpay] createRazorpayOrder called with:', { plan, userId, userEmail })
    
    // Validate plan
    validatedPlan = validatePlan(plan)
    if (!validatedPlan) {
      throw new Error(`Invalid plan: ${plan}`)
    }

    console.log('[Razorpay] Plan validated:', validatedPlan)

    const amount = getPlanPriceInPaise(validatedPlan)
    console.log('[Razorpay] Amount in paise:', amount)
    
    console.log('[Razorpay] Initializing client...')
    const client = await initializeRazorpayClient()
    
    if (!client) {
      console.log('[Razorpay] Client is null, using mock payment mode')
      
      const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[Razorpay] Created mock order:', { mockOrderId, amount })
      
      return {
        orderId: mockOrderId,
        amount,
        currency: 'INR',
        keyId: 'mock_key_id',
        mock: true,
      }
    }
    
    console.log('[Razorpay] Using real Razorpay client')
    
    // Create real order
    const maxReceiptLength = 56
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '')
    const receiptUserIdPart = safeUserId.slice(0, maxReceiptLength - 10 - String(Date.now()).length)
    const receipt = `notevoro_${receiptUserIdPart}_${Date.now()}`
    
    const options = {
      amount,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        userEmail,
        plan: validatedPlan,
        createdAt: new Date().toISOString(),
      },
    }

    console.log('[Razorpay] Creating order with options:', {
      amount,
      currency: options.currency,
      receipt: options.receipt,
      plan: validatedPlan,
    })

    const order: RazorpayOrder = await client.orders.create(options)
    
    console.log('[Razorpay] Order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      status: order.status,
    })

    const config = getPaymentConfig()

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.publicRazorpayKeyId!,
    }
  } catch (error) {
    const normalizedError = (() => {
      if (!error) return { message: 'Unknown Razorpay error' }
      if (error instanceof Error) return error
      if (typeof error === 'string') return { message: error }
      if (typeof error === 'object') {
        return {
          message: error.message || error.description || error.error?.description || error.error?.reason || JSON.stringify(error),
          raw: error,
        }
      }
      return { message: String(error) }
    })()

    const errorMessage = normalizedError.message || 'Unknown Razorpay error'

    console.error('[Razorpay] Error creating order:', {
      rawError: normalizedError.raw || normalizedError,
      message: errorMessage,
    })
    
    if (isDevelopmentMode()) {
      console.log('[Razorpay] Falling back to mock mode due to error')
      
      const fallbackPlan = validatedPlan || 'free'
      const amount = getPlanPriceInPaise(fallbackPlan)
      const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return {
        orderId: mockOrderId,
        amount,
        currency: 'INR',
        keyId: 'mock_key_id',
        mock: true,
      }
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * Verify Razorpay signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    // Skip signature verification for mock payments
    if (orderId.startsWith('mock_order_') || paymentId.startsWith('mock_pay_')) {
      console.log('[Razorpay] Skipping signature verification for mock payment')
      return true
    }

    const config = getPaymentConfig()
    const crypto = require('crypto')
    
    const shasum = crypto.createHmac('sha256', config.razorpayKeySecret!)
    shasum.update(`${orderId}|${paymentId}`)
    const digest = shasum.digest('hex')

    const isValid = digest === signature
    console.log('[Razorpay] Signature verification:', {
      orderId,
      paymentId,
      isValid,
    })

    return isValid
  } catch (error) {
    console.error('[Razorpay] Error verifying signature:', error)
    return false
  }
}