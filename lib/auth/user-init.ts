/**
 * User Initialization Utilities
 * 
 * These functions ensure that every authenticated user has all required records:
 * - profile
 * - subscription  
 * - usage
 * - user_stats
 * 
 * Call these functions whenever a user is created or logs in to ensure data consistency.
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Ensure user has all required records
 * Call this after successful authentication
 */
export async function ensureUserRecords(userId: string, email: string, metadata?: any) {
  const supabase = supabaseAdmin || (await createClient())
  if (!supabase) return false

  try {
    return await ensureUserRecordsManual(userId, email, metadata, supabase)
  } catch (error) {
    console.error('[User Init] Error ensuring user records:', error)
    return false
  }
}

/**
 * Manual fallback for user record creation
 */
async function ensureUserRecordsManual(userId: string, email: string, metadata?: any, client?: any) {
  const supabase = client || (supabaseAdmin || (await createClient()))
  if (!supabase) return false

  try {
    const now = new Date().toISOString()

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') throw profileError

    if (!existingProfile) {
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: metadata?.full_name || metadata?.name || null,
        display_name: metadata?.display_name || metadata?.name || email.split('@')[0],
        avatar_url: metadata?.avatar_url || null,
      }, { onConflict: 'id' })
    }

    const { data: existingActiveSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (subError && subError.code !== 'PGRST116') throw subError

    if (!existingActiveSubscription) {
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSubscription) {
        await supabase.from('subscriptions').update({
          plan: 'free',
          status: 'active',
          provider: 'internal',
          updated_at: now,
        }).eq('id', existingSubscription.id)
      } else {
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan: 'free',
          status: 'active',
          provider: 'internal',
        })
      }
    }

    const { data: existingStats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (statsError && statsError.code !== 'PGRST116') throw statsError

    if (!existingStats) {
      await supabase.from('user_stats').upsert({
        user_id: userId,
        last_active: now,
        updated_at: now,
      }, { onConflict: 'user_id' })
    }

    await supabase
      .from('user_stats')
      .update({
        last_active: now,
        updated_at: now,
      })
      .eq('user_id', userId)

    return true
  } catch (error) {
    console.error('[User Init] Error in manual fallback:', error)
    return false
  }
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) {
  const supabase = await createClient()
  if (!supabase) return

  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error('[Activity Log] Error logging activity:', error)
  }
}

/**
 * Update user stats
 */
export async function updateUserStats(
  userId: string,
  updates: {
    study_hours?: number
    study_streak?: number
    notes_created?: number
    flashcards_created?: number
    quizzes_completed?: number
    tests_completed?: number
  }
) {
  const supabase = await createClient()
  if (!supabase) return

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.study_hours !== undefined) updateData.study_hours = updates.study_hours
    if (updates.study_streak !== undefined) updateData.study_streak = updates.study_streak
    if (updates.notes_created !== undefined) updateData.notes_created = updates.notes_created
    if (updates.flashcards_created !== undefined) updateData.flashcards_created = updates.flashcards_created
    if (updates.quizzes_completed !== undefined) updateData.quizzes_completed = updates.quizzes_completed
    if (updates.tests_completed !== undefined) updateData.tests_completed = updates.tests_completed

    await supabase
      .from('user_stats')
      .update(updateData)
      .eq('user_id', userId)
  } catch (error) {
    console.error('[User Stats] Error updating stats:', error)
  }
}