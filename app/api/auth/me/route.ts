import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('Auth me route hit');
    console.log('Request cookies:', req.headers.get('cookie'));
    console.log('Authorization header:', req.headers.get('authorization'));
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
    }

    // Try to get user from cookies first
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log('All cookies from cookieStore:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) })));
    
    const cookie = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    let supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie,
        },
      },
    });

    let { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth me error (cookies):', authError);
    console.log('Auth me user (cookies):', user);
    
    // If cookies fail, try Authorization header
    if (authError || !user) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Trying with Bearer token');
        
        supabase = createClient(url, anon, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              authorization: `Bearer ${token}`,
            },
          },
        });
        
        const result = await supabase.auth.getUser();
        user = result.data.user;
        authError = result.error;
        
        console.log('Auth me error (token):', authError);
        console.log('Auth me user (token):', user);
      }
    }
    
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
