'use client'

import { useEffect, useState } from 'react'
import { getAnalyticsMetrics } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const metricPalette = {
  productivity: 'bg-emerald-500/10 text-emerald-700',
  efficiency: 'bg-sky-500/10 text-sky-700',
  impact: 'bg-violet-500/10 text-violet-700',
  velocity: 'bg-orange-500/10 text-orange-700',
}

export default function ProfessionalAnalyticsPage() {
  const [metrics, setMetrics] = useState([])

  useEffect(() => {
    let mounted = true
    getAnalyticsMetrics().then((data) => {
      if (mounted) setMetrics(data)
    })
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Analytics</p>
        <h1 className="text-4xl font-semibold tracking-tight">Performance metrics for your work operators</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.map((metric) => (
          <Card key={metric.id} className="rounded-3xl border border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{metric.category}</p>
                <h2 className="mt-2 text-3xl font-semibold">{metric.value}</h2>
              </div>
              <Badge className={metricPalette[metric.id] || ''}>{metric.trend}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{metric.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
