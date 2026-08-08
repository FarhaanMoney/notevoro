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
        console.log('[auth/callback] User authenticated:', data.user.id, data.user.email)

        // Ensure user has all required records
        const recordsCreated = await ensureUserRecords(
          data.user.id,
          data.user.email,
          data.user.user_metadata
        )

        if (!recordsCreated) {
          console.error('[auth/callback] Failed to create user records')
          return NextResponse.redirect(new URL('/login?error=user_records', url.origin))
        }

        console.log('[auth/callback] User records created successfully')

        // Log the login activity
        try {
          await logActivity(data.user.id, 'login', 'user', data.user.id)
        } catch (logError) {
          console.error('[auth/callback] Activity log error (non-critical):', logError)
        }

        // Determine redirect based on workspace type
        const { data: profile } = await supabase.from('profiles').select('workspace_type').eq('id', data.user.id).single()
        const workspaceType = profile?.workspace_type || 'student'
        const defaultNext = workspaceType === 'educator' ? '/educator/dashboard' : '/dashboard'
        const redirectPath = next || defaultNext

        return NextResponse.redirect(new URL(redirectPath, url.origin))
      }
      console.error('[auth/callback] exchange error:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
