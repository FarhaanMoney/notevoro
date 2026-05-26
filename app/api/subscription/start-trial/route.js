import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin.js';
import { ensureUserProfile } from '../../../../lib/auth/ensureUserProfile.js';
import { startProTrialDb } from '../../../../lib/subscription/trialManagerDb.js';

function parseBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^[Bb]earer\s+/, '').trim();
  return token || null;
}

export async function POST(request) {
  try {
    const token = parseBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const sb = supabaseAdmin();
    const { data: authData, error: authError } = await sb.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error('Start-trial auth failed:', authError?.message || authError, { token: Boolean(token) });
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message || 'Invalid session' }, { status: 401 });
    }

    const userId = authData.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'Could not resolve authenticated user' }, { status: 401 });
    }

    const userProfile = await ensureUserProfile(userId, authData.user);
    if (!userProfile) {
      console.error('Failed to ensure user profile for trial start:', { userId });
      return NextResponse.json({ error: 'Unable to resolve user profile' }, { status: 500 });
    }

    console.log('Start-trial: beginning trial activation', {
      userId,
      email: userProfile.email || null,
      plan: userProfile.plan,
      hasProfile: Boolean(userProfile.id)
    });

    const trialResult = await startProTrialDb(userId);

    return NextResponse.json({ ok: true, trial: trialResult });
  } catch (err) {
    const message = err?.message || 'Server error';
    const status = /unauthorized|auth/i.test(message) ? 401 : /already used/i.test(message) ? 409 : /not found/i.test(message) ? 404 : 500;

    console.error('Start trial error:', { message, stack: err?.stack });
    return NextResponse.json({ error: message }, { status });
  }
}
