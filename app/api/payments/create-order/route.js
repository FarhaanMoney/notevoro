import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder, getRazorpayPlanDetails } from '@/lib/payments/razorpay'

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { plan } = body

    if (!plan || !['pro', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planDetails = getRazorpayPlanDetails(plan)
    const receipt = `notevoro_${user.id}_${Date.now()}`

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('[Payments] Razorpay not configured. Using mock payment for development.')
      
      // Mock order for development
      const mockOrderId = `order_mock_${Date.now()}`
      return NextResponse.json({
        orderId: mockOrderId,
        amount: planDetails.amount * 100, // in paise
        currency: 'INR',
        keyId: 'mock_key_id',
        mock: true, // Flag to indicate this is a mock payment
      })
    }

    const order = await createRazorpayOrder(
      planDetails.amount,
      receipt,
      { userId: user.id, plan }
    )

    if (!order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error('[Payments] Error creating order:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}