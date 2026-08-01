import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder } from '@/lib/payments/razorpay-client'
import { validatePlan } from '@/lib/payments/config'
import { validatePaymentEnv } from '@/lib/payments/env'

export const runtime = 'nodejs'

export async function POST(request) {
  console.log('[Payment] Create order request received')
  
  try {
    // Step 1: Validate environment variables (be lenient in development)
    console.log('[Payment] Validating environment variables...')
    const envValidation = validatePaymentEnv()
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_PAYMENTS === 'true'

    if (!envValidation.valid && !isDevelopment) {
      console.error('[Payment] Environment validation failed:', envValidation.errors)
      return NextResponse.json({ 
        error: 'Payment system not configured',
        message: 'Payment features are currently unavailable. Please contact the administrator to configure Razorpay credentials.',
        details: envValidation.errors,
        setupInstructions: 'To enable payments, set the following environment variables: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID'
      }, { status: 503 })
    }

    if (!envValidation.valid) {
      console.warn('[Payment] Environment validation failed, continuing in mock mode:', envValidation.errors)
    } else {
      console.log('[Payment] Environment variables validated successfully')
    }

    // Step 2: Authenticate user
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

    // Step 3: Parse and validate request body
    console.log('[Payment] Parsing request body...')
    const body = await request.json()
    const { plan } = body
    
    console.log('[Payment] Plan received:', plan)

    // Step 4: Validate plan
    console.log('[Payment] Validating plan...')
    const validatedPlan = validatePlan(plan)
    
    if (!validatedPlan) {
      console.error('[Payment] Invalid plan received:', plan)
      return NextResponse.json({ 
        error: 'Invalid plan',
        message: `Plan must be one of: free, pro, premium. Received: ${plan}`,
        allowedPlans: ['free', 'pro', 'premium']
      }, { status: 400 })
    }
    
    console.log('[Payment] Plan validated:', validatedPlan)

    // Step 5: Create Razorpay order
    console.log('[Payment] Creating Razorpay order...')
    const orderResponse = await createRazorpayOrder(
      validatedPlan,
      user.id,
      user.email
    )
    
    console.log('[Payment] Razorpay order created successfully:', {
      orderId: orderResponse.orderId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
    })

    // Step 6: Return success response
    return NextResponse.json({
      success: true,
      orderId: orderResponse.orderId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
      keyId: orderResponse.keyId,
      plan: validatedPlan,
      mock: orderResponse.mock || false,
    })

  } catch (error) {
    const normalizedError = (() => {
      if (!error) return { message: 'Unknown payment error' }
      if (error instanceof Error) return error
      if (typeof error === 'string') return { message: error }
      if (typeof error === 'object') {
        return {
          message: error.message || error.description || JSON.stringify(error),
          raw: error,
        }
      }
      return { message: String(error) }
    })()

    console.error('[Payment] Error in create-order:', normalizedError)
    
    return NextResponse.json({ 
      error: 'Failed to create payment order',
      message: normalizedError.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? normalizedError.raw || normalizedError : undefined
    }, { status: 500 })
  }
}