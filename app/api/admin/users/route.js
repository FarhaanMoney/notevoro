import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSubscription, getCurrentSubscription, getPaymentHistory } from '@/lib/subscriptions/subscription-manager'

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
 * GET /api/admin/users - Get all users with their subscriptions
 */
export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Get subscription info for each user
    const usersWithSubs = await Promise.all(
      (users || []).map(async (user) => {
        const subscription = await getCurrentSubscription(user.id)
        return {
          ...user,
          subscription: subscription,
        }
      })
    )

    return NextResponse.json({ users: usersWithSubs })
  } catch (error) {
    console.error('[Admin] Error getting users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/users/update-subscription - Update user subscription
 */
export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const { userId, plan, status } = body

    if (!userId || !plan || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const success = await updateSubscription(userId, { plan, status })

    if (!success) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Subscription updated successfully' })
  } catch (error) {
    console.error('[Admin] Error updating subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}