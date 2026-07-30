import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSuccessfulPayment, handleFailedPayment } from '@/lib/payments/razorpay'

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
      status 
    } = body

    if (!orderId || !paymentId || !plan || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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