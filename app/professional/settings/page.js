'use client'

import { useEffect, useState } from 'react'
import { getProfessionalSettings, saveProfessionalSettings } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ProfessionalSettingsPage() {
  const [settings, setSettings] = useState({ workspaceName: '', email: '' })

  useEffect(() => {
    let mounted = true
    getProfessionalSettings().then((data) => {
      if (mounted) setSettings(data)
    })
    return () => { mounted = false }
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    await saveProfessionalSettings(settings)
    toast.success('Settings saved')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Settings</p>
        <h1 className="text-4xl font-semibold tracking-tight">Manage your professional workspace preferences</h1>
      </div>

      <Card className="rounded-3xl border border-border p-6">
        <form className="space-y-6" onSubmit={handleSave}>
          <div>
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input
              id="workspaceName"
              value={settings.workspaceName}
              onChange={(e) => setSettings({ ...settings, workspaceName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit">Save preferences</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
