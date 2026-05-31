import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log('Debug route hit');
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth error:', authError);
    console.log('User:', user);
    
    if (authError || !user) {
      console.log('User not authenticated');
      return NextResponse.json({ 
        authenticated: false,
        error: authError?.message || 'No user found'
      }, { status: 401 });
    }
    
    console.log('User authenticated:', user.id, user.email);
    
    return NextResponse.json({ 
      authenticated: true,
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
