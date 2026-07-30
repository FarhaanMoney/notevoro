import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentHistory } from '@/lib/subscriptions/subscription-manager'

// ADMIN KEY - In production, this should be stored securely
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-admin-key-123'

/**
 * Verify admin authorization
 */
function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.substring(7)
  return token === ADMIN_KEY
}

/**
 * GET /api/admin/payments?userId=xxx - Get payment history for a user
 */
export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    const payments = await getPaymentHistory(userId)
    return NextResponse.json({ payments })
  } catch (error) {
    console.error('[Admin] Error getting payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}