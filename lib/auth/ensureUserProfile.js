import { supabaseAdmin } from '@/lib/supabase/admin';

/** Columns safe to select on all production DB versions (no trial_ends_at). */
export const USER_ENERGY_SELECT =
  'id, plan, is_trial_active, trial_start, ai_energy, ai_energy_max, last_energy_regeneration';

export const USER_PROFILE_SELECT =
  'id, email, name, plan, xp, streak, credits, ai_energy, ai_energy_max, last_energy_regeneration, last_reset_date, subscription_status, is_trial_active, trial_start, trial_ends_at, weekly_reward_claimed, personalization';

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
    .select(USER_PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (existing && !existingError) {
    const meta = authUser?.user_metadata || existing.personalization || {};
    const updatedValues = {};

    const normalizedEmail = authUser?.email ? String(authUser.email).toLowerCase() : existing.email;
    if (normalizedEmail && normalizedEmail !== existing.email) updatedValues.email = normalizedEmail;

    const normalizedName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || existing.name || authUser?.email?.split('@')[0] || 'User';
    if (normalizedName !== existing.name) updatedValues.name = normalizedName;

    if (!existing.plan) updatedValues.plan = 'free';
    if (typeof existing.xp !== 'number') updatedValues.xp = 0;
    if (typeof existing.streak !== 'number') updatedValues.streak = 0;
    if (typeof existing.credits !== 'number') updatedValues.credits = 50;
    if (typeof existing.ai_energy !== 'number') updatedValues.ai_energy = 20;
    if (typeof existing.ai_energy_max !== 'number') updatedValues.ai_energy_max = 20;
    if (!existing.last_energy_regeneration) updatedValues.last_energy_regeneration = new Date().toISOString();
    if (!existing.last_reset_date) updatedValues.last_reset_date = new Date().toISOString().slice(0, 10);
    if (!existing.subscription_status) updatedValues.subscription_status = 'inactive';
    if (existing.personalization == null) updatedValues.personalization = {};
    if (typeof existing.is_trial_active !== 'boolean') updatedValues.is_trial_active = false;
    if (typeof existing.weekly_reward_claimed !== 'boolean') updatedValues.weekly_reward_claimed = false;

    if (Object.keys(updatedValues).length > 0) {
      const { error: updateError } = await sb.from('users').update(updatedValues).eq('id', userId);
      if (updateError) {
        console.error('ensureUserProfile: failed to update missing defaults', { userId, updateError });
      }
      return { ...existing, ...updatedValues };
    }

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
    xp: 0,
    streak: 0,
    credits: 50,
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
    .select(USER_PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (fetchError || !created) {
    console.error('ensureUserProfile: fetch after upsert failed', { userId, fetchError });
    return null;
  }

  return created;
}
