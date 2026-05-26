import { supabaseAdmin } from '../supabase/admin.js';
import { regenerateEnergy } from '../energy/aiEnergy.js';

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function isTrialAlreadyUsed(user) {
  if (!user) return false;
  if (typeof user.trial_used === 'boolean') return user.trial_used;
  return Boolean(user.trial_start);
}

/**
 * Start a 7-day pro trial for a user (DB-backed)
 */
export async function startProTrialDb(userId) {
  const sb = supabaseAdmin();

  let user;
  let { data: fetchedUser, error: fetchErr } = await sb
    .from('users')
    .select('id, phone_number, is_trial_active, trial_used, trial_start, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr) {
    const fallbackErr = String(fetchErr.message || fetchErr).toLowerCase();
    if (fallbackErr.includes('trial_used')) {
      const fallback = await sb
        .from('users')
        .select('id, phone_number, is_trial_active, trial_start, trial_ends_at')
        .eq('id', userId)
        .maybeSingle();
      if (fallback.error || !fallback.data) {
        console.error('startProTrialDb: user fetch failed on fallback', { userId, fallbackErr: fallback.error, fetchedUser });
        throw new Error('User not found');
      }
      user = fallback.data;
    } else {
      console.error('startProTrialDb: user fetch failed', { userId, fetchErr });
      throw new Error('User not found');
    }
  } else {
    user = fetchedUser;
  }

  if (!user) {
    console.error('startProTrialDb: user row missing after fetch', { userId });
    throw new Error('User not found');
  }

  if (isTrialAlreadyUsed(user)) {
    throw new Error('Trial already used for this account');
  }

  const now = new Date();
  const trialStartedAt = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_MS).toISOString();

  const updates = {
    plan: 'pro',
    is_trial_active: true,
    trial_start: trialStartedAt,
    trial_ends_at: trialEndsAt,
    subscription_status: 'trial',
    updated_at: new Date().toISOString()
  };

  if (typeof user.trial_used !== 'undefined') {
    updates.trial_used = true;
  }

  let { error: updErr } = await sb.from('users').update(updates).eq('id', userId);
  if (updErr) {
    const retryErr = String(updErr.message || updErr).toLowerCase();
    if (retryErr.includes('trial_used')) {
      delete updates.trial_used;
    }
    if (retryErr.includes('trial_ends_at')) {
      delete updates.trial_ends_at;
    }
    if (retryErr.includes('subscription_status')) {
      delete updates.subscription_status;
    }
    if (retryErr.includes('updated_at')) {
      delete updates.updated_at;
    }

    if (
      retryErr.includes('trial_used') ||
      retryErr.includes('trial_ends_at') ||
      retryErr.includes('subscription_status') ||
      retryErr.includes('updated_at')
    ) {
      const retry = await sb.from('users').update(updates).eq('id', userId);
      if (retry.error) {
        console.error('Failed to start trial on retry after dropping missing fields', retry.error);
        throw new Error('Failed to start trial');
      }
    } else {
      console.error('Failed to start trial (DB):', updErr);
      throw new Error('Failed to start trial');
    }
  }

  try {
    await regenerateEnergy(userId);
  } catch (e) {
    console.warn('Failed to regenerate energy after trial start:', e?.message || e);
  }

  return { userId, trialStartedAt, trialEndsAt, plan: 'pro', energyLimit: 250 };
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
