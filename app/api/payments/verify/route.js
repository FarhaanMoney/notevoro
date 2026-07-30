import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay-client'
import { validatePlan } from '@/lib/payments/config'
import { createPayment, updateSubscription } from '@/lib/subscriptions/subscription-manager'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'
import { refreshUserSession, getUserDataForRefresh } from '@/lib/auth/session-refresh'

export async function POST(request) {
  console.log('[Payment] Verify payment request received')
  
  try {
    // Step 1: Authenticate user
    console.log('[Payment] Authenticating user...')
    const supabase = await createClient()
    if (!supabase) {
      console.error('[Payment] Supabase client not available')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[Payment] Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.error('[Payment] No user found in session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Payment] User authenticated:', { userId: user.id, email: user.email })

    // Step 2: Parse request body
    console.log('[Payment] Parsing request body...')
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
    
    console.log('[Payment] Payment data received:', {
      orderId,
      paymentId,
      plan,
      amount,
      status,
      hasSignature: !!signature,
      isMock: !!mock,
    })

    // Handle mock payment for development
    if (mock) {
      console.log('[Payment] Processing mock payment for development')
      
      // Skip signature verification for mock payments
      // Check for duplicate payment
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_id', paymentId)
        .single()

      if (existingPayment) {
        console.log('[Payment] Mock payment already processed, skipping')
        return NextResponse.json({ 
          success: true, 
          message: 'Mock payment already processed',
          duplicate: true
        })
      }

      // Create mock payment record
      const payment = await createPayment(user.id, {
        payment_id: paymentId,
        order_id: orderId,
        amount,
        status: 'completed',
      })

      if (!payment) {
        console.error('[Payment] Failed to create mock payment record')
        return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
      }
      
      console.log('[Payment] Mock payment record created:', { paymentId: payment.id })

      // Calculate subscription period
      const currentPeriodStart = new Date()
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
      currentPeriodEnd.setHours(23, 59, 59, 999)

      console.log('[Payment] Mock subscription period:', {
        start: currentPeriodStart.toISOString(),
        end: currentPeriodEnd.toISOString(),
      })

      // Update subscription
      const subscriptionUpdated = await updateSubscription(user.id, {
        plan: validatedPlan,
        status: 'active',
        provider: 'mock',
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: paymentId,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })

      if (!subscriptionUpdated) {
        console.error('[Payment] Failed to update mock subscription')
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }
      
      console.log('[Payment] Mock subscription updated successfully')

      // Ensure user records are updated
      await ensureUserRecords(user.id, user.email, user.user_metadata)
      console.log('[Payment] Mock user records ensured')

      // Refresh user session
      await refreshUserSession(user.id)
      console.log('[Payment] Mock user session refreshed')

      // Get updated user data
      const userData = await getUserDataForRefresh(user.id)
      console.log('[Payment] Mock user data retrieved for refresh')

      // Log activity
      await logActivity(user.id, 'subscription_purchased', 'subscription', user.id, {
        plan: validatedPlan,
        amount,
        paymentId,
        orderId,
        mock: true,
      })
      console.log('[Payment] Mock activity logged')

      console.log('[Payment] Mock payment verification completed successfully')
      return NextResponse.json({ 
        success: true, 
        message: 'Mock payment processed successfully',
        plan: validatedPlan,
        periodEnd: currentPeriodEnd.toISOString(),
        userData: userData,
        mock: true,
      })
    }

    // Step 3: Validate required fields
    if (!orderId || !paymentId || !plan || !amount) {
      console.error('[Payment] Missing required fields:', {
        hasOrderId: !!orderId,
        hasPaymentId: !!paymentId,
        hasPlan: !!plan,
        hasAmount: !!amount,
      })
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['orderId', 'paymentId', 'plan', 'amount']
      }, { status: 400 })
    }

    // Step 4: Validate plan
    console.log('[Payment] Validating plan...')
    const validatedPlan = validatePlan(plan)
    
    if (!validatedPlan) {
      console.error('[Payment] Invalid plan received:', plan)
      return NextResponse.json({ 
        error: 'Invalid plan',
        message: `Plan must be one of: free, pro, premium. Received: ${plan}`
      }, { status: 400 })
    }
    
    console.log('[Payment] Plan validated:', validatedPlan)

    // Step 5: Handle payment status
    if (status === 'success') {
      if (!signature) {
        console.error('[Payment] Missing signature for successful payment')
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
      }

      console.log('[Payment] Verifying Razorpay signature...')
      const isValidSignature = verifyRazorpaySignature(orderId, paymentId, signature)
      
      if (!isValidSignature) {
        console.error('[Payment] Invalid signature')
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
      }
      
      console.log('[Payment] Signature verified successfully')

      // Step 6: Check for duplicate payment
      console.log('[Payment] Checking for duplicate payment...')
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_id', paymentId)
        .single()

      if (existingPayment) {
        console.log('[Payment] Payment already processed, skipping')
        return NextResponse.json({ 
          success: true, 
          message: 'Payment already processed',
          duplicate: true
        })
      }

      // Step 7: Create payment record
      console.log('[Payment] Creating payment record...')
      const payment = await createPayment(user.id, {
        payment_id: paymentId,
        order_id: orderId,
        amount,
        status: 'completed',
      })

      if (!payment) {
        console.error('[Payment] Failed to create payment record')
        return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
      }
      
      console.log('[Payment] Payment record created:', { paymentId: payment.id })

      // Step 8: Calculate subscription period
      console.log('[Payment] Calculating subscription period...')
      const currentPeriodStart = new Date()
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
      currentPeriodEnd.setHours(23, 59, 59, 999)

      console.log('[Payment] Subscription period:', {
        start: currentPeriodStart.toISOString(),
        end: currentPeriodEnd.toISOString(),
      })

      // Step 9: Update subscription
      console.log('[Payment] Updating subscription...')
      const subscriptionUpdated = await updateSubscription(user.id, {
        plan: validatedPlan,
        status: 'active',
        provider: 'razorpay',
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: paymentId,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })

      if (!subscriptionUpdated) {
        console.error('[Payment] Failed to update subscription')
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }
      
      console.log('[Payment] Subscription updated successfully')

      // Step 10: Ensure user records are updated
      console.log('[Payment] Ensuring user records...')
      await ensureUserRecords(user.id, user.email, user.user_metadata)
      console.log('[Payment] User records ensured')

      // Step 11: Refresh user session for instant UI updates
      console.log('[Payment] Refreshing user session...')
      await refreshUserSession(user.id)
      console.log('[Payment] User session refreshed')

      // Step 12: Get updated user data for instant UI refresh
      console.log('[Payment] Getting updated user data...')
      const userData = await getUserDataForRefresh(user.id)
      console.log('[Payment] User data retrieved for refresh')

      // Step 13: Log activity
      console.log('[Payment] Logging activity...')
      await logActivity(user.id, 'subscription_purchased', 'subscription', user.id, {
        plan: validatedPlan,
        amount,
        paymentId,
        orderId,
      })
      console.log('[Payment] Activity logged')

      console.log('[Payment] Payment verification completed successfully')
      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified successfully',
        plan: validatedPlan,
        periodEnd: currentPeriodEnd.toISOString(),
        userData: userData, // Include for instant UI updates
      })
    } else {
      console.log('[Payment] Payment failed, recording failure...')
      
      // Record failed payment
      await createPayment(user.id, {
        payment_id: paymentId,
        order_id: orderId,
        amount,
        status: 'failed',
      })
      
      await logActivity(user.id, 'payment_failed', 'payment', user.id, {
        plan: validatedPlan,
        amount,
        paymentId,
        orderId,
      })
      
      return NextResponse.json({ success: false, message: 'Payment failed' })
    }
  } catch (error) {
    console.error('[Payment] Error in verify:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    return NextResponse.json({ 
      error: 'Failed to verify payment',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}