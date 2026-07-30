/**
 * Razorpay Integration
 * 
 * Production Razorpay payment integration for subscriptions
 */

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { 
  createPayment, 
  updatePaymentStatus, 
  updateSubscription 
} from '@/lib/subscriptions/subscription-manager'
import { logActivity } from '@/lib/auth/user-init'

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('[Razorpay] Missing credentials. Payment features will be disabled.')
}

const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET 
  ? new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  })
  : null

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id?: string
  status: string
  attempts: number
  notes?: any
  created_at: number
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  customer_id: string
  status: string
  current_start: number
  current_end: number
  ended_at?: number
  schedule_start_at?: number
  created_at: number
}

/**
 * Create Razorpay order for one-time payment
 */
export async function createRazorpayOrder(
  amount: number,
  receipt: string,
  notes?: any
): Promise<RazorpayOrder | null> {
  if (!razorpay) {
    console.error('[Razorpay] Razorpay not configured')
    return null
  }

  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt,
      notes: notes || {},
    }

    const order = await razorpay.orders.create(options)
    return order as RazorpayOrder
  } catch (error) {
    console.error('[Razorpay] Error creating order:', error)
    return null
  }
}

/**
 * Create Razorpay subscription
 */
export async function createRazorpaySubscription(
  customerId: string,
  planId: string,
  customerContact?: string,
  customerEmail?: string
): Promise<RazorpaySubscription | null> {
  if (!razorpay) {
    console.error('[Razorpay] Razorpay not configured')
    return null
  }

  try {
    const options = {
      plan_id: planId,
      customer_notify: true,
      quantity: 1,
      total_count: 12, // 12 months
      start_at: Math.floor(Date.now() / 1000) + 60, // Start in 1 minute
      customer_contact: customerContact,
      customer_email: customerEmail,
    }

    const subscription = await razorpay.subscriptions.create(options)
    return subscription as RazorpaySubscription
  } catch (error) {
    console.error('[Razorpay] Error creating subscription:', error)
    return null
  }
}

/**
 * Create Razorpay customer
 */
export async function createRazorpayCustomer(
  name: string,
  email: string,
  contact?: string
): Promise<string | null> {
  if (!razorpay) {
    console.error('[Razorpay] Razorpay not configured')
    return null
  }

  try {
    const customer = await razorpay.customers.create({
      name,
      email,
      contact,
    })

    return customer.id
  } catch (error) {
    console.error('[Razorpay] Error creating customer:', error)
    return null
  }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    console.error('[Razorpay] Secret key not configured')
    return false
  }

  const shasum = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
  shasum.update(`${orderId}|${paymentId}`)
  const digest = shasum.digest('hex')

  return digest === signature
}

/**
 * Handle successful payment
 */
export async function handleSuccessfulPayment(
  userId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  plan: 'pro' | 'premium',
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify signature
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      return { success: false, error: 'Invalid signature' }
    }

    const supabase = await createClient()
    if (!supabase) {
      return { success: false, error: 'Database not configured' }
    }

    // Check if payment already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single()

    if (existingPayment) {
      // Payment already processed, skip
      return { success: true }
    }

    // Create payment record
    const payment = await createPayment(userId, {
      payment_id: paymentId,
      order_id: orderId,
      amount,
      status: 'completed',
    })

    if (!payment) {
      return { success: false, error: 'Failed to create payment record' }
    }

    // Calculate exact 1-month subscription period
    const currentPeriodStart = new Date()
    const currentPeriodEnd = new Date(currentPeriodStart)
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    currentPeriodEnd.setHours(23, 59, 59, 999) // End of the day, 1 month from now

    // Update subscription with exact period
    const subscriptionUpdated = await updateSubscription(userId, {
      plan,
      status: 'active',
      provider: 'razorpay',
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: paymentId, // Use payment_id as subscription_id for one-time
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
    })

    if (!subscriptionUpdated) {
      return { success: false, error: 'Failed to update subscription' }
    }

    // Log activity
    await logActivity(userId, 'payment_successful', 'payment', payment.id, {
      plan,
      amount,
      period_end: currentPeriodEnd.toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('[Razorpay] Error handling successful payment:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Handle failed payment
 */
export async function handleFailedPayment(
  userId: string,
  orderId: string,
  paymentId: string,
  amount: number
): Promise<boolean> {
  try {
    const payment = await createPayment(userId, {
      payment_id: paymentId,
      order_id: orderId,
      amount,
      status: 'failed',
    })

    if (!payment) return false

    await logActivity(userId, 'payment_failed', 'payment', payment.id, {
      amount,
    })

    return true
  } catch (error) {
    console.error('[Razorpay] Error handling failed payment:', error)
    return false
  }
}

/**
 * Get Razorpay plan details
 */
export function getRazorpayPlanDetails(plan: 'pro' | 'premium') {
  const plans = {
    pro: {
      amount: 299, // ₹299
      currency: 'INR',
      name: 'Pro Plan',
      description: 'Monthly Pro subscription',
      period: 'monthly',
    },
    premium: {
      amount: 899, // ₹899
      currency: 'INR',
      name: 'Premium Plan',
      description: 'Monthly Premium subscription',
      period: 'monthly',
    },
  }

  return plans[plan]
}