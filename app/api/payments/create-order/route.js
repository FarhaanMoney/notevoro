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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}