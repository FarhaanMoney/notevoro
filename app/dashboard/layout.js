import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()

  // Preview mode when Supabase isn't configured yet
  if (!supabase) {
    const demoUser = { email: 'demo@notevoro.app' }
    const demoProfile = { display_name: 'Demo Student', full_name: 'Demo Student', grade: '10', curriculum: 'CBSE' }
    return (
      <div className="flex min-h-screen bg-background gradient-bg">
        <Sidebar user={demoUser} profile={demoProfile} previewMode />
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

  return (
    <div className="flex min-h-screen bg-background gradient-bg">
      <Sidebar user={user} profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
