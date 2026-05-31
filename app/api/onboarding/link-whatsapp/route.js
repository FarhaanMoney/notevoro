import { generateOnboardingLinkToken } from '../../../../lib/onboarding/onboardingManager.js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Request must be JSON' }, { status: 400 });
    }

    const body = await request.json();
    const whatsappNumber = body?.whatsappNumber?.trim();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('Onboarding WhatsApp link request:', {
      hasToken: !!token,
      whatsappNumber: whatsappNumber ? 'provided' : 'default',
      timestamp: new Date().toISOString()
    });

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const sb = supabaseAdmin();
    const { data: authUser, error: authError } = await sb.auth.getUser(token);
    if (authError || !authUser?.user) {
      console.error('Onboarding WhatsApp auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'Could not resolve user from auth token' }, { status: 401 });
    }

    const result = await generateOnboardingLinkToken(userId, whatsappNumber);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Onboarding WhatsApp link error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
