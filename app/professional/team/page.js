'use client'

import { useEffect, useState } from 'react'
import { getTeamMembers, sendMessageToTeam } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ProfessionalTeamPage() {
  const [members, setMembers] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    getTeamMembers().then((data) => {
      if (mounted) setMembers(data)
    })
    return () => { mounted = false }
  }, [])

  async function handleSend(e) {
    e.preventDefault()
    await sendMessageToTeam(message)
    setMessage('')
    toast.success('Message sent')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Team</p>
        <h1 className="text-4xl font-semibold tracking-tight">Collaborate with the people who make it happen</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.id} className="rounded-3xl border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{member.name}</h2>
                </div>
                <div className="text-right text-sm text-muted-foreground">{member.location}</div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{member.bio}</p>
            </Card>
          ))}
        </div>
        <Card className="rounded-3xl border border-border p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Team message</div>
          <form className="mt-6 space-y-4" onSubmit={handleSend}>
            <div>
              <Label htmlFor="message">Message</Label>
              <Input id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share an update or ask a question" />
            </div>
            <Button type="submit">Send</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
