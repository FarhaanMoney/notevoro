import { startProTrialDb } from '../../../../lib/subscription/trialManagerDb.js';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '../../../../lib/auth/ensureUserProfile.js';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Start-trial auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    if (!userId) return NextResponse.json({ error: 'Could not resolve user' }, { status: 401 });

    // Ensure user profile exists in the users table before starting trial
    const userProfile = await ensureUserProfile(userId, user);
    if (!userProfile) {
      console.error('Failed to ensure user profile for trial start:', userId);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // Log minimal context to help debug missing DB rows
    try {
      console.log('Start-trial: resolved userId for trial start', userId, { userProfileExists: Boolean(userProfile?.id) });
    } catch (e) {
      // ignore logging errors
    }

    const result = await startProTrialDb(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Start trial error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
