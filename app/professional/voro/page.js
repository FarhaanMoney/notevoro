'use client'

import { useEffect, useState } from 'react'
import { getVoroActions, runVoroAction } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ProfessionalVoroPage() {
  const [actions, setActions] = useState([])
  const [running, setRunning] = useState(null)

  useEffect(() => {
    let mounted = true
    getVoroActions().then((data) => {
      if (mounted) setActions(data)
    })
    return () => { mounted = false }
  }, [])

  async function handleRun(id) {
    setRunning(id)
    await runVoroAction(id)
    setRunning(null)
    toast.success('Voro action executed')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Voro</p>
          <h1 className="text-4xl font-semibold tracking-tight">AI workflows for momentum and delivery</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.id} className="rounded-3xl border border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{action.area}</p>
                <h2 className="mt-3 text-2xl font-semibold">{action.title}</h2>
              </div>
              <Button size="sm" onClick={() => handleRun(action.id)} disabled={running === action.id}>
                {running === action.id ? 'Running...' : 'Run'}
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{action.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
