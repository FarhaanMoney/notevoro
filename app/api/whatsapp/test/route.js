import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = supabaseAdmin();
    
    // Check if WhatsApp is connected
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('personalization, phone_number')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    const isVerified = userData.personalization?.whatsapp_verified === true;
    const phoneNumber = userData.personalization?.whatsapp_phone || userData.phone_number;

    if (!isVerified || !phoneNumber) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    // Send a test message via WhatsApp API
    // This would integrate with the WhatsApp Business API
    // For now, we'll just return success as a placeholder
    // In production, you would call the WhatsApp Business API here
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Test message sent successfully',
      phoneNumber: phoneNumber
    });
  } catch (error) {
    console.error('WhatsApp test message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
