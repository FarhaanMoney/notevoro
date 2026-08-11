'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ShareResourceDialog({ open, resource, onClose, onShare }) {
  const [shareType, setShareType] = useState('classroom')
  const [target, setTarget] = useState('all-classes')

  if (!resource) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share {resource.title}</DialogTitle>
          <DialogDescription>Simulate sharing this resource with classrooms, students, or educators.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card className="rounded-3xl border border-border bg-card/70 p-5">
            <label className="text-sm font-semibold">Share with</label>
            <select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={shareType} onChange={(event) => setShareType(event.target.value)}>
              <option value="classroom">Share with classroom</option>
              <option value="students">Share with students</option>
              <option value="educators">Share with another educator</option>
              <option value="link">Copy link</option>
            </select>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/70 p-5">
            <label className="text-sm font-semibold">Target</label>
            <select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="all-classes">All classrooms</option>
              <option value="math-8a">Mathematics 8A</option>
              <option value="bio-10b">Biology 10B</option>
              <option value="hist-10b">History 10B</option>
            </select>
          </Card>

          <Card className="rounded-3xl border border-border bg-background p-5 text-sm text-muted-foreground">
            <p>This is a mock share flow. The action simulates success and does not create external permissions.</p>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onShare(resource.id, { shared: { withClassrooms: [target], withStudents: shareType !== 'link', withEducators: shareType === 'educators' } }); onClose() }}>Share</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
