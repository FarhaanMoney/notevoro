/**
 * Subscription Management System
 * 
 * Production-grade subscription management with proper Razorpay integration
 */

import { createClient } from '@/lib/supabase/server'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'

export type PlanType = 'free' | 'pro' | 'premium'
export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'cancelled' | 'expired'

export interface Subscription {
  id: string
  user_id: string
  plan: PlanType
  status: SubscriptionStatus
  provider: string
  razorpay_customer_id?: string
  razorpay_subscription_id?: string
  razorpay_payment_id?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  subscription_id?: string
  provider: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_id?: string
  order_id?: string
  invoice_id?: string
  created_at: string
}

/**
 * Get current subscription for a user
 */
export async function getCurrentSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const { data: activeSub, error: activeError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeError && activeSub) {
    return activeSub as Subscription
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('[Subscription] Error getting current subscription:', error)
    return null
  }

  return data as Subscription | null
}

/**
 * Update user subscription
 */
export async function updateSubscription(
  userId: string,
  updates: {
    plan?: PlanType
    status?: SubscriptionStatus
    provider?: string
    razorpay_customer_id?: string
    razorpay_subscription_id?: string
    razorpay_payment_id?: string
    current_period_start?: string
    current_period_end?: string
    cancel_at_period_end?: boolean
  }
): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return false

  try {
    // Get current subscription
    const currentSub = await getCurrentSubscription(userId)
    
    if (currentSub) {
      // Update existing subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSub.id)

      if (error) throw error

      // Log the activity
      await logActivity(userId, 'subscription_updated', 'subscription', currentSub.id, {
        from: { plan: currentSub.plan, status: currentSub.status },
        to: updates,
      })

      return true
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: updates.plan || 'free',
          status: updates.status || 'active',
          provider: updates.provider || 'internal',
          razorpay_customer_id: updates.razorpay_customer_id,
          razorpay_subscription_id: updates.razorpay_subscription_id,
          razorpay_payment_id: updates.razorpay_payment_id,
          current_period_start: updates.current_period_start,
          current_period_end: updates.current_period_end,
          cancel_at_period_end: updates.cancel_at_period_end || false,
        })

      if (error) throw error

      // Log the activity
      await logActivity(userId, 'subscription_created', 'subscription', userId, updates)

      return true
    }
  } catch (error) {
    console.error('[Subscription] Error updating subscription:', error)
    return false
  }
}

/**
 * Create payment record
 */
export async function createPayment(
  userId: string,
  payment: {
    subscription_id?: string
    provider?: string
    amount: number
    currency?: string
    status?: 'pending' | 'completed' | 'failed' | 'refunded'
    payment_id?: string
    order_id?: string
    invoice_id?: string
  }
): Promise<Payment | null> {
  const supabase = await createClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        subscription_id: payment.subscription_id,
        provider: payment.provider || 'razorpay',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status: payment.status || 'pending',
        payment_id: payment.payment_id,
        order_id: payment.order_id,
        invoice_id: payment.invoice_id,
      })
      .select()
      .single()

    if (error) throw error

    // Log the activity
    await logActivity(userId, 'payment_created', 'payment', data.id, {
      amount: payment.amount,
      status: payment.status,
    })

    return data as Payment
  } catch (error) {
    console.error('[Payment] Error creating payment:', error)
    return null
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('[Payment] Error updating payment status:', error)
    return false
  }
}

/**
 * Get payment history for a user
 */
export async function getPaymentHistory(userId: string): Promise<Payment[]> {
  const supabase = await createClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []) as Payment[]
  } catch (error) {
    console.error('[Payment] Error getting payment history:', error)
    return []
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return false

  try {
    const currentSub = await getCurrentSubscription(userId)
    if (!currentSub) return false

    if (cancelAtPeriodEnd) {
      // Mark for cancellation at period end
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id)

      if (error) throw error

      await logActivity(userId, 'subscription_cancel_scheduled', 'subscription', currentSub.id)
    } else {
      // Cancel immediately
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id)

      if (error) throw error

      await logActivity(userId, 'subscription_cancelled', 'subscription', currentSub.id)
    }

    return true
  } catch (error) {
    console.error('[Subscription] Error cancelling subscription:', error)
    return false
  }
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return false

  try {
    const currentSub = await getCurrentSubscription(userId)
    if (!currentSub) return false

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'active',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSub.id)

    if (error) throw error

    await logActivity(userId, 'subscription_reactivated', 'subscription', currentSub.id)

    return true
  } catch (error) {
    console.error('[Subscription] Error reactivating subscription:', error)
    return false
  }
}

/**
 * Check if subscription needs to be expired
 * Call this periodically or when checking subscription status
 */
export async function checkSubscriptionExpiry(): Promise<void> {
  const supabase = await createClient()
  if (!supabase) return

  try {
    const now = new Date().toISOString()

    // Find subscriptions that should be expired
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', now)

    if (expiredSubs && expiredSubs.length > 0) {
      for (const sub of expiredSubs) {
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id)

        await logActivity(sub.user_id, 'subscription_expired', 'subscription', sub.id)
      }
    }

    // Find subscriptions marked for cancellation at period end
    const { data: cancelAtEnd } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .lt('current_period_end', now)

    if (cancelAtEnd && cancelAtEnd.length > 0) {
      for (const sub of cancelAtEnd) {
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id)

        await logActivity(sub.user_id, 'subscription_cancelled', 'subscription', sub.id)
      }
    }
  } catch (error) {
    console.error('[Subscription] Error checking subscription expiry:', error)
  }
}