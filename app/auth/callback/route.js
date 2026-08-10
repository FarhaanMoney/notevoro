import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ensureUserRecords, logActivity } from '@/lib/auth/user-init'
import { normalizeWorkspaceType, resolveWorkspaceType } from '@/lib/auth/profile-recovery'

// Supabase OAuth callback — exchanges the auth code for a session cookie
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const queryWorkspaceType = url.searchParams.get('workspace_type')

  if (code) {
    const supabase = await createClient()
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data?.user) {
        console.log('[auth/callback] User authenticated:', data.user.id, data.user.email)
        console.log('[auth/callback] Query workspace_type:', queryWorkspaceType)
        console.log('[auth/callback] Auth metadata workspace_type:', data.user.user_metadata?.workspace_type)

        const metadata = {
          ...(data.user.user_metadata || {}),
          ...(queryWorkspaceType ? { workspace_type: queryWorkspaceType } : {}),
        }

        const recordsCreated = await ensureUserRecords(
          data.user.id,
          data.user.email,
          metadata
        )

        if (!recordsCreated) {
          console.error('[auth/callback] Failed to create user records')
          return NextResponse.redirect(new URL('/login?error=user_records', url.origin))
        }

        console.log('[auth/callback] User records created successfully')

        const resolvedWorkspace = normalizeWorkspaceType(
          queryWorkspaceType ||
            data.user.user_metadata?.workspace_type ||
            'student'
        )

        if (resolvedWorkspace !== 'student') {
          const admin = supabaseAdmin || supabase
          const { error: updateError } = await admin
            .from('profiles')
            .update({ workspace_type: resolvedWorkspace })
            .eq('id', data.user.id)

          if (updateError) {
            console.error('[auth/callback] Failed to update workspace_type:', updateError)
          } else {
            console.log('[auth/callback] Profile workspace_type set to:', resolvedWorkspace)
          }
        }

        try {
          await logActivity(data.user.id, 'login', 'user', data.user.id)
        } catch (logError) {
          console.error('[auth/callback] Activity log error (non-critical):', logError)
        }

        const { workspaceType } = await resolveWorkspaceType(supabase, {
          ...data.user,
          user_metadata: metadata,
        })

        const finalWorkspace = workspaceType || resolvedWorkspace
        console.log('[auth/callback] Final workspace_type for redirect:', finalWorkspace)
        const defaultNext = finalWorkspace === 'educator' ? '/educator/dashboard' : '/dashboard'
        const redirectPath = next || defaultNext
        console.log('[auth/callback] Redirecting to:', redirectPath)

        return NextResponse.redirect(new URL(redirectPath, url.origin))
      }
      console.error('[auth/callback] exchange error:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
