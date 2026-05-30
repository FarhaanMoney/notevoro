import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('Auth me route hit');
    console.log('Request cookies:', req.headers.get('cookie'));
    
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log('All cookies from cookieStore:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) })));
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth me error:', authError);
    console.log('Auth me user:', user);
    
    if (authError || !user) {
      console.log('User not authenticated in auth/me');
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }
    
    console.log('User authenticated in auth/me:', user.id, user.email);
    
    return NextResponse.json({ 
      user: {
        ...user,
        ...profile,
      }
    });
  } catch (error) {
    console.error('Auth me route error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
