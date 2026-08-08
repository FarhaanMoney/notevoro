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
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  // Redirect to student workspace if user is not an educator
  if (profile?.workspace_type !== 'educator') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-background gradient-bg">
      <EducatorSidebar user={user} profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
