import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

let client: SupabaseClient | null = null;

export function supabaseServer() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
  }

  client = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export async function createServerSupabaseClient(req?: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
  }

  // If request is provided, check for Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    console.log('Server client: Authorization header:', authHeader ? 'exists' : 'none');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return createClient(url, anon, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            authorization: authHeader,
          },
        },
      });
    }
  }

  // Fall back to cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  console.log('Server client: All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value.length })));
  const cookie = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
  console.log('Server client: Cookie string length:', cookie.length);

  return createClient(url, anon, {
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
}
