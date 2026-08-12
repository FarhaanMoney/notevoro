'use client'

import { useEffect, useState } from 'react'
import { getIntegrations, toggleIntegration } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ProfessionalIntegrationsPage() {
  const [integrations, setIntegrations] = useState([])

  useEffect(() => {
    let mounted = true
    getIntegrations().then((data) => {
      if (mounted) setIntegrations(data)
    })
    return () => { mounted = false }
  }, [])

  function handleToggle(id) {
    setIntegrations((prev) => prev.map((integration) => {
      if (integration.id !== id) return integration
      return { ...integration, enabled: !integration.enabled }
    }))
    toast.success('Integration updated')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Integrations</p>
        <h1 className="text-4xl font-semibold tracking-tight">Connected tools for your professional workflow</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id} className="rounded-3xl border border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{integration.provider}</p>
                <h2 className="mt-2 text-2xl font-semibold">{integration.name}</h2>
              </div>
              <Button size="sm" variant={integration.enabled ? 'secondary' : 'outline'} onClick={() => handleToggle(integration.id)}>
                {integration.enabled ? 'Enabled' : 'Enable'}
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{integration.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
