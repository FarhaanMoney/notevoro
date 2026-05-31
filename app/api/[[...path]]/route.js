import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, emailEnabled, sendTrialWelcomeEmail, sendStreakEmail, sendInactivityEmail } from '@/lib/email';
import { PLAN_CREDITS, PLAN_ENERGY, PLAN_PRICES, FEATURE_COSTS, FEATURE_TIERS, getLevel } from '@/lib/plans';
import { getAIEnergy, consumeAIEnergy } from '@/lib/energy/aiEnergy.js';

export const dynamic = 'force-dynamic';

function modelFor(user) {
  const plan = user?.plan || 'free';
  if (plan === 'premium') return process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL_PRO || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (plan === 'pro') return process.env.OPENAI_MODEL_PRO || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return process.env.OPENAI_MODEL_FREE || process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

function openai() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI API key (OPENAI_API_KEY for AICredits) not configured. Add it to /app/.env');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.aicredits.in/v1',
  });
}

function razorpayClient() {
  console.log('Razorpay: Checking key configuration');
  console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
  console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay keys not configured');
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

function json(data, init = {}) { return NextResponse.json(data, init); }
function err(message, status = 400, extra = {}) { return NextResponse.json({ error: message, ...extra }, { status }); }

function idempotencyKey(req, fallback) {
  return req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key') || fallback;
}

function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return e.includes('@') ? e : null;
}

function otpHash({ email, code }) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error('OTP_SECRET not configured');
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase anon client not configured');
  return createClient(url, anon, { 
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: anon
      }
    }
  });
}

async function findAuthUserByEmail(sb, email) {
  let page = 1;
  const perPage = 1000;
  // Compatibility fallback for SDKs that don't expose getUserByEmail
  while (page <= 20) {
    const listed = await sb.auth.admin.listUsers({ page, perPage });
    if (listed.error) throw new Error(listed.error.message);
    const users = listed.data?.users || [];
    const hit = users.find((u) => String(u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

function isAlreadyRegisteredError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('already') && (msg.includes('registered') || msg.includes('exists') || msg.includes('taken'));
}

async function upsertUserProfile({ userId, email, name, personalization = {} }) {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  const trialEnergy = 250;
  const payload = {
    id: userId,
    email: email ? String(email).toLowerCase() : null,
    name: name || (email ? email.split('@')[0] : 'User'),
    avatar: null,
    xp: 0,
    streak: 0,
    last_active: now,
    plan: 'pro', // Grant pro plan during trial
    ai_energy: trialEnergy,
    ai_energy_max: trialEnergy,
    last_energy_regeneration: now,
    last_reset_date: now.slice(0, 10),
    trial_start: new Date().toISOString(),
    is_trial_active: true, // Start 7-day Pro trial
    daily_reward_date: null,
    weekly_reward_claimed: false,
    subscription_status: 'inactive',
    quizzes_taken: 0,
    correct_answers: 0,
    total_questions: 0,
    personalization,
  };
  
  console.log('Creating user profile with trial:', {
    userId,
    email,
    plan: payload.plan,
    ai_energy: payload.ai_energy,
    trial_start: payload.trial_start,
    is_trial_active: payload.is_trial_active
  });
  
  const { error } = await sb.from('users').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Failed to upsert user profile:', error);
    throw new Error('Failed to upsert user profile: ' + error.message);
  }
  
  console.log('User profile created successfully with trial');
}

async function requireUser(req) {
  const u = await getUserFromRequest(req);
  if (!u) return null;
  const sb = supabaseAdmin();
  
  // Get user from Supabase only
  const { data, error } = await sb.from('users').select('*').eq('id', u.id).single();
  if (error || !data) {
    console.error('Failed to get user data:', error, 'for user:', u.id);
    return null;
  }
  
  console.log('User data loaded:', {
    id: data.id,
    plan: data.plan,
    ai_energy: data.ai_energy,
    is_trial_active: data.is_trial_active,
    trial_start: data.trial_start,
    last_reset_date: data.last_reset_date
  });
  
  const user = {
    id: data.id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    xp: data.xp || 0,
    streak: data.streak || 0,
    plan: data.plan || 'free',
    aiEnergy: data.ai_energy ?? 0,
    aiEnergy_max: data.ai_energy_max ?? PLAN_ENERGY[data.plan || 'free'],
    last_energy_regeneration: data.last_energy_regeneration || null,
    last_reset_date: data.last_reset_date,
    trial_start: data.trial_start,
    is_trial_active: Boolean(data.is_trial_active),
    daily_reward_date: data.daily_reward_date,
    weekly_reward_claimed: Boolean(data.weekly_reward_claimed),
    personalization: data.personalization || {},
    subscription_status: data.subscription_status || 'inactive',
    quizzes_taken: data.quizzes_taken || 0,
    correct_answers: data.correct_answers || 0,
    total_questions: data.total_questions || 0,
    last_active: data.last_active,
    created_at: data.created_at,
  };

  const now = new Date();

  // Ensure legacy users have AI energy fields initialized
  if (data.ai_energy == null) {
    const legacyEnergyMax = data.plan === 'premium' ? null : data.plan === 'pro' ? 250 : 20;
    const { error: energyError } = await sb.from('users').update({
      ai_energy: 20,
      ai_energy_max: data.ai_energy_max ?? legacyEnergyMax,
      last_energy_regeneration: data.last_energy_regeneration || now.toISOString()
    }).eq('id', user.id);
    if (!energyError) {
      user.aiEnergy = 20;
      user.aiEnergy_max = data.ai_energy_max ?? legacyEnergyMax;
    }
  }

  const energyInfo = await getAIEnergy(user.id);
  if (energyInfo) {
    user.aiEnergy = energyInfo.currentEnergy;
    user.aiEnergy_max = energyInfo.maxEnergy;
    user.last_energy_regeneration = energyInfo.lastRegeneration;
  }

  // Expire 7-day trial after one week.
  if (user.is_trial_active && user.trial_start) {
    const trialStart = new Date(user.trial_start);
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (now > trialEnd) {
      console.log('7-day trial expired for user:', user.id, { trialStart: trialStart.toISOString(), trialEnd: trialEnd.toISOString() });
      const { error: expireError } = await sb.from('users').update({
        plan: 'free',
        is_trial_active: false,
        ai_energy_max: PLAN_ENERGY.free,
        ai_energy: PLAN_ENERGY.free
      }).eq('id', user.id);
      if (!expireError) {
        user.plan = 'free';
        user.is_trial_active = false;
        user.aiEnergy_max = PLAN_ENERGY.free;
        user.aiEnergy = PLAN_ENERGY.free;
      } else {
        console.error('Failed to expire trial:', expireError);
      }
    }
  }

  // Send streak achievement emails
  if (emailEnabled() && user.email) {
    // Send streak milestone emails
    if (user.streak >= 7 && !user._lastStreakEmail) {
      sendStreakEmail(user.email, user.name, user.streak).catch(() => {});
      await sb.from('users').update({ _lastStreakEmail: 7 }).eq('id', user.id);
    } else if (user.streak === 14 && !user._lastStreakEmail) {
      sendStreakEmail(user.email, user.name, user.streak).catch(() => {});
      await sb.from('users').update({ _lastStreakEmail: 14 }).eq('id', user.id);
    }
    
    // Send inactivity email for users who haven't been active in 7 days
    const lastActive = user.last_active ? new Date(user.last_active) : null;
    const daysSinceActive = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;
    if (daysSinceActive !== null && daysSinceActive >= 7 && !user._lastInactivityEmail) {
      sendInactivityEmail(user.email, user.name).catch(() => {});
      await sb.from('users').update({ _lastInactivityEmail: Date.now() }).eq('id', user.id);
    }
  }

  return user;
}

function publicUser(u) {
  if (!u) return null;
  const lvl = getLevel(u.xp || 0);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || u.phoneNumber || null,
    avatar: u.avatar || null,
    xp: u.xp || 0,
    streak: u.streak || 0,
    plan: u.plan || 'free',
    subscription_status: u.subscription_status || 'inactive',
    // Normalize WhatsApp verification state: prefer personalization flag, fallback to phone_number
    whatsappVerified: Boolean(u.personalization?.whatsapp_verified) || Boolean(u.phone_number),
    credits: u.aiEnergy ?? u.credits ?? 0,
    aiEnergy: u.aiEnergy ?? u.credits ?? 0,
    aiEnergy_max: Number.isFinite(u.aiEnergy_max) ? u.aiEnergy_max : null,
    credits_max: Number.isFinite(u.aiEnergy_max) ? u.aiEnergy_max : null,
    credits_reset_at: u.credits_reset_at || null,
    last_energy_regeneration: u.last_energy_regeneration || null,
    last_reset_date: u.last_reset_date || null,
    trial_start: u.trial_start || null,
    is_trial_active: Boolean(u.is_trial_active),
    weekly_reward_claimed: Boolean(u.weekly_reward_claimed),
    weekly_reward_granted: Boolean(u._weeklyRewardGranted),
    level: lvl,
    onboardingStep: u.onboardingStep || null,
    onboardingProgress: u.onboardingProgress || 0,
    onboardingCompletedAt: u.onboardingCompletedAt || null,
    personalization: u.personalization || null,
    quizzes_taken: u.quizzes_taken || 0,
    correct_answers: u.correct_answers || 0,
    total_questions: u.total_questions || 0,
    last_active: u.last_active || null,
  };
}

async function updateStreak(sb, user) {
  let streak = user.streak || 0;
  const today = new Date().toISOString().slice(0, 10);
  const last = user.last_active ? new Date(user.last_active).toISOString().slice(0, 10) : null;
  if (last) {
    const diff = (new Date(today) - new Date(last)) / 86400000;
    streak = diff === 1 ? streak + 1 : 1;
  } else streak = 1;
  await sb.from('users').update({ streak, last_active: new Date().toISOString() }).eq('id', user.id);
  return streak;
}

function resolveFeatureCost(feature, plan = 'free') {
  const costConfig = FEATURE_COSTS[feature];
  if (typeof costConfig === 'number') return costConfig;
  if (costConfig && typeof costConfig === 'object') {
    return costConfig[plan] ?? costConfig.pro ?? 1;
  }
  return 1;
}

async function chargeFeatureUsage({ user, feature, reason, idem }) {
  const plan = user?.is_trial_active ? 'trial' : (user?.plan || 'free');
  const cost = resolveFeatureCost(feature, plan);
  if (!cost || cost <= 0) {
    return { success: true, cost: 0, remainingEnergy: user?.aiEnergy ?? 0 };
  }

  try {
    const remainingEnergy = await deductCredits({
      userId: user.id,
      cost,
      feature,
      reason,
      idem: idem || null,
    });
    return { success: true, cost, remainingEnergy };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to deduct AI Energy', cost };
  }
}

function checkAccess(user, feature) {
  const plan = user.plan || 'free';
  const isTrialActive = Boolean(user.is_trial_active);
  const tiers = FEATURE_TIERS[feature];
  
  // Check if user has access based on plan or trial status
  if (tiers && !tiers.includes(plan) && !isTrialActive) {
    return { ok: false, error: `${feature} is locked on the ${plan} plan. Upgrade to unlock.`, status: 403, upgrade: true };
  }
  
  const cost = resolveFeatureCost(feature, isTrialActive ? 'trial' : plan);
  if ((user.aiEnergy ?? 0) < cost) {
    return { ok: false, error: `Out of AI Energy. You need ${cost} but have ${user.aiEnergy ?? 0}.`, status: 402, upgrade: true, cost };
  }
  
  return { ok: true, cost };
}

async function deductCredits({ userId, cost, feature, reason, idem }) {
  if (!cost || cost <= 0) return null;
  const sb = supabaseAdmin();

  console.log('=== ENERGY DEDUCTION (central) ===');
  console.log('Deducting AI Energy via consumeAIEnergy:', { userId, cost, feature, reason });

  try {
    // Prefer centralized energy consumption which handles premium/unlimited users
    const result = await consumeAIEnergy(userId, feature || 'feature', cost, idem || null);
    if (result && result.success) {
      // Record legacy credit transaction for compatibility only when result is a finite number.
      const resultingCredits = Number.isFinite(result.remainingEnergy) ? result.remainingEnergy : null;
      if (resultingCredits !== null) {
        try {
          await sb.from('credit_transactions').insert({
            user_id: userId,
            amount: -cost,
            kind: 'deduct',
            feature: feature || 'unknown',
            reason: reason || 'Feature usage (AI Energy)',
            idempotency_key: idem || null,
            resulting_credits: resultingCredits
          });
        } catch (txErr) {
          console.error('Failed to record credit_transactions after consumeAIEnergy:', txErr);
        }
      }

      return result.remainingEnergy;
    }

    // Fallback to legacy direct credits if consumeAIEnergy failed unexpectedly
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error getting user credits (fallback):', userError);
      throw new Error('Failed to get user credits');
    }

    const currentCredits = userData.credits || 0;
    if (currentCredits < cost) throw new Error('Out of AI Energy. Upgrade to continue using this feature.');

    const newCredits = currentCredits - cost;
    const { error: updateError } = await sb.from('users').update({ credits: newCredits }).eq('id', userId);
    if (updateError) throw new Error('Failed to deduct credits');

    await sb.from('credit_transactions').insert({
      user_id: userId,
      amount: -cost,
      kind: 'deduct',
      feature: feature || 'unknown',
      reason: reason || 'Feature usage (AI Energy)',
      idempotency_key: idem || null,
      resulting_credits: newCredits
    });

    return newCredits;
  } catch (error) {
    console.error('Credit deduction failed:', error);
    throw error;
  }
}

