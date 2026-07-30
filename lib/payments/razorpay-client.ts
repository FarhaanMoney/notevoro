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
}

let razorpayClient: any = null

/**
 * Initialize Razorpay client
 */
function initializeRazorpayClient() {
  if (razorpayClient) {
    return razorpayClient
  }

  try {
    const config = getPaymentConfig()
    
    // Dynamically import Razorpay only when needed
    const Razorpay = require('razorpay')
    
    razorpayClient = new Razorpay({
      key_id: config.razorpayKeyId!,
      key_secret: config.razorpayKeySecret!,
    })

    console.log('[Razorpay] Client initialized successfully')
    return razorpayClient
  } catch (error) {
    console.error('[Razorpay] Failed to initialize client:', error)
    throw new Error('Failed to initialize Razorpay client. Check your credentials.')
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
  try {
    // Validate plan
    const validatedPlan = validatePlan(plan)
    if (!validatedPlan) {
      throw new Error(`Invalid plan: ${plan}`)
    }

    // Get price in paise
    const amount = getPlanPriceInPaise(validatedPlan)
    
    // Initialize client
    const client = initializeRazorpayClient()
    
    // Create order
    const receipt = `notevoro_${userId}_${Date.now()}`
    
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
    console.error('[Razorpay] Error creating order:', error)
    throw error
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