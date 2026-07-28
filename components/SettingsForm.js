'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/browser'
import { Loader2, LogOut, Crown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsForm({ profile, email, preview }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    display_name: profile?.display_name || '',
    grade: profile?.grade || '',
    curriculum: profile?.curriculum || 'CBSE',
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    if (preview) return toast.error('Preview mode — add Supabase keys to save')
    setSaving(true)
    try {
      const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Saved')
      router.refresh()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  async function logout() {
    if (preview) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Profile</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={email || ''} disabled /></div>
          <div><Label>Grade</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 10" /></div>
          <div className="md:col-span-2">
            <Label>Curriculum</Label>
            <Select value={form.curriculum} onValueChange={(v) => setForm({ ...form, curriculum: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['CBSE','ICSE','IGCSE','IB','College','University','Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-violet-500 to-pink-500">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save changes'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-semibold mb-2"><Crown className="w-3.5 h-3.5" />Subscription</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Free plan</div>
            <div className="text-xs text-muted-foreground">20 AI chats/day · 500MB storage</div>
          </div>
          <Button className="bg-gradient-to-r from-violet-500 to-pink-500">Upgrade to Pro</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Session</div>
        <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" />Log out</Button>
      </Card>

      <Card className="p-6 border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-400 font-semibold mb-2"><AlertTriangle className="w-3.5 h-3.5" />Danger zone</div>
        <p className="text-sm text-muted-foreground mb-3">Delete your account and all associated data. This cannot be undone.</p>
        <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">Delete account</Button>
      </Card>
    </div>
  )
}
