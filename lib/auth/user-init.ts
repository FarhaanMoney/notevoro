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
    console.log('[User Init] Creating user records for:', userId, email)
    const result = await ensureUserRecordsManual(userId, email, metadata, supabase)
    console.log('[User Init] User records result:', result)
    return result
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
    console.log('[User Init] Using SQL function to initialize user records')
    // Use SQL function to initialize all records (bypasses RLS)
    const { error: initError } = await supabase.rpc('initialize_user_records', {
      p_user_id: userId,
      p_email: email,
      p_metadata: metadata || {},
    })

    if (initError) {
      console.error('[User Init] initialize_user_records error:', initError)
      throw initError
    }

    console.log('[User Init] User records initialized successfully')
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
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action: action,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_metadata: metadata || {},
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