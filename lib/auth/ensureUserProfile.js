import { supabaseAdmin } from '@/lib/supabase/admin';

/** Columns safe to select on all production DB versions (no trial_ends_at). */
export const USER_ENERGY_SELECT =
  'id, plan, is_trial_active, trial_start, ai_energy, ai_energy_max, last_energy_regeneration';

/**
 * Ensure public.users row exists for an authenticated Supabase user.
 * @param {string} userId
 * @param {import('@supabase/supabase-js').User | null} authUser
 */
export async function ensureUserProfile(userId, authUser = null) {
  if (!userId) return null;

  const sb = supabaseAdmin();
  const { data: existing, error: existingError } = await sb
    .from('users')
    .select(USER_ENERGY_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (existing && !existingError) {
    return existing;
  }

  let auth = authUser;
  if (!auth) {
    const { data: authData, error: authError } = await sb.auth.admin.getUserById(userId);
    if (authError || !authData?.user) {
      console.error('ensureUserProfile: auth user missing', { userId, authError });
      return null;
    }
    auth = authData.user;
  }

  const meta = auth.user_metadata || {};
  const now = new Date().toISOString();

  const defaultProfile = {
    id: userId,
    email: auth.email ? String(auth.email).toLowerCase() : null,
    name: meta.full_name || meta.name || auth.email?.split('@')[0] || 'User',
    plan: 'free',
    ai_energy: 20,
    ai_energy_max: 20,
    last_energy_regeneration: now,
    last_reset_date: now.slice(0, 10),
    trial_start: null,
    is_trial_active: false,
    subscription_status: 'inactive',
    weekly_reward_claimed: false,
    personalization: meta.personalization || {},
  };

  const { error: upsertError } = await sb.from('users').upsert(defaultProfile, { onConflict: 'id' });
  if (upsertError) {
    console.error('ensureUserProfile: upsert failed', { userId, upsertError });
    return null;
  }

  const { data: created, error: fetchError } = await sb
    .from('users')
    .select(USER_ENERGY_SELECT)
    .eq('id', userId)
    .single();

  if (fetchError || !created) {
    console.error('ensureUserProfile: fetch after upsert failed', { userId, fetchError });
    return null;
  }

  return created;
}
