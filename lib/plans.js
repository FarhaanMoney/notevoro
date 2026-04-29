// Plan + credit + tier configuration shared by backend
// Source of truth: product spec (Free/Pro/Premium)
export const PLAN_CREDITS = { free: 50, pro: 500, premium: 1250 };

export const FEATURE_COSTS = {
  chat: 2,
  quiz: 5,
  campaign: 5,
  flashcards: 5,
  notes: 4,
  mock: 15,
  file: 8,
  study_plan: 3,
};

// Which plans are allowed to use a feature
export const FEATURE_TIERS = {
  chat: ['free', 'pro', 'premium'],
  quiz: ['free', 'pro', 'premium'],
  flashcards: ['pro', 'premium'],
  notes: ['pro', 'premium'],
  study_plan: ['pro', 'premium'],
  mock: ['premium'],
  file: ['premium'],
  campaign: ['free', 'pro', 'premium'],
  contextual_memory: ['pro', 'premium'],
  advanced_analytics: ['pro', 'premium'],
};

export const LEVELS = [
  { name: 'Beginner', min: 0, color: 'text-zinc-300' },
  { name: 'Apprentice', min: 100, color: 'text-emerald-300' },
  { name: 'Scholar', min: 300, color: 'text-blue-300' },
  { name: 'Expert', min: 800, color: 'text-purple-300' },
  { name: 'Master', min: 2000, color: 'text-yellow-300' },
];

export function getLevel(xp = 0) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) lvl = l;
  const next = LEVELS.find((l) => l.min > xp);
  const progress = next ? Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  return { ...lvl, xp, next: next?.name || null, next_at: next?.min || null, progress };
}
