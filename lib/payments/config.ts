/**
 * Centralized Payment and Plan Configuration
 * 
 * Single source of truth for all plan configurations and pricing
 */

export type PlanType = 'free' | 'pro' | 'premium'

export interface PlanConfig {
  id: PlanType
  name: string
  price: number // in INR
  currency: string
  period: string
  description: string
  features: string[]
  popular?: boolean
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '20 AI Chats per day',
      '1 Atlas Session per day',
      '3 Flashcard Sets per day',
      '3 Quizzes per day',
      '1 Practice Test per day',
      '1 Presentation per day',
      '1 Research per day',
      '500 MB Storage',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 299,
    currency: 'INR',
    period: 'monthly',
    description: 'For serious learners',
    features: [
      '250 AI Chats per day',
      'Unlimited Atlas Sessions',
      'Unlimited Flashcard Sets',
      'Unlimited Quizzes',
      'Unlimited Practice Tests',
      'Unlimited Presentations',
      'Unlimited Research',
      '4 AI Images per day',
      '10 GB Storage',
    ],
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 899,
    currency: 'INR',
    period: 'monthly',
    description: 'Maximum power for achievers',
    features: [
      'Unlimited AI Chats',
      'Unlimited Atlas Sessions',
      'Unlimited Flashcard Sets',
      'Unlimited Quizzes',
      'Unlimited Practice Tests',
      'Unlimited Presentations',
      'Unlimited Research',
      'Unlimited AI Images',
      '100 GB Storage',
    ],
  },
}

/**
 * Validate and normalize plan ID
 */
export function validatePlan(plan: string): PlanType | null {
  const normalized = plan.toLowerCase().trim()
  if (normalized === 'free' || normalized === 'pro' || normalized === 'premium') {
    return normalized as PlanType
  }
  return null
}

/**
 * Get plan configuration
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLANS[plan]
}

/**
 * Get plan price (in paise for Razorpay)
 */
export function getPlanPriceInPaise(plan: PlanType): number {
  return PLANS[plan].price * 100
}

/**
 * Get allowed plan types
 */
export function getAllowedPlans(): PlanType[] {
  return ['free', 'pro', 'premium']
}

/**
 * Check if plan requires payment
 */
export function isPaidPlan(plan: PlanType): boolean {
  return plan === 'pro' || plan === 'premium'
}