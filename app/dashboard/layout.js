import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardUserProvider } from '@/components/providers/dashboard-user-provider'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }) {
  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // If environment variables are not available, skip auth check for local development
    return (
      <DashboardUserProvider user={null}>
        <DashboardShell>{children}</DashboardShell>
      </DashboardUserProvider>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <DashboardUserProvider user={{ ...user, ...profile }}>
      <DashboardShell>{children}</DashboardShell>
    </DashboardUserProvider>
  )
}
