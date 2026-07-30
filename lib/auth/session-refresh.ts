/**
 * Session and Subscription Refresh
 * 
 * Handles instant updates of user subscription data across the application
 */

import { createClient } from '@/lib/supabase/server'

export interface SubscriptionData {
  plan: string
  status: string
  current_period_end?: string
  updated_at: string
}

/**
 * Get current subscription data
 */
export async function getCurrentSubscriptionData(userId: string): Promise<SubscriptionData | null> {
  const supabase = await createClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) throw error

    return data as SubscriptionData
  } catch (error) {
    console.error('[Session Refresh] Error getting subscription data:', error)
    return null
  }
}

/**
 * Force refresh user session data
 */
export async function refreshUserSession(userId: string): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return false

  try {
    // Update user stats to trigger activity
    const { error } = await supabase
      .from('user_stats')
      .update({ 
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('[Session Refresh] Error refreshing session:', error)
    return false
  }
}

/**
 * Get complete user data for instant UI updates
 */
export async function getUserDataForRefresh(userId: string) {
  const supabase = await createClient()
  if (!supabase) return null

  try {
    const [subscription, profile, stats] = await Promise.all([
      getCurrentSubscriptionData(userId),
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_stats').select('*').eq('user_id', userId).single(),
    ])

    return {
      subscription,
      profile: profile.data,
      stats: stats.data,
    }
  } catch (error) {
    console.error('[Session Refresh] Error getting user data:', error)
    return null
  }
}