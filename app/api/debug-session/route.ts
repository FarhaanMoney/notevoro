import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log('Debug session route hit');
    console.log('Request headers:', req.headers.get('authorization'));
    console.log('Request cookies:', req.headers.get('cookie'));
    
    const supabase = await createServerSupabaseClient(req);
    console.log('Supabase client created');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Session error:', sessionError);
    
    if (sessionError || !session) {
      console.log('No session found');
      return NextResponse.json({
        hasSession: false,
        error: sessionError?.message || 'No session found'
      });
    }
    
    console.log('Session found:', session.user.id, session.user.email);
    
    return NextResponse.json({
      hasSession: true,
      userId: session.user.id,
      email: session.user.email,
      accessTokenExists: !!session.access_token,
      accessTokenLength: session.access_token?.length || 0,
      userMetadata: session.user.user_metadata
    });
  } catch (error) {
    console.error('Debug session route error:', error);
    return NextResponse.json({
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