async function rewardCredits({ userId, amount, feature, reason, idem }) {
  if (!amount) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc('reward_credits', {
    p_user: userId,
    p_amount: amount,
    p_feature: feature || null,
    p_reason: reason || null,
    p_idempotency: idem || null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function checkAndResetCredits(userId, userPlan) {
  const sb = supabaseAdmin();
  
  try {
    // Get current user data
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error checking credit reset:', userError);
      return;
    }
    
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const lastResetDate = userData.last_reset_date ? String(userData.last_reset_date).slice(0, 10) : null;

    // Determine if reset is needed. Free/pro/trial reset daily; premium is unlimited and not reset.
    let needsReset = false;
    let creditsToAdd = 0;

    const effectivePlan = (userData.is_trial_active ? 'trial' : (userData.plan || 'free'));

    if (effectivePlan === 'premium') {
      return 0; // Premium users have unlimited AI Energy
    }

    // Daily reset for free, pro, trial
    needsReset = lastResetDate !== today;
    if (needsReset) {
      if (effectivePlan === 'free') creditsToAdd = 20;
      else creditsToAdd = 250; // pro & trial
    }

    if (needsReset && creditsToAdd > 0) {
      console.log(`Daily energy reset for user ${userId}, adding ${creditsToAdd} AI Energy`);

      // Update ai_energy and ai_energy_max and legacy credits for compatibility
      const { error: updateError } = await sb
        .from('users')
        .update({
          ai_energy: creditsToAdd,
          ai_energy_max: creditsToAdd,
          credits: creditsToAdd,
          last_energy_regeneration: now.toISOString(),
          credits_reset_at: now.toISOString(),
          last_reset_date: today
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error resetting daily AI Energy:', updateError);
        throw new Error('Failed to reset AI Energy');
      }

      // Record reset transaction in energy_transactions for auditing
      await sb.from('energy_transactions').insert({
        user_id: userId,
        amount: creditsToAdd,
        kind: 'reset',
        feature: 'daily_reset',
        reason: `${effectivePlan} daily reset`,
        idempotency_key: `daily_reset:${userId}:${today}`
      });

      console.log(`Daily energy reset successful for user ${userId}, new balance: ${creditsToAdd}`);
      return creditsToAdd;
    }

    return 0;
    
  } catch (error) {
    console.error('Credit reset check failed:', error);
    throw error;
  }
}

async function grantAchievement(sb, userId, key, title) {
  const { data: existing } = await sb.from('achievements').select('*').eq('user_id', userId).eq('key', key).single();
  if (existing) return false;
  const { error } = await sb.from('achievements').insert({
    id: uuidv4(),
    user_id: userId,
    key,
    title,
    created_at: new Date().toISOString(),
  });
  if (error) return false;
  return true;
}

async function buildPersonalContext(sb, user) {
  // Personalization should work for all plans (keep it short and safe).
  const { data: recentAttempts } = await sb.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
  const { data: recentNotes } = await sb.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
  const topics = recentAttempts?.map((a) => `${a.topic} (${a.correct}/${a.total})`).join(', ') || 'none yet';
  const weak = recentAttempts?.filter((a) => a.correct / Math.max(a.total, 1) < 0.6).map((a) => a.topic).join(', ') || 'none identified';
  const notesPreview = recentNotes?.map((n) => `- ${n.title}`).join('\n') || 'no notes yet';
  const plan = user.plan || 'free';
  const trial = user.is_trial_active ? ' (trial active)' : '';
  return `\n\nRecent quiz topics: ${topics}\nWeak areas: ${weak}\nRecent notes:\n${notesPreview}\nUser plan: ${plan}${trial}`;
}

function campaignLevelMeta(level) {
  const n = Math.max(1, Number(level) || 1);
  const typeCycle = ['quiz', 'flashcards', 'mixed'];
  const type = typeCycle[(n - 1) % typeCycle.length];
  const difficulty = n <= 3 ? 'easy' : n <= 7 ? 'medium' : 'hard';
  return {
    level_number: n,
    type,
    difficulty,
    reward: 'XP + mastery',
    title: `Level ${n}`,
  };
}

function extractFirstJsonObject(text) {
  if (!text) return null;
  const s = String(text);
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

function safeParseJson(text) {
  try { return JSON.parse(text); } catch {}
  const extracted = extractFirstJsonObject(text);
  if (!extracted) return null;
  try { return JSON.parse(extracted); } catch {}
  return null;
}

function normalizeQuizQuestions(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const q of src) {
    if (!q) continue;
    const question = String(q.question || q.q || '').trim();
    const options = Array.isArray(q.options) ? q.options.map((x) => String(x)) : [];
    const answerIndex = Number.isFinite(q.answer_index) ? q.answer_index : Number.isFinite(q.answerIndex) ? q.answerIndex : Number(q.correct_index);
    const explanation = q.explanation != null ? String(q.explanation) : '';
    if (!question || options.length < 4) continue;
    const opts4 = options.slice(0, 4);
    const ai = Number(answerIndex);
    if (!Number.isFinite(ai) || ai < 0 || ai > 3) continue;
    out.push({ question, options: opts4, answer_index: ai, explanation });
    if (out.length >= 10) break;
  }
  return out;
}

function normalizeFlashcards(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const c of src) {
    if (!c) continue;
    const front = String(c.front || c.question || c.q || '').trim();
    const back = String(c.back || c.answer || c.a || '').trim();
    if (!front || !back) continue;
    out.push({ front, back });
    if (out.length >= 10) break;
  }
  return out;
}

// =========================================================
async function handler(req, { params }) {
  const path = (params?.path || []).join('/');
  const method = req.method;

  try {
    if (path === '' || path === 'health') return json({ ok: true, service: 'Notevoro AI' });

    /* ============ AUTH ============ */
    if ((path === 'auth/signup' || path === 'auth/login' || path === 'auth/google') && method === 'POST') {
      return err('Auth moved to Supabase Auth. Use Supabase client signUp/signIn/signInWithOAuth and then call /api/auth/me with the access_token.', 410);
    }

    if (path === 'auth/password-signup' && method === 'POST') {
      const body = await req.json();
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const name = String(body.name || '').trim().slice(0, 80) || null;
      const personalization = body.personalization && typeof body.personalization === 'object' ? body.personalization : {};
      if (!email) return err('Valid email required', 400);
      if (password.length < 6) return err('Password must be at least 6 characters', 400);

      const sb = supabaseAdmin();
      const created = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || email.split('@')[0], personalization },
      });
      let userId = created.data?.user?.id || null;
      if (created.error) {
        if (!isAlreadyRegisteredError(created.error)) return err(created.error?.message || 'Failed to create user', 500);
        const existingUser = await findAuthUserByEmail(sb, email);
        if (!existingUser?.id) return err('Account already exists. Please log in.', 409);
        userId = existingUser.id;
      }
      if (!userId) return err('Failed to resolve auth user', 500);

      await upsertUserProfile({ userId, email, name: name || email.split('@')[0], personalization });

      const link = await sb.auth.admin.generateLink({ type: 'magiclink', email });
      const tokenHash = link?.data?.properties?.hashed_token || null;
      if (link.error || !tokenHash) return err(link.error?.message || 'Failed to generate login token', 500);

      const anon = supabaseAnon();
      const verified = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
      if (verified.error || !verified.data?.session) {
        return err(verified.error?.message || 'Failed to create session', 500);
      }

      if (emailEnabled()) {
        sendEmail({
          to: email,
          subject: 'Welcome to Notevoro 🚀',
          html: `<p style="font-family:system-ui">Welcome to Notevoro! Your account is ready. Jump into your dashboard and start your first learning streak.</p>`,
        }).catch(() => {});
      }

      return json({
        ok: true,
        session: {
          access_token: verified.data.session.access_token,
          refresh_token: verified.data.session.refresh_token,
        },
      });
    }

    if (path === 'auth/complete-google-personalization' && method === 'POST') {
      const user = await requireUser(req);
      if (!user) return err('Unauthorized', 401);
      const { personalization } = await req.json();
      
      const sb = supabaseAdmin();
      const { error } = await sb.from('users').update({ 
        personalization: personalization || {}
      }).eq('id', user.id);
      
      if (error) throw new Error('Failed to update personalization: ' + error.message);
      
      return json({ ok: true, message: 'Personalization completed' });
    }

    if (path === 'auth/request-otp' && method === 'POST') {
      const body = await req.json();
      const email = normalizeEmail(body.email);
      const name = String(body.name || '').trim().slice(0, 80) || null;
      const personalization = body.personalization && typeof body.personalization === 'object' ? body.personalization : {};
      if (!email) return err('Valid email required', 400);
      if (!emailEnabled()) return err('Email is not configured (RESEND_API_KEY / RESEND_FROM)', 500);

      const sb = supabaseAdmin();
      
      // Check for rate limiting - max 3 OTPs per hour per email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: existingAttempts } = await sb.from('auth_otps').select('*').eq('email', email).gte('created_at', oneHourAgo.toISOString());
      const recentAttempts = existingAttempts?.length || 0;
      
      if (recentAttempts >= 3) {
        return err('Too many OTP requests. Please try again later.', 429);
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const hash = otpHash({ email, code });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean up old attempts
      await sb.from('auth_otps').delete().eq('email', email);
      
      // Insert new OTP
      const { error: oErr } = await sb.from('auth_otps').insert({
        email,
        code_hash: hash,
        expires_at: expiresAt,
        consumed: false,
        attempts: 0,
      });
      if (oErr) return err('Failed to create OTP: ' + oErr.message, 500);

      await sendEmail({
        to: email,
        subject: 'Welcome to Notevoro 🚀',
        html: `
          <div style="background:#0b0b12;padding:32px 12px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.25)">
              <div style="font-size:18px;font-weight:700;color:#0b0b12;margin-bottom:6px">Welcome to Notevoro</div>
              <div style="font-size:13px;color:#52525b;margin-bottom:18px">Use the code below to verify your email and finish creating your account.</div>
              <div style="border:1px solid #e4e4e7;border-radius:14px;padding:18px 16px;text-align:center;background:linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.06))">
                <div style="font-size:12px;color:#6b7280;margin-bottom:8px">Your OTP code</div>
                <div style="font-size:34px;font-weight:800;letter-spacing:6px;color:#111827">${code}</div>
              </div>
              <div style="font-size:12px;color:#71717a;margin-top:14px">This code expires in 10 minutes. If you didn’t request this, you can ignore this email.</div>
              <div style="height:1px;background:#f4f4f5;margin:18px 0"></div>
              <div style="font-size:11px;color:#a1a1aa">Notevoro AI · Study smarter</div>
            </div>
          </div>
        `,
      });

      return json({ ok: true });
    }

    if (path === 'auth/verify-otp' && method === 'POST') {
      const body = await req.json();
      const email = normalizeEmail(body.email);
      const code = String(body.code || '').trim();
      if (!email) return err('Valid email required', 400);
      if (!/^\d{6}$/.test(code)) return err('Invalid code', 400);

      const sb = supabaseAdmin();
      const { data: otpRows, error: otpErr } = await sb
        .from('auth_otps')
        .select('id,email,code_hash,expires_at,consumed,attempts,created_at')
        .eq('email', email)
        .eq('consumed', false)
        .order('created_at', { ascending: false })
        .limit(1);
      if (otpErr) return err('Failed to read OTP: ' + otpErr.message, 500);
      const otp = (otpRows || [])[0] || null;
      if (!otp) return err('Code expired. Request a new code.', 400);
      if (new Date(otp.expires_at).getTime() < Date.now()) return err('Code expired. Request a new code.', 400);
      if ((otp.attempts || 0) >= 5) return err('Too many attempts. Request a new code.', 429);

      const expected = otpHash({ email, code });
      if (expected !== otp.code_hash) {
        await sb.from('auth_otps').update({ attempts: (otp.attempts || 0) + 1 }).eq('id', otp.id);
        return err('Incorrect code', 400);
      }

      await sb.from('auth_otps').update({ consumed: true }).eq('id', otp.id);

      // Get personalization from request body
      const personalization = body.personalization && typeof body.personalization === 'object' ? body.personalization : {};
      const name = body.name || email.split('@')[0];

      let userId = null;
      const created = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name, personalization },
      });
      if (created.error) {
        if (!isAlreadyRegisteredError(created.error)) return err(created.error.message || 'Failed to create user', 500);
        const existingUser = await findAuthUserByEmail(sb, email);
        if (!existingUser?.id) return err('Failed to resolve existing user', 500);
        userId = existingUser.id;
      } else {
        userId = created.data?.user?.id || null;
      }
      if (!userId) return err('Failed to resolve auth user', 500);

      // Ensure profile row exists + personalization saved (trigger may fail)
      await upsertUserProfile({ userId, email, name, personalization });

      // Create a Supabase session without sending any Supabase email:
      // generate link (server-side) -> verify token_hash (server-side) -> return session tokens.
      const link = await sb.auth.admin.generateLink({ type: 'magiclink', email });
      const tokenHash = link?.data?.properties?.hashed_token || null;
      if (link.error || !tokenHash) return err(link.error?.message || 'Failed to generate login token', 500);

      const anon = supabaseAnon();
      const verified = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
      if (verified.error || !verified.data?.session) {
        return err(verified.error?.message || 'Failed to create session', 500);
      }

      // Clean up pending state
      await sb.from('pending_signups').delete().eq('email', email);

      return json({
        ok: true,
        session: {
          access_token: verified.data.session.access_token,
          refresh_token: verified.data.session.refresh_token,
        },
      });
    }

    if (path === 'auth/me' && method === 'GET') {
      try {
        const user = await requireUser(req);
        if (!user) {
          console.log('Auth/me: No user found, returning 401');
          return err('Unauthorized', 401);
        }
        console.log('Auth/me: User found, returning user data');
        return json({ user: publicUser(user) });
      } catch (error) {
        console.error('Auth/me: Error occurred:', error);
        return err('Internal server error', 500);
      }
    }

    if (path === 'analytics/track' && method === 'POST') {
      try {
        const body = await req.json();
        const { event } = body;
        
        if (!event) return err('Event required', 400);
        
        const sb = supabaseAdmin();
        await sb.from('analytics_events').insert({
          event,
          user_id: null, // We'll add user tracking later
          created_at: new Date().toISOString()
        });
        
        return json({ ok: true });
      } catch (error) {
        console.error('Analytics tracking error:', error);
        return json({ ok: true }); // Silently fail for better UX
      }
    }

    /* ============ CHATS ============ */
    if (path === 'chats' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const url = new URL(req.url);
      const q = url.searchParams.get('q');
      let query = sb.from('chats').select('*').eq('user_id', user.id);
      if (q) query = query.ilike('title', `%${q}%`);
      const { data: chats } = await query.order('updated_at', { ascending: false });
      return json({ chats: chats || [] });
    }

    if (path === 'chats' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const id = uuidv4();
      const chat = { id, user_id: user.id, title: 'New Chat', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { error } = await sb.from('chats').insert(chat);
      if (error) return err('Failed to create chat: ' + error.message, 500);
      return json({ chat: { id, title: chat.title, created_at: chat.created_at, updated_at: chat.updated_at } });
    }

    if (path.startsWith('chats/') && path.endsWith('/messages') && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const chatId = path.split('/')[1];
      const sb = supabaseAdmin();
      const { data: chat } = await sb.from('chats').select('*').eq('id', chatId).eq('user_id', user.id).single();
      if (!chat) return err('Chat not found', 404);
      const { data: messages } = await sb.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
      return json({ messages: messages || [] });
    }

    if (path.match(/^chats\/[^/]+$/) && method === 'PATCH') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { title } = await req.json();
      const sb = supabaseAdmin();
      const { error } = await sb.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', path.split('/')[1]).eq('user_id', user.id);
      if (error) return err('Failed to update chat: ' + error.message, 500);
      return json({ ok: true });
    }

    if (path.match(/^chats\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const chatId = path.split('/')[1];
      const sb = supabaseAdmin();
      const { error: deleteError } = await sb.from('chats').delete().eq('id', chatId).eq('user_id', user.id);
      if (deleteError) return err('Failed to delete chat: ' + deleteError.message, 500);
      await sb.from('messages').delete().eq('chat_id', chatId);
      return json({ ok: true });
    }

    /* ============ CHAT (streaming with credits + memory) ============ */
    if (path === 'chat' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'chat');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { chat_id, message } = await req.json();
      if (!chat_id || !message) return err('chat_id and message required');
      const sb = supabaseAdmin();
      const { data: chat } = await sb.from('chats').select('*').eq('id', chat_id).eq('user_id', user.id).single();
      if (!chat) return err('Chat not found', 404);

      await sb.from('messages').insert({
        id: uuidv4(), chat_id, role: 'user', content: message, created_at: new Date().toISOString(),
      });
      const { data: history } = await sb.from('messages').select('role, content').eq('chat_id', chat_id).order('created_at', { ascending: true });
      const isFirst = history.length === 1;
      if (isFirst) {
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        await sb.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chat_id);
      } else {
        await sb.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chat_id);
      }

      const personalContext = await buildPersonalContext(sb, user);
      const sys = `You are Notevoro AI, a friendly, concise AI study partner. Explain clearly with examples. Use markdown headings, bullet points, **bold**, and code blocks where helpful. Encourage the learner.${personalContext}`;

      const charge = await chargeFeatureUsage({
        user,
        feature: 'chat',
        reason: 'AI chat',
        idem: idempotencyKey(req, `chat:${user.id}:${chat_id}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402, { upgrade: true });

      const cli = openai();
      let stream;
      try {
        stream = await cli.chat.completions.create({
          model: modelFor(user), stream: true,
          messages: [{ role: 'system', content: sys }, ...history.map((m) => ({ role: m.role, content: m.content }))],
        });
      } catch (openaiError) {
        console.error('Chat generation failed before streaming:', openaiError);
        if (charge.cost > 0) {
          try {
            await consumeAIEnergy(user.id, 'chat_refund', -charge.cost, `chat:refund:${user.id}:${chat_id}:${Date.now()}`);
          } catch (refundError) {
            console.error('Failed to refund chat energy after generation failure:', refundError);
          }
        }
        return err('Failed to generate chat response', 500);
      }

      const encoder = new TextEncoder();
      let fullText = '';
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices?.[0]?.delta?.content || '';
              if (delta) { fullText += delta; controller.enqueue(encoder.encode(delta)); }
            }
            await sb.from('messages').insert({
              id: uuidv4(), chat_id, role: 'assistant', content: fullText, created_at: new Date().toISOString(),
            });
            await getAIEnergy(user.id);
            await sb.from('users').update({ xp: sb.rpc('xp + 5'), last_active: new Date().toISOString() }).eq('id', user.id);
            const { data: u2 } = await sb.from('users').select('*').eq('id', user.id).single();
            await updateStreak(sb, u2);
            controller.close();
          } catch (e) {
            console.error('Chat streaming failed:', e);
            if (charge.cost > 0) {
              try {
                await consumeAIEnergy(user.id, 'chat_refund', -charge.cost, `chat:refund:${user.id}:${chat_id}:${Date.now()}`);
              } catch (refundError) {
                console.error('Failed to refund chat energy after stream failure:', refundError);
              }
            }
            controller.enqueue(encoder.encode('\n\n[Error: ' + (e.message || 'failed') + ']'));
            controller.close();
          }
        },
      });
      return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }

    /* ============ QUIZ ============ */
    if (path === 'quiz/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'quiz');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, difficulty = 'medium', count = 5 } = await req.json();
      if (!topic) return err('topic required');

      const charge = await chargeFeatureUsage({
        user,
        feature: 'quiz',
        reason: 'Quiz generation',
        idem: idempotencyKey(req, `quiz:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: modelFor(user),
        messages: [
          { role: 'system', content: 'You generate concise, accurate educational MCQs and return only valid JSON.' },
          { role: 'user', content: `Create a multiple-choice quiz of exactly ${count} questions about "${topic}" at ${difficulty} difficulty. Return ONLY valid JSON: {"questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const quizId = uuidv4();
      const sb = supabaseAdmin();
      const { error } = await sb.from('quizzes').insert({ id: quizId, user_id: user.id, topic, difficulty, questions: parsed.questions || [], created_at: new Date().toISOString() });
      if (error) return err('Failed to create quiz: ' + error.message, 500);
      return json({ id: quizId, topic, difficulty, questions: parsed.questions || [] });
    }

    if (path === 'quiz/submit' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { quiz_id, answers } = await req.json();
      const sb = supabaseAdmin();
      const { data: quiz } = await sb.from('quizzes').select('*').eq('id', quiz_id).eq('user_id', user.id).single();
      if (!quiz) return err('Quiz not found', 404);
      let correct = 0;
      const results = quiz.questions.map((q, i) => {
        const userAns = answers?.[i];
        const isRight = userAns === q.answer_index;
        if (isRight) correct++;
        return { question: q.question, correct_index: q.answer_index, user_index: userAns, options: q.options, explanation: q.explanation, is_correct: isRight };
      });
      const total = quiz.questions.length;
      const xpGained = correct * 10;
      
      // Insert into quiz_attempts (not mock_attempts)
      await sb.from('quiz_attempts').insert({
        id: uuidv4(), user_id: user.id, quiz_id: quiz_id, topic: quiz.topic, correct, total, xp_gained: xpGained, created_at: new Date().toISOString(),
      });
      
      // Update user stats: increment quizzes_taken, total_questions, correct_answers, and xp
      await sb.from('users').update({ 
        xp: sb.rpc(`xp + ${xpGained}`),
        quizzes_taken: sb.rpc('quizzes_taken + 1'),
        total_questions: sb.rpc(`total_questions + ${total}`), 
        correct_answers: sb.rpc(`correct_answers + ${correct}`), 
        last_active: new Date().toISOString() 
      }).eq('id', user.id);
      return json({ correct, total, xp_gained: xpGained, results });
    }

    /* ============ FLASHCARDS ============ */
    if (path === 'flashcards/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'flashcards');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, count = 8 } = await req.json();
      if (!topic) return err('topic required');

      const charge = await chargeFeatureUsage({
        user,
        feature: 'flashcards',
        reason: 'Flashcards generation',
        idem: idempotencyKey(req, `flashcards:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: modelFor(user),
        messages: [
          { role: 'system', content: 'You create concise, high-quality flashcards. Return only valid JSON.' },
          { role: 'user', content: `Create exactly ${count} flashcards about "${topic}". Return ONLY JSON: {"cards":[{"front":"...","back":"..."}]}.` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const deckId = uuidv4();
      const sb = supabaseAdmin();
      const deck = {
        id: deckId, user_id: user.id, topic,
        cards: (parsed.cards || []).map((c, i) => ({ id: `c${i}`, front: c.front, back: c.back })),
        created_at: new Date().toISOString(),
      };
      const { error } = await sb.from('flashcard_decks').insert(deck);
      if (error) return err('Failed to create deck: ' + error.message, 500);
      await sb.from('users').update({ xp: sb.rpc('xp + 10'), last_active: new Date().toISOString() }).eq('id', user.id);
      return json(deck);
    }

    if (path === 'flashcards' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: decks } = await sb.from('flashcard_decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return json({ decks: decks || [] });
    }

    if (path.match(/^flashcards\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { error } = await sb.from('flashcard_decks').delete().eq('id', path.split('/')[1]).eq('user_id', user.id);
      if (error) return err('Failed to delete deck: ' + error.message, 500);
      return json({ ok: true });
    }

    /* ============ NOTES ============ */
    if (path === 'notes/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'notes');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { source = '', title = '', topic = '', chat_id = null } = await req.json();
      const sb = supabaseAdmin();
      let body = source;
      if (chat_id) {
        const { data: msgs } = await sb.from('messages').select('role, content').eq('chat_id', chat_id).order('created_at', { ascending: true });
        body = msgs?.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') || '';
      }
      if (!body && !topic) return err('Provide chat_id, source, or topic');

      const charge = await chargeFeatureUsage({
        user,
        feature: 'notes',
        reason: 'Notes generation',
        idem: idempotencyKey(req, `notes:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const cli = openai();
      const prompt = topic
        ? `Create comprehensive, structured study notes on the topic "${topic}". Use markdown with #, ##, bullet points, **bold** terms, and short examples. Make it exam-ready.`
        : `Convert the following into well-structured study notes. Use markdown headings (#, ##), bullet points, **bold** key terms, and a "Key Takeaways" section at the end.\n\n${body.slice(0, 8000)}`;
      const resp = await cli.chat.completions.create({
        model: modelFor(user),
        messages: [
          { role: 'system', content: 'You produce clear, exam-ready study notes in markdown.' },
          { role: 'user', content: prompt },
        ],
      });
      const content = resp.choices[0].message.content || '';
      const id = uuidv4();
      const finalTitle = title || topic || (content.split('\n').find((l) => l.trim().startsWith('#')) || 'Untitled').replace(/^#+\s*/, '').slice(0, 80) || 'Notes';
      const note = {
        id, user_id: user.id, title: finalTitle, content,
        topic: topic || null, source_chat_id: chat_id || null,
        public_slug: null, is_public: false,
        created_at: new Date().toISOString(),
      };
      const { error } = await sb.from('notes').insert(note);
      if (error) return err('Failed to create note: ' + error.message, 500);
      await sb.from('users').update({ xp: sb.rpc('xp + 5'), last_active: new Date().toISOString() }).eq('id', user.id);
      return json(note);
    }

    if (path === 'notes' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: notes } = await sb.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return json({ notes: notes || [] });
    }

    if (path.match(/^notes\/[^/]+$/) && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: note } = await sb.from('notes').select('*').eq('id', path.split('/')[1]).eq('user_id', user.id).single();
      if (!note) return err('Not found', 404);
      return json(note);
    }

    if (path.match(/^notes\/[^/]+\/share$/) && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const id = path.split('/')[1];
      const sb = supabaseAdmin();
      const { data: note } = await sb.from('notes').select('*').eq('id', id).eq('user_id', user.id).single();
      if (!note) return err('Not found', 404);
      const slug = note.public_slug || uuidv4().replace(/-/g, '').slice(0, 12);
      const { error } = await sb.from('notes').update({ public_slug: slug, is_public: true }).eq('id', id);
      if (error) return err('Failed to share note: ' + error.message, 500);
      return json({ slug });
    }

    if (path.match(/^notes\/[^/]+\/unshare$/) && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { error } = await sb.from('notes').update({ is_public: false }).eq('id', path.split('/')[1]).eq('user_id', user.id);
      if (error) return err('Failed to unshare note: ' + error.message, 500);
      return json({ ok: true });
    }

    if (path.match(/^notes\/[^/]+$/) && method === 'DELETE') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { error } = await sb.from('notes').delete().eq('id', path.split('/')[1]).eq('user_id', user.id);
      if (error) return err('Failed to delete note: ' + error.message, 500);
      return json({ ok: true });
    }

    if (path.match(/^public\/notes\/[^/]+$/) && method === 'GET') {
      const slug = path.split('/')[2];
      const sb = supabaseAdmin();
      const { data: note } = await sb.from('notes').select('id,title,content,created_at,user_id').eq('public_slug', slug).eq('is_public', true).single();
      if (!note) return err('Not found', 404);
      const { data: author } = await sb.from('users').select('name,avatar').eq('id', note.user_id).single();
      return json({ note, author: author || null });
    }

    /* ============ STUDY PLAN ============ */
    if (path === 'study-plan/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'study_plan');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { goal = 'general study' } = await req.json();
      const sb = supabaseAdmin();
      const ctx = await buildPersonalContext(sb, user);

      const charge = await chargeFeatureUsage({
        user,
        feature: 'study_plan',
        reason: 'Study plan generation',
        idem: idempotencyKey(req, `study_plan:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: modelFor(user),
        messages: [
          { role: 'system', content: 'You build short, achievable daily study plans for students. Return JSON only.' },
          { role: 'user', content: `Build a 7-day study plan toward this goal: "${goal}". Each day must have 3 tasks (mix of: read/chat, quiz, flashcards). ${ctx}\n\nReturn ONLY JSON: {"goal":"...","days":[{"day":"Day 1","title":"...","tasks":[{"type":"chat|quiz|flashcards|notes","label":"...","topic":"..."}]}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const id = uuidv4();
      const plan = { id, user_id: user.id, goal, ...parsed, created_at: new Date().toISOString() };
      await sb.from('study_plans').delete().eq('user_id', user.id);
      const { error } = await sb.from('study_plans').insert(plan);
      if (error) return err('Failed to create study plan: ' + error.message, 500);
      return json(plan);
    }

    if (path === 'study-plan' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: plan } = await sb.from('study_plans').select('*').eq('user_id', user.id).single();
      return json({ plan: plan || null });
    }

    /* ============ CAMPAIGN ============ */
    if (path === 'campaign' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: progress } = await sb.from('campaign_progress').select('*').eq('user_id', user.id).order('level_number', { ascending: true });
      const completedMax = progress?.filter((p) => p.completed).reduce((m, p) => Math.max(m, p.level_number || 0), 0) || 0;
      const currentLevel = completedMax + 1;
      const levels = Array.from({ length: 15 }, (_, i) => {
        const levelNumber = i + 1;
        const meta = campaignLevelMeta(levelNumber);
        const row = progress?.find((p) => p.level_number === levelNumber);
        return {
          level: levelNumber,
          title: meta.title,
          description: meta.description,
          type: meta.type,
          difficulty: meta.difficulty,
          completed: row?.completed || false,
          score: row?.score || null,
          unlocked: levelNumber <= currentLevel,
        };
      });
      return json({ current_level: currentLevel, levels, progress: progress || [] });
    }

    if (path === 'campaign/start' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { level_number } = await req.json();
      const levelNumber = Math.max(1, Number(level_number) || 1);
      const sb = supabaseAdmin();
      const { data: completed } = await sb.from('campaign_progress').select('level_number').eq('user_id', user.id).eq('completed', true).order('level_number', { ascending: false }).limit(1);
      const maxCompleted = completed?.[0]?.level_number || 0;
      const nextAllowed = maxCompleted + 1;
      if (levelNumber > nextAllowed) return err('Level is locked. Complete previous levels first.', 403);

      const meta = campaignLevelMeta(levelNumber);
      try {
        const { data: energyDeducted, error: energyError } = await sb.rpc('check_and_deduct_energy', {
          p_user: user.id,
          p_feature: 'campaign',
          p_reason: `campaign level ${levelNumber} start`,
          p_idempotency: idempotencyKey(req, `campaign:start:${user.id}:${levelNumber}`),
          p_cost: FEATURE_COSTS.campaign || 1
        });
        if (energyError || energyDeducted === null) {
          console.error('Energy deduction error:', energyError);
          return err('Out of AI Energy. Upgrade to continue.', 402, { upgrade: true, cost: FEATURE_COSTS.campaign || 1 });
        }
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.toUpperCase().includes('INSUFFICIENT')) {
          return err('Out of AI Energy. Upgrade to continue.', 402, { upgrade: true, cost: FEATURE_COSTS.campaign || 1 });
        }
        throw e;
      }

      const cli = openai();
      const kind = meta.type === 'mixed' ? 'quiz' : meta.type;

      if (kind === 'flashcards') {
        let cards = [];
        for (let attempt = 0; attempt < 2; attempt++) {
          const resp = await cli.chat.completions.create({
            model: modelFor(user),
            messages: [
              { role: 'system', content: 'Return ONLY valid JSON. No markdown, no code fences.' },
              { role: 'user', content: `Create exactly 10 flashcards at ${meta.difficulty} difficulty.\nReturn ONLY JSON: {"cards":[{"front":"question/prompt","back":"answer/explanation"}]}\nMake them broadly useful for students (mix of science, math, history, and learning skills).` },
            ],
          });
          const parsed = safeParseJson(resp.choices?.[0]?.message?.content || '');
          cards = normalizeFlashcards(parsed?.cards || parsed?.flashcards || []);
          if (cards.length === 10) break;
        }
        if (cards.length !== 10) return err('AI did not generate flashcards. Please retry.', 500);
        return json({ level: meta, kind: 'flashcards', cards, ai: true });
      }

      // Quiz (also used for "mixed" until a dedicated mixed view exists)
      let questions = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const resp = await cli.chat.completions.create({
          model: modelFor(user),
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON. No markdown, no code fences.' },
            { role: 'user', content: `Create a multiple-choice quiz of exactly 10 questions at ${meta.difficulty} difficulty.\nRules:\n- 4 options per question\n- include answer_index (0-3)\nReturn ONLY JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]}\nQuestions should be broadly useful for students (mix of science, math, history, and reasoning).` },
          ],
        });
        const parsed = safeParseJson(resp.choices?.[0]?.message?.content || '');
        questions = normalizeQuizQuestions(parsed?.questions || parsed?.items || []);
        if (questions.length === 10) break;
      }
      if (questions.length !== 10) return err('AI did not generate quiz questions. Please retry.', 500);
      return json({ level: meta, kind: 'quiz', questions, ai: true });
    }

    if (path === 'campaign/complete' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { level_number, score = 0, correct = 0, total = 0, level_type = 'quiz' } = await req.json();
      const levelNumber = Math.max(1, Number(level_number) || 1);
      const levelScore = Math.max(0, Math.min(100, Number(score) || 0));
      const correctCount = Math.max(0, Number(correct) || 0);
      const totalCount = Math.max(0, Number(total) || 0);
      const sb = supabaseAdmin();

      const { data: completed } = await sb.from('campaign_progress').select('level_number').eq('user_id', user.id).eq('completed', true).order('level_number', { ascending: false }).limit(1);
      const maxCompleted = completed?.[0]?.level_number || 0;
      const nextAllowed = maxCompleted + 1;
      if (levelNumber > nextAllowed) return err('Level is locked. Complete previous levels first.', 403);

      const { data: existing } = await sb.from('campaign_progress').select('*').eq('user_id', user.id).eq('level_number', levelNumber).single();
      if (existing) {
        const { error } = await sb.from('campaign_progress').update({ completed: true, score: levelScore }).eq('user_id', user.id).eq('level_number', levelNumber);
        if (error) return err('Failed to update campaign progress: ' + error.message, 500);
      } else {
        const { error } = await sb.from('campaign_progress').insert({
          id: uuidv4(),
          user_id: user.id,
          level_number: levelNumber,
          started_at: new Date().toISOString(),
          completed: true,
          score: levelScore,
        });
        if (error) return err('Failed to create campaign progress: ' + error.message, 500);
      }

      // Update user stats including quiz stats if it's a quiz level
      const updateData = { 
        last_active: new Date().toISOString(), 
        xp: sb.rpc('xp + 8')
      };
      
      if (level_type === 'quiz' && totalCount > 0) {
        updateData.quizzes_taken = sb.rpc('quizzes_taken + 1');
        updateData.total_questions = sb.rpc(`total_questions + ${totalCount}`);
        updateData.correct_answers = sb.rpc(`correct_answers + ${correctCount}`);
        
        // Also insert into quiz_attempts for tracking
        await sb.from('quiz_attempts').insert({
          id: uuidv4(),
          user_id: user.id,
          quiz_id: uuidv4(), // Generate a unique ID for campaign quiz
          topic: `Campaign Level ${levelNumber}`,
          correct: correctCount,
          total: totalCount,
          xp_gained: 8,
          created_at: new Date().toISOString(),
        });
      }
      
      const { error } = await sb.from('users').update(updateData).eq('id', user.id);
      if (error) return err('Failed to update user: ' + error.message, 500);
      const { data: refreshed } = await sb.from('campaign_progress').select('level_number').eq('user_id', user.id).eq('completed', true).order('level_number', { ascending: false }).limit(1);
      const maxCompleted2 = refreshed?.[0]?.level_number || 0;
      return json({ ok: true, unlocked_level: maxCompleted2 + 1, score: levelScore });
    }

    /* ============ MOCK TEST (Premium) ============ */
    if (path === 'mock-test/generate' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'mock');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const { topic, count = 15, duration_minutes = 20 } = await req.json();
      if (!topic) return err('topic required');

      const charge = await chargeFeatureUsage({
        user,
        feature: 'mock',
        reason: 'Mock test generation',
        idem: idempotencyKey(req, `mock:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const cli = openai();
      const resp = await cli.chat.completions.create({
        model: modelFor(user),
        messages: [
          { role: 'system', content: 'You generate full mock tests. Return JSON only.' },
          { role: 'user', content: `Create a mock test of ${count} mixed-difficulty MCQs on "${topic}". Return ONLY: {"questions":[{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."}]}` },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0].message.content || '{}');
      const id = uuidv4();
      const sb = supabaseAdmin();
      const { error } = await sb.from('mock_tests').insert({ id, user_id: user.id, topic, duration_minutes, questions: parsed.questions || [], created_at: new Date().toISOString() });
      if (error) return err('Failed to create mock test: ' + error.message, 500);
      return json({ id, topic, duration_minutes, questions: parsed.questions || [] });
    }

    if (path === 'mock-test/submit' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { test_id, answers, time_taken_seconds } = await req.json();
      const sb = supabaseAdmin();
      const { data: test } = await sb.from('mock_tests').select('*').eq('id', test_id).eq('user_id', user.id).single();
      if (!test) return err('Test not found', 404);
      let correct = 0;
      const results = test.questions.map((q, i) => {
        const userAns = answers?.[i];
        const ok = userAns === q.answer_index;
        if (ok) correct++;
        return { question: q.question, correct_index: q.answer_index, user_index: userAns, options: q.options, explanation: q.explanation, is_correct: ok };
      });
      const total = test.questions.length;
      const xpGained = correct * 15; // bigger reward
      await sb.from('users').update({ 
        xp: sb.rpc(`xp + ${xpGained}`), 
        quizzes_taken: sb.rpc('quizzes_taken + 1'), 
        correct_answers: sb.rpc(`correct_answers + ${correct}`), 
        total_questions: sb.rpc(`total_questions + ${total}`), 
        last_active: new Date().toISOString() 
      }).eq('id', user.id);
      const { data: u2 } = await sb.from('users').select('*').eq('id', user.id).single();
      await updateStreak(sb, u2);
      await sb.from('mock_attempts').insert({
        id: uuidv4(), user_id: user.id, test_id, topic: test.topic, correct, total, xp_gained: xpGained,
        time_taken_seconds: time_taken_seconds || 0, created_at: new Date().toISOString(),
      });
      return json({ correct, total, xp_gained: xpGained, time_taken_seconds, results });
    }

    /* ============ FILE ANALYSIS (Premium) ============ */
    if (path === 'file-analyze' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const access = checkAccess(user, 'file');
      if (!access.ok) return err(access.error, access.status, { upgrade: access.upgrade });
      const formData = await req.formData();
      const file = formData.get('file');
      const action = formData.get('action') || 'summarize';
      if (!file || typeof file === 'string') return err('file required');

      const charge = await chargeFeatureUsage({
        user,
        feature: 'file',
        reason: 'File analysis',
        idem: idempotencyKey(req, `file:${user.id}:${Date.now()}`),
      });
      if (!charge.success) return err(charge.error || 'Insufficient AI Energy', 402);

      const arrayBuffer = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      const cli = openai();
      let messages;
      const ftype = file.type || '';
      if (ftype.startsWith('image/')) {
        const dataUrl = `data:${ftype};base64,${buf.toString('base64')}`;
        const action_text = action === 'extract' ? 'Extract the key points from this image as a bullet list.' : action === 'explain' ? 'Explain what is shown in this image clearly to a student.' : 'Summarize this image content for studying.';
        messages = [
          { role: 'system', content: 'You are a study assistant. Use markdown formatting.' },
          { role: 'user', content: [
            { type: 'text', text: action_text },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]},
        ];
      } else if (ftype === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf')) {
        const pdfMod = await import('pdf-parse');
        const pdfParse = pdfMod.default || pdfMod;
        let text = '';
        try {
          const data = await pdfParse(buf);
          text = (data.text || '').slice(0, 12000);
        } catch (e) {
          return err('Failed to read PDF: ' + e.message);
        }
        if (!text.trim()) return err('No text extracted from PDF');
        const action_text = action === 'extract' ? 'Extract the key points as a bullet list.' : action === 'explain' ? 'Explain this content clearly to a student.' : 'Summarize this content for studying.';
        messages = [
          { role: 'system', content: 'You are a study assistant. Use markdown formatting.' },
          { role: 'user', content: `${action_text}\n\n---\n${text}` },
        ];
      } else {
        return err('Only images and PDFs are supported', 400);
      }
      const resp = await cli.chat.completions.create({ model: modelFor(user), messages });
      const result = resp.choices[0].message.content || '';
      const sb = supabaseAdmin();
      const id = uuidv4();
      const { error } = await sb.from('file_analyses').insert({
        id, user_id: user.id, filename: file.name, type: ftype, action, result, created_at: new Date().toISOString(),
      });
      if (error) return err('Failed to save file analysis: ' + error.message, 500);
      return json({ id, filename: file.name, action, result });
    }

    /* ============ DASHBOARD ============ */
    if (path === 'dashboard' && method === 'GET') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const sb = supabaseAdmin();
      const { data: recentAttempts } = await sb.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      const { data: mockAttempts } = await sb.from('mock_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      const { data: recentChats } = await sb.from('chats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5);
      const accuracy = user.total_questions > 0 ? Math.round((user.correct_answers / user.total_questions) * 100) : 0;
      // Weak topics
      const topicMap = {};
      for (const a of recentAttempts || []) {
        if (!a.topic) continue;
        if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0 };
        topicMap[a.topic].correct += a.correct;
        topicMap[a.topic].total += a.total;
      }
      const weakTopics = Object.entries(topicMap)
        .filter(([_, stats]) => stats.total >= 5 && stats.correct / stats.total < 0.6)
        .map(([topic, stats]) => ({ topic, accuracy: Math.round((stats.correct / stats.total) * 100) }))
        .slice(0, 5);

      // XP series for last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = d.toISOString().slice(0, 10);
        const dayAttempts = (recentAttempts || []).filter((a) => a.created_at.startsWith(date));
        const dayXp = dayAttempts.reduce((sum, a) => sum + (a.xp_gained || 0), 0);
        days.push({ date, xp: dayXp });
      }

      return json({
        user: { name: user.name, xp: user.xp, streak: user.streak, plan: user.plan, credits: user.credits, accuracy },
        recent_attempts: (recentAttempts || []).slice(0, 10),
        mock_attempts: mockAttempts || [],
        recent_chats: recentChats || [],
        weak_topics: weakTopics,
        xp_series: days,
      });
    }

    /* ============ PAYMENTS ============ */
    if (path === 'payment/checkout' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { plan, amount, currency, order_id } = await req.json();
      
      // Create Razorpay order on backend
      const rp = razorpayClient();
      const order = await rp.orders.create({
        amount: amount || 29900, // Default to ₹299 for Pro
        currency: currency || 'INR',
        receipt: `nv_${user.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: { user_id: user.id, plan },
        payment_capture: 1,
      });
      
      // Store order in database
      const sb = supabaseAdmin();
      const { error } = await sb.from('orders').insert({
        id: order.id, 
        user_id: user.id, 
        plan, 
        amount: amount || 29900, 
        status: 'created', 
        created_at: new Date().toISOString(),
      });
      
      if (error) return err('Failed to create order: ' + error.message, 500);
      
      // Return payment URL for frontend
      console.log('payment/checkout: Returning order data', {
        order_id: order.id,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
      });
      
      return json({ 
        order_id: order.id, 
        payment_url: `https://api.razorpay.com/pay/${order.id}`,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
        amount: order.amount, 
        currency: order.currency 
      });
    }

    if (path === 'create-order' && method === 'POST') {
      console.log('create-order: Processing request');
      const user = await requireUser(req); 
      if (!user) {
        console.log('create-order: No user found, returning 401');
        return err('Unauthorized', 401);
      }
      console.log('create-order: User authenticated:', user.id);
      const { plan } = await req.json();
      const amountInPaise = (PLAN_PRICES[plan] || 0) * 100;
      if (!amountInPaise) return err('Invalid plan');
      const rp = razorpayClient();
      const order = await rp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `nv_${user.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: { user_id: user.id, plan },
      });
      const sb = supabaseAdmin();
      const { error } = await sb.from('orders').insert({
        id: order.id, user_id: user.id, plan, amount: amountInPaise, status: 'created', created_at: new Date().toISOString(),
      });
      if (error) return err('Failed to create order: ' + error.message, 500);
      return json({ 
        ok: true, 
        order_id: order.id,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        user: publicUser(user) 
      });
    }

    /* ============ PAYMENT VERIFICATION ============ */
    if (path === 'payment/verify' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
      
      console.log('Payment verification request:', { razorpay_order_id, razorpay_payment_id });
      
      try {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        if (expectedSignature !== razorpay_signature) {
          console.error('Invalid payment signature for order:', razorpay_order_id, { expectedSignature, razorpay_signature });
          throw new Error('Invalid payment signature');
        }

        console.log('Payment verification successful for order:', razorpay_order_id);
        
        // Update user plan and add credits based on plan
        const sb = supabaseAdmin();
        const { data: order, error: orderError } = await sb.from('orders').select('*').eq('id', razorpay_order_id).single();
        if (orderError) {
          console.error('Failed to fetch order for payment verification:', orderError);
          return err('Failed to verify order', 500);
        }
        if (!order) {
          return err('Order not found', 404);
        }
        if (order.user_id !== user.id) {
          console.error('Order ownership mismatch:', { orderUserId: order.user_id, currentUserId: user.id });
          return err('Order not found for this user', 404);
        }

        if (order.status === 'paid') {
          console.log('Order already marked as paid:', razorpay_order_id);
          return json({ success: true, plan: order.plan, message: 'Order already verified' });
        }

        const planEnergy = order.plan === 'premium' ? null : PLAN_ENERGY[order.plan] ?? 250;
        if (order.plan !== 'premium' && !(order.plan in PLAN_ENERGY)) {
          return err('Invalid plan in order', 400);
        }
        const updatePayload = {
          plan: order.plan,
          subscription_status: 'active',
          is_trial_active: false,
          trial_start: null,
          trial_ends_at: null,
          last_energy_regeneration: new Date().toISOString(),
          last_reset_date: new Date().toISOString().slice(0, 10)
        };

        if (planEnergy === null) {
          updatePayload.ai_energy = null;
          updatePayload.ai_energy_max = null;
        } else {
          updatePayload.ai_energy = planEnergy;
          updatePayload.ai_energy_max = planEnergy;
        }

        const { error } = await sb.from('users').update(updatePayload).eq('id', user.id);

        if (planEnergy !== null) {
          await sb.from('credit_transactions').insert({
            user_id: user.id,
            amount: planEnergy,
            kind: 'purchase',
            feature: 'subscription',
            reason: `${order.plan} plan`,
            idempotency_key: razorpay_payment_id
          });
        }

        await sb.from('orders').update({
          status: 'paid',
          payment_id: razorpay_payment_id,
          paid_at: new Date().toISOString()
        }).eq('id', razorpay_order_id);
        
        if (error) throw new Error('Failed to update user plan: ' + error.message);
        
        console.log('Payment verified and user upgraded:', user.id, 'plan:', order.plan, 'energy:', planEnergy);
        
        return json({ success: true, plan: order.plan, aiEnergy: planEnergy });
      } catch (error) {
        console.error('Payment verification failed:', error);
        return err('Payment verification failed: ' + error.message, 400);
      }
    }

    /* ============ USER ONBOARDING ============ */
    if (path === 'user/onboarding' && method === 'POST') {
      const user = await requireUser(req); if (!user) return err('Unauthorized', 401);
      const { personalization } = await req.json();
      
      const sb = supabaseAdmin();
      const { error } = await sb.from('users').update({ 
        personalization: {
          ...(user.personalization || {}),
          ...personalization
        }
      }).eq('id', user.id);
      
      if (error) return err('Failed to save onboarding data: ' + error.message, 500);
      
      return json({ success: true });
    }

    /* ============ CONFIG ============ */
    if (path === 'config/plans' && method === 'GET') {
      return json({ energy: PLAN_ENERGY, costs: FEATURE_COSTS, tiers: FEATURE_TIERS });
    }

    /* ============ CRON ============ */
    if (path === 'cron/daily-energy-reset' && method === 'POST') {
      const secret = process.env.CRON_SECRET;
      if (!secret) return err('CRON_SECRET not configured', 500);
      if ((req.headers.get('x-cron-secret') || '') !== secret) return err('Unauthorized', 401);

      const sb = supabaseAdmin();
      const { data: result, error } = await sb.rpc('daily_energy_reset');
      if (error) {
        console.error('Daily energy reset error:', error);
        return err(error.message, 500);
      }
      console.log('Daily energy reset:', result);
      return json({ ok: true, users_reset: result?.[0]?.users_reset || 0, error: result?.[0]?.errors || null });
    }

    if (path === 'cron/expire-trials' && method === 'POST') {
      const secret = process.env.CRON_SECRET;
      if (!secret) return err('CRON_SECRET not configured', 500);
      if ((req.headers.get('x-cron-secret') || '') !== secret) return err('Unauthorized', 401);

      const sb = supabaseAdmin();
      const { data: result, error } = await sb.rpc('expire_trials');
      if (error) {
        console.error('Expire trials error:', error);
        return err(error.message, 500);
      }
      console.log('Trials expired:', result);
      return json({ ok: true, trials_expired: result?.[0]?.trials_expired || 0, error: result?.[0]?.errors || null });
    }

    if (path === 'cron/monthly-reset' && method === 'POST') {
      return err('Legacy monthly reset endpoint disabled. Use the new AI energy daily reset flow.', 404);

      /*
      const secret = process.env.CRON_SECRET;
      if (!secret) return err('CRON_SECRET not configured', 500);
      if ((req.headers.get('x-cron-secret') || '') !== secret) return err('Unauthorized', 401);

      const sb = supabaseAdmin();
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10); // YYYY-MM-DD
      const { data: users, error } = await sb
        .from('users')
        .select('id, plan, subscription_status, last_reset_date')
        .lt('last_reset_date', cutoff)
        .limit(5000);
      if (error) return err(error.message, 500);

      let reset = 0;
      for (const u of users || []) {
        const active = (u.subscription_status || 'inactive') === 'active';
        const plan = active ? (u.plan || 'free') : 'free';
        const credits = PLAN_CREDITS[plan] || PLAN_CREDITS.free;
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { error: rerr } = await sb.rpc('reset_credits', {
          p_user: u.id,
          p_new_credits: credits,
          p_reason: 'monthly reset',
          p_idempotency: `monthly:${u.id}:${monthKey}`,
        });
        if (!rerr) reset++;
      }

      return json({ ok: true, scanned: (users || []).length, reset });
      */
    }

    if (path === 'cron/daily-reset' && method === 'POST') {
      const secret = process.env.CRON_SECRET;
      if (!secret) return err('CRON_SECRET not configured', 500);
      if ((req.headers.get('x-cron-secret') || '') !== secret) return err('Unauthorized', 401);

      const sb = supabaseAdmin();
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const { data: users, error } = await sb
        .from('users')
        .select('id, plan, subscription_status, is_trial_active, last_reset_date')
        .limit(5000);
      if (error) return err(error.message, 500);

      let reset = 0;
      for (const u of users || []) {
        const effectivePlan = u.is_trial_active ? 'trial' : (u.plan || 'free');
        if (effectivePlan === 'premium') continue;
        const lastReset = String(u.last_reset_date || '').slice(0, 10);
        if (lastReset === today) continue;

        const credits = effectivePlan === 'free' ? 20 : 250;
        const { error: rerr } = await sb.rpc('reset_credits', {
          p_user: u.id,
          p_new_credits: credits,
          p_reason: 'daily reset',
          p_idempotency: `daily:${u.id}:${today}`,
        });
        if (!rerr) reset++;
        // Also reset AI energy for non-premium users
        try {
          const energyValue = effectivePlan === 'free' ? 20 : 250;
          await sb.from('users').update({ ai_energy: energyValue, ai_energy_max: energyValue, last_energy_regeneration: new Date().toISOString() }).eq('id', u.id);
        } catch (e) {
          console.warn('Failed to reset ai_energy for user', u.id, e?.message || e);
        }
      }

      return json({ ok: true, scanned: (users || []).length, reset });
    }

    if (path === 'cron/daily-emails' && method === 'POST') {
      const secret = process.env.CRON_SECRET;
      if (!secret) return err('CRON_SECRET not configured', 500);
      if ((req.headers.get('x-cron-secret') || '') !== secret) return err('Unauthorized', 401);
      if (!emailEnabled()) return json({ ok: true, skipped: true });

      const sb = supabaseAdmin();
      const { data: users, error } = await sb
        .from('users')
        .select('email,name,credits,streak,plan')
        .not('email', 'is', null)
        .limit(5000);
      if (error) return err(error.message, 500);

      let sent = 0;
      for (const u of users || []) {
        try {
          await sendEmail({
            to: u.email,
            subject: 'Your daily study reminder',
            html: `<p>Hi ${u.name || 'there'},</p>
              <p>Quick reminder to keep your streak going.</p>
              <p><b>Plan:</b> ${String(u.plan || 'free').toUpperCase()} · <b>Credits remaining:</b> ${u.credits ?? 0} · <b>Streak:</b> ${u.streak ?? 0} days</p>`,
          });
          sent++;
        } catch {
          // ignore per-user failures
        }
      }

      return json({ ok: true, sent, scanned: (users || []).length });
    }

    return err('Not found: ' + path, 404);
  } catch (e) {
    console.error('API error', e);
    return err(e.message || 'Server error', 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;
