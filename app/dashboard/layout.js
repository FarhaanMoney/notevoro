import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardLayout({ children }) {
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

  // Check onboarding status
  const isOnboardingComplete = profile?.personalization?.onboarding_completed || 
                                 profile?.onboardingStep === 'completed' || 
                                 Boolean(profile?.onboardingCompletedAt)

  if (!isOnboardingComplete) {
    redirect('/onboarding')
  }

  return <DashboardClient user={{ ...user, ...profile }}>{children}</DashboardClient>
}
