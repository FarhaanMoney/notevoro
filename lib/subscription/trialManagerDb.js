import { supabaseAdmin } from '../supabase/admin.js';
import { regenerateEnergy } from '../energy/aiEnergy.js';

/**
 * Start a 7-day pro trial for a user (DB-backed)
 */
export async function startProTrialDb(userId) {
  const sb = supabaseAdmin();

  // Ensure user exists
  const { data: user, error: fetchErr } = await sb.from('users').select('id, phone_number, is_trial_active, trial_used, trial_start, trial_ends_at').eq('id', userId).single();
  if (fetchErr || !user) {
    console.error('startProTrialDb: user fetch failed', { userId, fetchErr, user });
    throw new Error('User not found');
  }

  if (user.trial_used) {
    throw new Error('Trial already used for this account');
  }

  // compute trial end
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const updates = {
    plan: 'pro',
    is_trial_active: true,
    trial_used: true,
    trial_start: new Date().toISOString(),
    trial_ends_at: trialEndsAt,
    subscription_status: 'active',
    updated_at: new Date().toISOString()
  };

  const { error: updErr } = await sb.from('users').update(updates).eq('id', userId);
  if (updErr) {
    console.error('Failed to start trial (DB):', updErr);
    throw new Error('Failed to start trial');
  }

  // Regenerate their AI energy to pro limits (uses supabaseAdmin internally)
  try {
    await regenerateEnergy(userId);
  } catch (e) {
    console.warn('Failed to regenerate energy after trial start:', e.message);
  }

  return { userId, trialStartedAt: new Date().toISOString(), trialEndsAt, plan: 'pro', energyLimit: 250 };
}

export async function endTrialDb(userId) {
  const sb = supabaseAdmin();
  const { data: user, error } = await sb.from('users').select('id').eq('id', userId).single();
  if (error || !user) throw new Error('User not found');

  const updates = {
    plan: 'free',
    is_trial_active: false,
    subscription_status: 'inactive',
    updated_at: new Date().toISOString()
  };

  const { error: updErr } = await sb.from('users').update(updates).eq('id', userId);
  if (updErr) throw new Error('Failed to end trial');

  // regenerate to free limits
  try { await regenerateEnergy(userId); } catch (e) { console.warn(e); }

  return true;
}

export async function isTrialActiveDb(userId) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('users').select('is_trial_active, trial_ends_at').eq('id', userId).single();
  if (error || !data) return false;
  if (!data.is_trial_active) return false;
  if (data.trial_ends_at && new Date(data.trial_ends_at) < new Date()) return false;
  return true;
}
