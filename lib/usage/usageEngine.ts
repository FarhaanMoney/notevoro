/**
 * Usage Engine
 * 
 * CENTRALIZED USAGE & SUBSCRIPTION ENGINE
 * 
 * This is the SINGLE SOURCE OF TRUTH for all subscription, permission, and usage logic.
 * Every premium feature MUST go through this engine.
 * 
 * NEVER implement usage logic separately inside API routes.
 * The backend is always the source of truth.
 */

import { createClient } from '@/lib/supabase/server'
import { getLimits, isFeatureUnlimited, getFeatureLimit, getStorageLimit, PlanType, FeatureType } from './plans'

export interface UsageCheckResult {
  success: boolean
  allowed: boolean
  feature: FeatureType
  reason?: string
  remaining: number
  plan: PlanType
  upgradeRequired?: boolean
}

export interface UsageSummary {
  plan: PlanType
  status: string
  today: {
    ai_chat_used: number
    atlas_sessions_used: number
    flashcards_used: number
    quizzes_used: number
    tests_used: number
    presentations_used: number
    research_used: number
    images_used: number
  }
  all_time: {
    notes: number
    folders: number
  }
  limits: {
    ai_chat_per_day: number | 'unlimited'
    atlas_per_day: number | 'unlimited'
    flashcards_per_day: number | 'unlimited'
    quizzes_per_day: number | 'unlimited'
    tests_per_day: number | 'unlimited'
    presentations_per_day: number | 'unlimited'
    research_per_day: number | 'unlimited'
    images_per_day: number | 'unlimited'
    storage_mb: number
  }
  remaining: {
    ai_chat: number
    atlas_sessions: number
    flashcards: number
    quizzes: number
    tests: number
    presentations: number
    research: number
    images: number
    storage_mb: number
  }
}

/**
 * Get current plan for a user
 */
export async function getCurrentPlan(userId: string): Promise<PlanType> {
  const supabase = await createClient()
  if (!supabase) return 'free'

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  return (subscription?.plan as PlanType) || 'free'
}

/**
 * Get current usage for a user (today's usage)
 */
export async function getCurrentUsage(userId: string) {
  const supabase = await createClient()
  if (!supabase) return null

  const today = new Date().toISOString().slice(0, 10)
  
  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return usage
}

/**
 * Get limits for a specific plan
 */
export function getPlanLimits(plan: PlanType) {
  return getLimits(plan)
}

/**
 * Calculate remaining usage for all features
 */
export async function remainingUsage(userId: string) {
  const plan = await getCurrentPlan(userId)
  const usage = await getCurrentUsage(userId)
  const limits = getLimits(plan)

  const today = new Date().toISOString().slice(0, 10)
  
  // Initialize usage if it doesn't exist or needs reset
  if (!usage || usage.date !== today) {
    return {
      ai_chat: typeof limits.ai_chat_per_day === 'number' ? limits.ai_chat_per_day : Infinity,
      atlas_sessions: typeof limits.atlas_per_day === 'number' ? limits.atlas_per_day : Infinity,
      flashcards: typeof limits.flashcards_per_day === 'number' ? limits.flashcards_per_day : Infinity,
      quizzes: typeof limits.quizzes_per_day === 'number' ? limits.quizzes_per_day : Infinity,
      tests: typeof limits.tests_per_day === 'number' ? limits.tests_per_day : Infinity,
      presentations: typeof limits.presentations_per_day === 'number' ? limits.presentations_per_day : Infinity,
      research: typeof limits.research_per_day === 'number' ? limits.research_per_day : Infinity,
      images: typeof limits.images_per_day === 'number' ? limits.images_per_day : Infinity,
      storage_mb: limits.storage_mb,
    }
  }

  return {
    ai_chat: Math.max(0, (typeof limits.ai_chat_per_day === 'number' ? limits.ai_chat_per_day : Infinity) - usage.ai_chat_used),
    atlas_sessions: Math.max(0, (typeof limits.atlas_per_day === 'number' ? limits.atlas_per_day : Infinity) - usage.atlas_sessions_used),
    flashcards: Math.max(0, (typeof limits.flashcards_per_day === 'number' ? limits.flashcards_per_day : Infinity) - usage.flashcards_used),
    quizzes: Math.max(0, (typeof limits.quizzes_per_day === 'number' ? limits.quizzes_per_day : Infinity) - usage.quizzes_used),
    tests: Math.max(0, (typeof limits.tests_per_day === 'number' ? limits.tests_per_day : Infinity) - usage.tests_used),
    presentations: Math.max(0, (typeof limits.presentations_per_day === 'number' ? limits.presentations_per_day : Infinity) - usage.presentations_used),
    research: Math.max(0, (typeof limits.research_per_day === 'number' ? limits.research_per_day : Infinity) - usage.research_used),
    images: Math.max(0, (typeof limits.images_per_day === 'number' ? limits.images_per_day : Infinity) - usage.images_used),
    storage_mb: Math.max(0, limits.storage_mb - usage.storage_used_mb),
  }
}

