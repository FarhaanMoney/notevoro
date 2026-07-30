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
      .select('id, email, full_name, display_name, grade, curriculum, avatar_url, created_at')
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

/**
 * PUT /api/admin/users/update-profile - Update user profile
 */
export async function PUT(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const { userId, display_name, full_name, grade, curriculum, avatar_url } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (display_name !== undefined) updateData.display_name = display_name
    if (full_name !== undefined) updateData.full_name = full_name
    if (grade !== undefined) updateData.grade = grade
    if (curriculum !== undefined) updateData.curriculum = curriculum
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ profile, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('[Admin] Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}