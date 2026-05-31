import { generateOnboardingLinkToken } from '../../../../lib/onboarding/onboardingManager.js';
import { createClient } from '@/lib/supabase/server';
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

    console.log('Onboarding WhatsApp link request:', {
      whatsappNumber: whatsappNumber ? 'provided' : 'default',
      timestamp: new Date().toISOString()
    });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Onboarding WhatsApp auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
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