/**
 * Check if user has permission to use a feature
 * This is the main permission check function
 */
export async function checkPermission(userId: string, feature: FeatureType): Promise<UsageCheckResult> {
  const supabase = await createClient()
  if (!supabase) {
    // If Supabase is not configured, allow all features (preview mode)
    return {
      success: true,
      allowed: true,
      feature,
      remaining: Infinity,
      plan: 'free',
    }
  }

  const plan = await getCurrentPlan(userId)
  const usage = await getCurrentUsage(userId)
  const limits = getLimits(plan)

  // Check if feature is unlimited for this plan
  if (isFeatureUnlimited(plan, feature)) {
    return {
      success: true,
      allowed: true,
      feature,
      remaining: Infinity,
      plan,
    }
  }

  // Get daily limit
  const limit = getFeatureLimit(plan, feature)
  if (limit === Infinity) {
    return {
      success: true,
      allowed: true,
      feature,
      remaining: Infinity,
      plan,
    }
  }

  // Get current usage
  const today = new Date().toISOString().slice(0, 10)
  const currentUsage = usage?.date === today ? usage : null
  
  const featureUsageMap: Record<FeatureType, number> = {
    ai_chat: currentUsage?.ai_chat_used || 0,
    atlas_sessions: currentUsage?.atlas_sessions_used || 0,
    flashcards: currentUsage?.flashcards_used || 0,
    quizzes: currentUsage?.quizzes_used || 0,
    tests: currentUsage?.tests_used || 0,
    presentations: currentUsage?.presentations_used || 0,
    research: currentUsage?.research_used || 0,
    images: currentUsage?.images_used || 0,
    storage: currentUsage?.storage_used_mb || 0,
  }

  const used = featureUsageMap[feature]
  const remaining = Math.max(0, limit - used)

  if (remaining <= 0) {
    return {
      success: false,
      allowed: false,
      feature,
      reason: 'Daily limit reached',
      remaining: 0,
      plan,
      upgradeRequired: true,
    }
  }

  return {
    success: true,
    allowed: true,
    feature,
    remaining,
    plan,
  }
}

/**
 * Consume usage for a feature
 * Call this ONLY after successful operation completion
 */
export async function consumeUsage(userId: string, feature: FeatureType, amount: number = 1): Promise<boolean> {
  const supabase = await createClient()
  if (!supabase) return true // Preview mode

  const plan = await getCurrentPlan(userId)
  
  // Don't consume usage for unlimited features (except storage)
  if (isFeatureUnlimited(plan, feature) && feature !== 'storage') {
    return true
  }

  const today = new Date().toISOString().slice(0, 10)
  
  // Check if usage row exists for today
  const { data: existingUsage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existingUsage) {
    // Update existing usage
    const columnMap: Record<FeatureType, string> = {
      ai_chat: 'ai_chat_used',
      atlas_sessions: 'atlas_sessions_used',
      flashcards: 'flashcards_used',
      quizzes: 'quizzes_used',
      tests: 'tests_used',
      presentations: 'presentations_used',
      research: 'research_used',
      images: 'images_used',
      storage: 'storage_used_mb',
    }
    
    const column = columnMap[feature]
    const increment = feature === 'storage' ? amount : 1 // Storage uses custom amount
    
    const { error } = await supabase
      .from('usage')
      .update({ [column]: (existingUsage as any)[column] + increment, updated_at: new Date().toISOString() })
      .eq('id', existingUsage.id)

    return !error
  } else {
    // Create new usage row
    const columnMap: Record<FeatureType, string> = {
      ai_chat: 'ai_chat_used',
      atlas_sessions: 'atlas_sessions_used',
      flashcards: 'flashcards_used',
      quizzes: 'quizzes_used',
      tests: 'tests_used',
      presentations: 'presentations_used',
      research: 'research_used',
      images: 'images_used',
      storage: 'storage_used_mb',
    }
    
    const column = columnMap[feature]
    const increment = feature === 'storage' ? amount : 1 // Storage uses custom amount
    
    const newRow: any = {
      user_id: userId,
      date: today,
      ai_chat_used: 0,
      atlas_sessions_used: 0,
      flashcards_used: 0,
      quizzes_used: 0,
      tests_used: 0,
      presentations_used: 0,
      research_used: 0,
      images_used: 0,
      storage_used_mb: 0,
    }
    newRow[column] = increment

    const { error } = await supabase
      .from('usage')
      .insert(newRow)

    return !error
  }
}

/**
 * Check storage limit for file upload
 */
