import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'

// Supabase OAuth callback — exchanges the auth code for a session cookie
// Docs: https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/dashboard'
  const queryWorkspaceType = url.searchParams.get('workspace_type')

  if (code) {
    const supabase = await createClient()
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data?.user) {
        console.log('[auth/callback] User authenticated:', data.user.id, data.user.email)
        console.log('[auth/callback] Query workspace_type:', queryWorkspaceType)
        console.log('[auth/callback] Auth metadata workspace_type:', data.user.user_metadata?.workspace_type)

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

        // If workspace_type was passed in query params (from GoogleButton), update the profile
        if (queryWorkspaceType && queryWorkspaceType !== 'student') {
          console.log('[auth/callback] Updating profile workspace_type from query:', queryWorkspaceType)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ workspace_type: queryWorkspaceType })
            .eq('id', data.user.id)
          
          if (updateError) {
            console.error('[auth/callback] Failed to update workspace_type:', updateError)
          } else {
            console.log('[auth/callback] Profile workspace_type updated successfully')
          }
        }

        // Log the login activity
        try {
          await logActivity(data.user.id, 'login', 'user', data.user.id)
        } catch (logError) {
          console.error('[auth/callback] Activity log error (non-critical):', logError)
        }

        // Determine redirect based on workspace type
        const { data: profile, error: profileError } = await supabase.from('profiles').select('workspace_type').eq('id', data.user.id).maybeSingle()
        
        if (profileError) {
          console.error('[auth/callback] Profile query error:', profileError)
          console.error('[auth/callback] User ID:', data.user.id, 'Error details:', JSON.stringify(profileError))
        }
        
        if (!profile) {
          console.error('[auth/callback] PROFILE NOT FOUND for user ID:', data.user.id)
          console.error('[auth/callback] This indicates the profile creation trigger may have failed')
          return NextResponse.redirect(new URL('/login?error=profile_not_found', url.origin))
        }
        
        const workspaceType = profile?.workspace_type || 'student'
        console.log('[auth/callback] Final workspace_type for redirect:', workspaceType)
        const defaultNext = workspaceType === 'educator' ? '/educator/dashboard' : '/dashboard'
        const redirectPath = next || defaultNext
        console.log('[auth/callback] Found profile with workspace_type:', workspaceType, 'Redirecting to:', redirectPath)

        return NextResponse.redirect(new URL(redirectPath, url.origin))
      }
      console.error('[auth/callback] exchange error:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
