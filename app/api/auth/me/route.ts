import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin.js';

export async function GET(req: NextRequest) {
  try {
    console.log('Auth me route hit');
    console.log('Request cookies:', req.headers.get('cookie'));
    console.log('Authorization header:', req.headers.get('authorization'));
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'yes' : 'no');
    console.log('Token length:', token?.length);
    
    if (!token) {
      console.log('No token found in Authorization header');
      return NextResponse.json({ error: 'Unauthorized', details: 'No token provided' }, { status: 401 });
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
    }
    
    const supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('User:', user);
    console.log('Auth error:', authError);
    
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
      // Profile doesn't exist yet, create it using admin client
      console.log('Creating profile for user:', user.id);
      const admin = supabaseAdmin();
      const { error: insertError } = await admin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        });
      
      if (insertError) {
        console.error('Profile creation error:', insertError);
      } else {
        console.log('Profile created successfully');
        // Fetch the newly created profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        return NextResponse.json({ 
          user: {
            ...user,
            ...newProfile,
          }
        });
      }
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