export async function checkStorage(userId: string, fileSizeMB: number): Promise<UsageCheckResult> {
  const supabase = await createClient()
  if (!supabase) {
    return {
      success: true,
      allowed: true,
      feature: 'storage',
      remaining: Infinity,
      plan: 'free',
    }
  }

  const plan = await getCurrentPlan(userId)
  const usage = await getCurrentUsage(userId)
  const limits = getLimits(plan)

  const today = new Date().toISOString().slice(0, 10)
  const currentStorage = usage?.date === today ? usage.storage_used_mb : 0
  const remainingStorage = limits.storage_mb - currentStorage

  if (remainingStorage < fileSizeMB) {
    return {
      success: false,
      allowed: false,
      feature: 'storage',
      reason: 'Storage limit reached',
      remaining: remainingStorage,
      plan,
      upgradeRequired: true,
    }
  }

  return {
    success: true,
    allowed: true,
    feature: 'storage',
    remaining: remainingStorage - fileSizeMB,
    plan,
  }
}

/**
 * Reset usage if needed (automatic daily reset)
 * Call this at the start of any usage-dependent operation
 */
export async function resetUsageIfNeeded(userId: string): Promise<void> {
  const supabase = await createClient()
  if (!supabase) return

  const today = new Date().toISOString().slice(0, 10)
  
  const { data: usage } = await supabase
    .from('usage')
    .select('date')
    .eq('user_id', userId)
    .single()

  // If usage exists and is from a different day, reset it
  if (usage && usage.date !== today) {
    await supabase
      .from('usage')
      .update({
        date: today,
        ai_chat_used: 0,
        atlas_sessions_used: 0,
        flashcards_used: 0,
        quizzes_used: 0,
        tests_used: 0,
        presentations_used: 0,
        research_used: 0,
        images_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }
}

/**
 * Get complete usage summary for a user
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const supabase = await createClient()
  if (!supabase) {
    // Return preview mode data
    const limits = getLimits('free')
    return {
      plan: 'free',
      status: 'preview',
      today: {
        ai_chat_used: 0,
        atlas_sessions_used: 0,
        flashcards_used: 0,
        quizzes_used: 0,
        tests_used: 0,
        presentations_used: 0,
        research_used: 0,
        images_used: 0,
      },
      all_time: {
        notes: 0,
        folders: 0,
      },
      limits,
      remaining: {
        ai_chat: typeof limits.ai_chat_per_day === 'number' ? limits.ai_chat_per_day : Infinity,
        atlas_sessions: typeof limits.atlas_per_day === 'number' ? limits.atlas_per_day : Infinity,
        flashcards: typeof limits.flashcards_per_day === 'number' ? limits.flashcards_per_day : Infinity,
        quizzes: typeof limits.quizzes_per_day === 'number' ? limits.quizzes_per_day : Infinity,
        tests: typeof limits.tests_per_day === 'number' ? limits.tests_per_day : Infinity,
        presentations: typeof limits.presentations_per_day === 'number' ? limits.presentations_per_day : Infinity,
        research: typeof limits.research_per_day === 'number' ? limits.research_per_day : Infinity,
        images: typeof limits.images_per_day === 'number' ? limits.images_per_day : Infinity,
        storage_mb: limits.storage_mb,
      },
    }
  }

  const plan = await getCurrentPlan(userId)
  const limits = getLimits(plan)
  const remaining = await remainingUsage(userId)

  // Get today's usage
  const today = new Date().toISOString().slice(0, 10)
  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const todayUsage = usage?.date === today ? usage : {
    ai_chat_used: 0,
    atlas_sessions_used: 0,
    flashcards_used: 0,
    quizzes_used: 0,
    tests_used: 0,
    presentations_used: 0,
    research_used: 0,
    images_used: 0,
  }

  // Get subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  // Get all-time counts
  const [{ count: notesCount }, { count: foldersCount }] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('folders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  return {
    plan,
    status: subscription?.status || 'active',
    today: {
      ai_chat_used: (todayUsage as any)?.ai_chat_used || 0,
      atlas_sessions_used: (todayUsage as any)?.atlas_sessions_used || 0,
      flashcards_used: (todayUsage as any)?.flashcards_used || 0,
      quizzes_used: (todayUsage as any)?.quizzes_used || 0,
      tests_used: (todayUsage as any)?.tests_used || 0,
      presentations_used: (todayUsage as any)?.presentations_used || 0,
      research_used: (todayUsage as any)?.research_used || 0,
      images_used: (todayUsage as any)?.images_used || 0,
    },
    all_time: {
      notes: notesCount || 0,
      folders: foldersCount || 0,
    },
    limits,
    remaining,
  }
}

/**
 * Log usage request for analytics
 * This is for debugging and analytics only
 */
export async function logUsageRequest(
  userId: string,
  feature: FeatureType,
  allowed: boolean,
  executionTime: number,
  success: boolean
): Promise<void> {
  // In production, this would log to a dedicated analytics table
  // For now, we'll just console log for debugging
  console.log('[Usage Engine]', {
    userId,
    feature,
    allowed,
    executionTime: `${executionTime}ms`,
    success,
    timestamp: new Date().toISOString(),
  })
}