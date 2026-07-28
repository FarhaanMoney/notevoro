'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Calendar, Plus, ChevronLeft, ChevronRight, GraduationCap, FileText, Bell, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_STYLE = {
  exam: { icon: GraduationCap, color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  assignment: { icon: FileText, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  reminder: { icon: Bell, color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
}

export function CalendarView({ initialEvents, preview }) {
  const [events, setEvents] = useState(initialEvents)
  const [cursor, setCursor] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', event_type: 'reminder', event_date: new Date().toISOString().slice(0,10) })

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const startDay = monthStart.getDay()
  const days = monthEnd.getDate()

  const cells = useMemo(() => {
    const arr = []
    for (let i = 0; i < startDay; i++) arr.push(null)
    for (let d = 1; d <= days; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
    return arr
  }, [cursor, startDay, days])

  function eventsOn(day) {
    if (!day) return []
    const ds = day.toISOString().slice(0, 10)
    return events.filter((e) => e.event_date === ds)
  }

  async function saveEvent() {
    if (!form.title || !form.event_date) return
    if (preview) { toast.error('Preview mode'); return }
    const res = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    setEvents((e) => [...e, data.event])
    setOpen(false)
    setForm({ title: '', description: '', event_type: 'reminder', event_date: new Date().toISOString().slice(0,10) })
    toast.success('Event added')
  }

  async function del(id) {
    if (preview) return
    if (!confirm('Delete event?')) return
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
    setEvents((e) => e.filter((x) => x.id !== id))
  }

  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' })
  const upcoming = events.filter((e) => e.event_date >= new Date().toISOString().slice(0,10)).slice(0, 5)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">Exams, assignments, and reminders in one place.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500"><Plus className="w-4 h-4 mr-2" />Add event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Physics Midterm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
            </div>
            <DialogFooter><Button onClick={saveEvent} className="bg-gradient-to-r from-violet-500 to-pink-500">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="font-semibold">{monthName}</div>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground uppercase font-semibold mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const evs = eventsOn(day)
              const isToday = day.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`min-h-[80px] p-2 rounded border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
                  <div className={`text-xs mb-1 ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{day.getDate()}</div>
                  <div className="space-y-1">
                    {evs.slice(0, 2).map((e) => {
                      const S = TYPE_STYLE[e.event_type] || TYPE_STYLE.reminder
                      return (
                        <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${S.color}`}>{e.title}</div>
                      )
                    })}
                    {evs.length > 2 && <div className="text-[10px] text-muted-foreground">+{evs.length - 2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && <Card className="p-4 text-xs text-muted-foreground text-center">Nothing upcoming</Card>}
            {upcoming.map((e) => {
              const S = TYPE_STYLE[e.event_type] || TYPE_STYLE.reminder
              const Icon = S.icon
              return (
                <Card key={e.id} className="p-3 group">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(e.event_date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</div>
                    </div>
                    <Trash2 onClick={() => del(e.id)} className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-70 hover:text-red-400 cursor-pointer" />
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
