import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'

// Supabase OAuth callback — exchanges the auth code for a session cookie
// Docs: https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data?.user) {
        // Ensure user has all required records
        await ensureUserRecords(
          data.user.id,
          data.user.email,
          data.user.user_metadata
        )
        
        // Log the login activity
        await logActivity(data.user.id, 'login', 'user', data.user.id)
        
        return NextResponse.redirect(new URL(next, url.origin))
      }
      console.error('[auth/callback] exchange error:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
