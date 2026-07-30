import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSuccessfulPayment, handleFailedPayment } from '@/lib/payments/razorpay'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'
import { updateSubscription, createPayment } from '@/lib/subscriptions/subscription-manager'

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { 
      orderId, 
      paymentId, 
      signature, 
      plan, 
      amount,
      status,
      mock 
    } = body

    if (!orderId || !paymentId || !plan || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle mock payment for development
    if (mock) {
      console.log('[Payments] Processing mock payment for development')
      
      // Create mock payment record
      const payment = await createPayment(user.id, {
        payment_id: paymentId,
        order_id: orderId,
        amount,
        status: 'completed',
      })

      if (!payment) {
        return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
      }

      // Calculate exact 1-month subscription period
      const currentPeriodStart = new Date()
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
      currentPeriodEnd.setHours(23, 59, 59, 999)

      // Update subscription
      const subscriptionUpdated = await updateSubscription(user.id, {
        plan,
        status: 'active',
        provider: 'mock',
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: paymentId,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })

      if (!subscriptionUpdated) {
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      // Ensure user records are updated
      await ensureUserRecords(user.id, user.email, user.user_metadata)

      // Log the subscription upgrade
      await logActivity(user.id, 'subscription_purchased', 'subscription', user.id, {
        plan,
        amount,
        paymentId,
        mock: true,
      })

      return NextResponse.json({ success: true, message: 'Mock payment processed successfully' })
    }

    if (status === 'success') {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
      }

      const result = await handleSuccessfulPayment(
        user.id,
        orderId,
        paymentId,
        signature,
        plan,
        amount
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Payment verification failed' }, { status: 400 })
      }

      // Ensure user records are updated with new plan
      await ensureUserRecords(user.id, user.email, user.user_metadata)

      // Log the subscription upgrade
      await logActivity(user.id, 'subscription_purchased', 'subscription', user.id, {
        plan,
        amount,
        paymentId,
      })

      return NextResponse.json({ success: true, message: 'Payment verified successfully' })
    } else {
      await handleFailedPayment(user.id, orderId, paymentId, amount)
      return NextResponse.json({ success: false, message: 'Payment failed' })
    }
  } catch (error) {
    console.error('[Payments] Error verifying payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}