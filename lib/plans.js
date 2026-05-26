// Centralized plan + permissions + energy configuration (source of truth)

export const PLAN_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    dailyEnergy: 20,
    features: [
      'basic_chat',
      'limited_notes',
      'flashcards_basic'
    ]
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

// Backwards-compatible energy map
export const PLAN_ENERGY = {
  free: PLAN_CONFIG.free.dailyEnergy,
  pro: PLAN_CONFIG.pro.dailyEnergy,
  premium: PLAN_CONFIG.premium.dailyEnergy,
  trial: PLAN_CONFIG.trial.dailyEnergy
};

// Backwards-compatible credits alias
export const PLAN_CREDITS = PLAN_ENERGY;

// Backwards-compatible pricing map
export const PLAN_PRICES = {
  free: 0,
  trial: 0,
  pro: 299,
  premium: 499
};

// Feature tiers map (source of truth)
export const FEATURE_TIERS = {
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

// Feature costs map
export const FEATURE_COSTS = {
  chat: 1,
  quiz: 1,
  campaign: 1,
  flashcards: 1,
  notes: 1,
  mock: 1,
  file: 1,
  study_plan: 1,
  visual_explanation: { pro: 15, premium: 10, trial: 15 },
};

// Plan helper functions
export function getUserPlan(userOrPlan) {
  if (typeof userOrPlan === 'string') return parsePlan(userOrPlan);
  return getEffectivePlan(userOrPlan);
}

export function isPremiumPlan(userOrPlan) {
  return getUserPlan(userOrPlan) === 'premium';
}

// Plan badge colors
export const PLAN_BADGE_COLORS = {
  free: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  pro: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  premium: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  trial: 'bg-green-500/20 text-green-300 border-green-500/30'
};

// Plan features display
export const PLAN_FEATURES = {
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
      'visual explanations',
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
      'visual explanations',
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

// Gamification levels
export const LEVELS = [
  { name: 'Beginner', min: 0, color: 'text-zinc-300' },
  { name: 'Apprentice', min: 100, color: 'text-emerald-300' },
  { name: 'Scholar', min: 300, color: 'text-blue-300' },
  { name: 'Expert', min: 800, color: 'text-purple-300' },
  { name: 'Master', min: 2000, color: 'text-yellow-300' },
];

// Core helper functions

export function parsePlan(input) {
  const p = (input || 'free').toString().toLowerCase();
  if (p === 'pro' || p === 'premium' || p === 'trial') return p;
  return 'free';
}

export function isTrialActive(user) {
  if (!user) return false;
  if (user.is_trial_active !== true) return false;
  const now = new Date();
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const trialStart = user.trial_start ? new Date(user.trial_start) : null;
  if (trialEnd) return trialEnd > now;
  if (trialStart) {
    const calcEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return calcEnd > now;
  }
  return false;
}

export function getEffectivePlan(user) {
  if (isTrialActive(user)) return 'trial';
  return parsePlan(user?.plan);
}

export function getDailyEnergyLimit(userOrPlan) {
  const plan = typeof userOrPlan === 'string' ? parsePlan(userOrPlan) : getEffectivePlan(userOrPlan);
  return PLAN_ENERGY[plan];
}

export function canUseFeature(feature, userOrPlan) {
  const plan = typeof userOrPlan === 'string' ? parsePlan(userOrPlan) : getEffectivePlan(userOrPlan);
  const allowed = FEATURE_TIERS[feature];
  if (!allowed) return false;
  return allowed.includes(plan);
}

export function canUseWhatsApp(userOrPlan) {
  return canUseFeature('whatsapp_companion', userOrPlan);
}

export function canUseVisualExplanation(userOrPlan) {
  return canUseFeature('visual_explanation', userOrPlan);
}

export function getLevel(xp = 0) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) lvl = l;
  const next = LEVELS.find((l) => l.min > xp);
  const progress = next ? Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  return { ...lvl, xp, next: next?.name || null, next_at: next?.min || null, progress };
}

export default {
  PLAN_CONFIG,
  PLAN_ENERGY,
  PLAN_CREDITS,
  PLAN_PRICES,
  PLAN_FEATURES,
  FEATURE_COSTS,
  PLAN_BADGE_COLORS,
  FEATURE_TIERS,
  LEVELS,
  parsePlan,
  isTrialActive,
  getEffectivePlan,
  getDailyEnergyLimit,
  canUseFeature,
  canUseWhatsApp,
  canUseVisualExplanation,
  getLevel,
  getUserPlan,
  isPremiumPlan
};
