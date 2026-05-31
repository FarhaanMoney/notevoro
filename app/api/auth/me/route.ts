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
    
    // Get user profile using admin client to bypass RLS
    console.log('Fetching profile with admin client (bypasses RLS)');
    const admin = supabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('Profile query result:', profile);
    console.log('Profile query error:', profileError);
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Profile doesn't exist yet, create it using admin client
      console.log('Creating profile for user:', user.id);
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
        if (insertError.code === '23505') {
          // Profile already exists, fetch it with admin client
          console.log('Profile already exists, fetching with admin client');
          const { data: existingProfile } = await admin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          return NextResponse.json({ 
            user: {
              ...user,
              ...existingProfile,
            }
          });
        }
      } else {
        console.log('Profile created successfully');
        // Fetch the newly created profile
        const { data: newProfile } = await admin
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

    // Also ensure user record exists in users table
    const { data: existingUser, error: userCheckError } = await admin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (userCheckError || !existingUser) {
      console.log('User record missing in users table, creating it');
      const now = new Date().toISOString();
      const { error: userInsertError } = await admin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          xp: 0,
          streak: 0,
          last_active: now,
          plan: 'pro',
          ai_energy: 250,
          ai_energy_max: 250,
          last_energy_regeneration: now,
          last_reset_date: now.slice(0, 10),
          trial_start: now,
          is_trial_active: true,
          daily_reward_date: null,
          weekly_reward_claimed: false,
          subscription_status: 'inactive',
          quizzes_taken: 0,
          correct_answers: 0,
          total_questions: 0,
          personalization: user.user_metadata || {},
        });
      
      if (userInsertError) {
        console.error('User record creation error:', userInsertError);
      } else {
        console.log('User record created successfully');
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
