export type PlanId = 'free' | 'trial' | 'pro' | 'premium';

export interface UserPlanData {
  plan?: string | null;
  is_trial_active?: boolean | null;
  trial_start?: string | null;
  trial_ends_at?: string | null;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceMonthly: number;
  dailyEnergy: number | null;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    dailyEnergy: 20,
    features: ['basic_chat', 'limited_notes', 'flashcards_basic']
  },
  trial: {
    id: 'trial',
    name: '7-day Trial',
    priceMonthly: 0,
    dailyEnergy: 250,
    features: [
      'whatsapp_companion',
      'visual_explanation',
      'advanced_ai',
      'priority_responses',
      'voice_notes'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 299,
    dailyEnergy: 250,
    features: [
      'whatsapp_companion',
      'visual_explanation',
      'advanced_ai',
      'priority_responses',
      'voice_notes'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 499,
    dailyEnergy: null,
    features: [
      'whatsapp_companion',
      'visual_explanation',
      'advanced_ai',
      'priority_responses',
      'priority_support',
      'premium_models'
    ]
  }
};

export const PLAN_ENERGY: Record<PlanId, number | null> = {
  free: PLAN_CONFIG.free.dailyEnergy,
  trial: PLAN_CONFIG.trial.dailyEnergy,
  pro: PLAN_CONFIG.pro.dailyEnergy,
  premium: PLAN_CONFIG.premium.dailyEnergy
};

export const PLAN_CREDITS = PLAN_ENERGY;

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  trial: 0,
  pro: 299,
  premium: 499
};

export const FEATURE_TIERS: Record<string, PlanId[]> = {
  chat: ['free', 'pro', 'premium', 'trial'],
  quiz: ['free', 'pro', 'premium', 'trial'],
  flashcards: ['free', 'pro', 'premium', 'trial'],
  notes: ['free', 'pro', 'premium', 'trial'],
  study_plan: ['free', 'pro', 'premium', 'trial'],
  mock: ['pro', 'premium', 'trial'],
  file: ['pro', 'premium', 'trial'],
  campaign: ['free', 'pro', 'premium', 'trial'],
  contextual_memory: ['pro', 'premium', 'trial'],
  advanced_analytics: ['pro', 'premium', 'trial'],
  faster_generation: ['pro', 'premium', 'trial'],
  advanced_ai: ['pro', 'premium', 'trial'],
  whatsapp_companion: ['pro', 'premium', 'trial'],
  visual_explanation: ['pro', 'premium', 'trial'],
  voice_notes: ['pro', 'premium', 'trial'],
  priority_support: ['premium'],
  premium_models: ['premium']
};

export type FeatureCostConfig = number | Partial<Record<PlanId, number>>;

export const FEATURE_COSTS: Record<string, FeatureCostConfig> = {
  chat: 1,
  quiz: 1,
  campaign: 1,
  flashcards: 1,
  notes: 1,
  mock: 1,
  file: 1,
  study_plan: 1,
  visual_explanation: { pro: 15, premium: 10, trial: 15 }
};

export const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  pro: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  premium: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  trial: 'bg-green-500/20 text-green-300 border-green-500/30'
};

export const PLAN_FEATURES: Record<PlanId, { energyLabel: string; features: string[] }> = {
  free: {
    energyLabel: '20 AI Energy / day',
    features: [
      'basic AI chat',
      'limited note generation',
      'standard responses',
      'limited generations',
      'slower priority',
      'no WhatsApp AI',
      'no advanced memory'
    ]
  },
  trial: {
    energyLabel: '250 AI Energy / day',
    features: [
      'everything in Free',
      'WhatsApp AI enabled',
      'advanced AI features',
      'memory features',
      'voice notes',
      'priority AI responses',
      'faster generation',
      'larger limits',
      'visual explanations'
    ]
  },
  pro: {
    energyLabel: '250 AI Energy / day',
    features: [
      'everything in Free',
      'WhatsApp AI enabled',
      'advanced AI features',
      'memory features',
      'voice notes',
      'priority AI responses',
      'faster generation',
      'larger limits',
      'visual explanations'
    ]
  },
  premium: {
    energyLabel: 'Unlimited AI Energy',
    features: [
      'everything in Pro',
      'highest limits',
      'maximum AI Energy',
      'fastest priority',
      'future premium AI models',
      'premium companion features',
      'priority support'
    ]
  }
};

export const PLAN_ORDER: PlanId[] = ['free', 'trial', 'pro', 'premium'];

export function parsePlan(plan?: string | null): PlanId {
  const normalized = String(plan || 'free').trim().toLowerCase();
  if (normalized === 'pro' || normalized === 'premium' || normalized === 'trial') return normalized as PlanId;
  return 'free';
}

export function isTrialActive(user?: UserPlanData | null): boolean {
  if (!user) return false;
  if (user.is_trial_active !== true) return false;

  const now = new Date();
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const trialStart = user.trial_start ? new Date(user.trial_start) : null;

  if (trialEnd) {
    return trialEnd > now;
  }

  if (trialStart) {
    const calculatedEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return calculatedEnd > now;
  }

  return false;
}

export function getEffectivePlan(user?: UserPlanData | null): PlanId {
  if (!user) return 'free';
  if (isTrialActive(user)) return 'trial';
  return parsePlan(user.plan);
}

export function getUserPlan(userOrPlan?: UserPlanData | string | null): PlanId {
  if (typeof userOrPlan === 'string') return parsePlan(userOrPlan);
  return getEffectivePlan(userOrPlan);
}

export function getDailyEnergyLimit(userOrPlan?: UserPlanData | string | null): number | null {
  const plan = typeof userOrPlan === 'string' ? parsePlan(userOrPlan) : getUserPlan(userOrPlan);
  return PLAN_ENERGY[plan];
}

export function canUseFeature(feature: string, userOrPlan?: UserPlanData | string | null): boolean {
  const plan = typeof userOrPlan === 'string' ? parsePlan(userOrPlan) : getUserPlan(userOrPlan);
  const allowed = FEATURE_TIERS[feature];
  return Array.isArray(allowed) && allowed.includes(plan);
}

export function canUseWhatsApp(userOrPlan?: UserPlanData | string | null): boolean {
  return canUseFeature('whatsapp_companion', userOrPlan);
}

export function canUseVisualExplanation(userOrPlan?: UserPlanData | string | null): boolean {
  return canUseFeature('visual_explanation', userOrPlan);
}

export function canUseMockTests(userOrPlan?: UserPlanData | string | null): boolean {
  return canUseFeature('mock', userOrPlan);
}

export function canUseFileAnalysis(userOrPlan?: UserPlanData | string | null): boolean {
  return canUseFeature('file', userOrPlan);
}

export function isPremiumPlan(userOrPlan?: UserPlanData | string | null): boolean {
  return getUserPlan(userOrPlan) === 'premium';
}

export function getLevel(xp: number) {
  if (xp >= 2000) return 'Master';
  if (xp >= 800) return 'Expert';
  if (xp >= 300) return 'Scholar';
  if (xp >= 100) return 'Apprentice';
  return 'Beginner';
}
