import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  let profile = null
  let email = 'demo@notevoro.app'
  let preview = false
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      profile = data
      email = user.email
    }
  } else {
    preview = true
    profile = { display_name: 'Demo Student', full_name: 'Demo Student', grade: '10', curriculum: 'CBSE' }
  }
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>
      <SettingsForm profile={profile} email={email} preview={preview} />
    </div>
  )
}
