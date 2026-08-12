'use client'

import { useEffect, useState } from 'react'
import { getCalendarEvents } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Calendar, Plus, ChevronLeft, ChevronRight, Users, Clock, CheckSquare, Bell, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_STYLE = {
  meeting: { icon: Users, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  deadline: { icon: Clock, color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  task: { icon: CheckSquare, color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  reminder: { icon: Bell, color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
}

export default function ProfessionalCalendarPage() {
  const [events, setEvents] = useState([])
  const [cursor, setCursor] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'meeting', time: '', location: '', date: new Date().toISOString().slice(0,10) })

  useEffect(() => {
    let mounted = true
    getCalendarEvents().then((data) => {
      if (mounted) setEvents(data)
    })
    return () => { mounted = false }
  }, [])

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const startDay = monthStart.getDay()
  const days = monthEnd.getDate()

  function eventsOn(day) {
    if (!day) return []
    const ds = day.toISOString().slice(0, 10)
    return events.filter((e) => e.date === ds)
  }

  async function saveEvent() {
    if (!form.title || !form.date) return
    const newEvent = {
      id: `event-${Date.now()}`,
      ...form,
    }
    setEvents((e) => [...e, newEvent])
    setOpen(false)
    setForm({ title: '', description: '', type: 'meeting', time: '', location: '', date: new Date().toISOString().slice(0,10) })
    toast.success('Event added')
  }

  function del(id) {
    if (!confirm('Delete event?')) return
    setEvents((e) => e.filter((x) => x.id !== id))
  }

  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' })
  const upcoming = events.filter((e) => e.date >= new Date().toISOString().slice(0,10)).slice(0, 5)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Calendar</p>
          <h1 className="text-3xl font-semibold">Schedule & deadlines</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl px-5 py-3 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
              <Plus className="w-4 h-4" /> Add event
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Team meeting" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room or link" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveEvent} className="bg-gradient-to-r from-violet-500 to-pink-500">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-semibold text-lg">{monthName}</div>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground uppercase font-semibold mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const day = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)
              const evs = eventsOn(day)
              const isToday = day.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`min-h-[90px] p-2 rounded-xl border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
                  <div className={`text-sm mb-2 ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{day.getDate()}</div>
                  <div className="space-y-1">
                    {evs.slice(0, 2).map((e) => {
                      const S = TYPE_STYLE[e.type] || TYPE_STYLE.reminder
                      const Icon = S.icon
                      return (
                        <div key={e.id} className={`text-xs px-2 py-1 rounded-lg border truncate flex items-center gap-1 ${S.color}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          {e.title}
                        </div>
                      )
                    })}
                    {evs.length > 2 && <div className="text-xs text-muted-foreground">+{evs.length - 2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <Card className="p-6 text-center rounded-xl">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </Card>
            )}
            {upcoming.map((e) => {
              const S = TYPE_STYLE[e.type] || TYPE_STYLE.reminder
              const Icon = S.icon
              return (
                <Card key={e.id} className="p-4 group rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${S.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(e.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}
                        {e.time && ` • ${e.time}`}
                      </div>
                      {e.location && <div className="text-xs text-muted-foreground truncate">{e.location}</div>}
                    </div>
                    <Trash2 onClick={() => del(e.id)} className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-70 hover:text-red-400 cursor-pointer shrink-0" />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}