import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalSidebar } from '@/components/ProfessionalSidebar'

export default async function ProfessionalLayout({ children }) {
  const supabase = await createClient()

  if (!supabase) {
    const demoUser = { email: 'demo@notevoro.app' }
    const demoProfile = { display_name: 'Demo Professional', full_name: 'Demo Professional', workspace_type: 'professional' }
    return (
      <div className="flex min-h-screen bg-background gradient-bg">
        <ProfessionalSidebar user={demoUser} profile={demoProfile} previewMode />
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
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (profileError) {
    console.error('[professional/layout] Profile query error:', profileError.message)
  }

  if (profile && profile.workspace_type !== 'professional') {
    const redirectPath = profile.workspace_type === 'educator' ? '/educator/dashboard' : '/dashboard'
    redirect(redirectPath)
  }

  return (
    <div className="flex min-h-screen bg-background gradient-bg">
      <ProfessionalSidebar user={user} profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
