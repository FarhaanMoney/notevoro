/**
 * Plan Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for all plan limits.
 * Never hardcode limits anywhere else in the codebase.
 * 
 * When plan limits change, update ONLY this file.
 */

export type PlanType = 'free' | 'pro' | 'premium'
export type FeatureType = 'ai_chat' | 'atlas_sessions' | 'flashcards' | 'quizzes' | 'tests' | 'presentations' | 'research' | 'images' | 'storage'

export interface PlanLimits {
  plan: PlanType
  price?: string
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

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    plan: 'free',
    ai_chat_per_day: 20,
    atlas_per_day: 1,
    flashcards_per_day: 3,
    quizzes_per_day: 3,
    tests_per_day: 1,
    presentations_per_day: 1,
    research_per_day: 1,
    images_per_day: 1,
    storage_mb: 500,
  },
  pro: {
    plan: 'pro',
    price: '₹299/month',
    ai_chat_per_day: 250,
    atlas_per_day: 'unlimited',
    flashcards_per_day: 'unlimited',
    quizzes_per_day: 'unlimited',
    tests_per_day: 'unlimited',
    presentations_per_day: 'unlimited',
    research_per_day: 'unlimited',
    images_per_day: 4,
    storage_mb: 10240, // 10 GB
  },
  premium: {
    plan: 'premium',
    price: '₹899/month',
    ai_chat_per_day: 'unlimited',
    atlas_per_day: 'unlimited',
    flashcards_per_day: 'unlimited',
    quizzes_per_day: 'unlimited',
    tests_per_day: 'unlimited',
    presentations_per_day: 'unlimited',
    research_per_day: 'unlimited',
    images_per_day: 'unlimited',
    storage_mb: 102400, // 100 GB
  },
}

/**
 * Get limits for a specific plan
 */
export function getLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan]
}

/**
 * Check if a feature is unlimited for a given plan
 */
export function isFeatureUnlimited(plan: PlanType, feature: FeatureType): boolean {
  const limits = getLimits(plan)
  const featureKeyMap: Record<FeatureType, keyof PlanLimits> = {
    ai_chat: 'ai_chat_per_day',
    atlas_sessions: 'atlas_per_day',
    flashcards: 'flashcards_per_day',
    quizzes: 'quizzes_per_day',
    tests: 'tests_per_day',
    presentations: 'presentations_per_day',
    research: 'research_per_day',
    images: 'images_per_day',
    storage: 'storage_mb',
  }
  const limitKey = featureKeyMap[feature]
  return limits[limitKey] === 'unlimited'
}

/**
 * Get the daily limit for a feature (returns Infinity if unlimited)
 */
export function getFeatureLimit(plan: PlanType, feature: FeatureType): number {
  const limits = getLimits(plan)
  const featureKeyMap: Record<FeatureType, keyof PlanLimits> = {
    ai_chat: 'ai_chat_per_day',
    atlas_sessions: 'atlas_per_day',
    flashcards: 'flashcards_per_day',
    quizzes: 'quizzes_per_day',
    tests: 'tests_per_day',
    presentations: 'presentations_per_day',
    research: 'research_per_day',
    images: 'images_per_day',
    storage: 'storage_mb',
  }
  const limitKey = featureKeyMap[feature]
  const limit = limits[limitKey]
  return limit === 'unlimited' ? Infinity : (limit as number)
}

/**
 * Get storage limit in MB for a plan
 */
export function getStorageLimit(plan: PlanType): number {
  return getLimits(plan).storage_mb
}