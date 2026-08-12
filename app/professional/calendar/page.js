'use client'

import { useEffect, useState } from 'react'
import { getCalendarEvents } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ProfessionalCalendarPage() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    let mounted = true
    getCalendarEvents().then((data) => {
      if (mounted) setEvents(data)
    })
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Calendar</p>
        <h1 className="text-4xl font-semibold tracking-tight">Meetings, deadlines, and planning windows</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="rounded-3xl border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{event.type}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{event.title}</h2>
                </div>
                <Badge variant="secondary">{event.time}</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{event.location}</p>
            </Card>
          ))}
        </div>
        <Card className="rounded-3xl border border-border p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">This week</div>
          <div className="mt-6 space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-2xl bg-background p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{event.title}</span>
                  <span>{event.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
