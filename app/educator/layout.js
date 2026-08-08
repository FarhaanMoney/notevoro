import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EducatorSidebar } from '@/components/EducatorSidebar'

export default async function EducatorLayout({ children }) {
  const supabase = await createClient()

  // Preview mode when Supabase isn't configured yet
  if (!supabase) {
    const demoUser = { email: 'demo@notevoro.app' }
    const demoProfile = { display_name: 'Demo Educator', full_name: 'Demo Educator', workspace_type: 'educator' }
    return (
      <div className="flex min-h-screen bg-background gradient-bg">
        <EducatorSidebar user={demoUser} profile={demoProfile} previewMode />
        <main className="flex-1 min-w-0">
          <div className="px-4 py-2 text-center text-xs bg-amber-500/10 border-b border-amber-500/30 text-amber-300">
            🔌 Preview mode — add Supabase &amp; OpenAI keys to <code className="px-1">/app/.env</code> to enable auth &amp; AI
          </div>
          {children}
        </main>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[educator/layout] No user, redirecting to /login')
    redirect('/login')
  }
  
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  
  console.log('[EDUCATOR LAYOUT DEBUG]', {
    userId: user.id,
    profileExists: !!profile,
    profileWorkspaceType: profile?.workspace_type,
    profileError: profileError?.message
  })
  
  if (profileError) {
    console.error('[educator/layout] Profile query error:', profileError)
    console.error('[educator/layout] User ID:', user.id, 'Error details:', JSON.stringify(profileError))
    // DO NOT redirect to /dashboard - this causes the production bug
    // Instead, allow the page to load and handle the error gracefully
  }
  
  // Only redirect to student workspace if profile exists and user is not an educator
  // DO NOT redirect if profile lookup failed - this causes the production bug
  if (profile && profile.workspace_type !== 'educator') {
    console.log('[REDIRECT DEBUG]', {
      from: '/educator/dashboard',
      to: '/dashboard',
      reason: 'User is not educator in educator layout',
      workspaceType: profile.workspace_type
    })
    console.log('[educator/layout] User is not educator (workspace_type:', profile.workspace_type, '), redirecting to /dashboard')
    redirect('/dashboard')
  }
  
  // If profile doesn't exist, log the error but don't redirect
  if (!profile) {
    console.error('[educator/layout] PROFILE NOT FOUND for user ID:', user.id)
    console.error('[educator/layout] This indicates the profile creation trigger may have failed')
  }

  return (
    <div className="flex min-h-screen bg-background gradient-bg">
      <EducatorSidebar user={user} profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
