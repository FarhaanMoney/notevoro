'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ImportResourceDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Resource</DialogTitle>
          <DialogDescription>Import content from files, notes, classrooms, or existing resources to build your teaching library.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <Card className="rounded-3xl border border-border bg-card/70 p-5 hover:border-primary/40 transition cursor-pointer">
            <div className="text-sm font-semibold">Upload File</div>
            <p className="mt-2 text-sm text-muted-foreground">Upload a PDF, DOCX, or presentation to create a new resource.</p>
          </Card>
          <Card className="rounded-3xl border border-border bg-card/70 p-5 hover:border-primary/40 transition cursor-pointer">
            <div className="text-sm font-semibold">Import from Notes</div>
            <p className="mt-2 text-sm text-muted-foreground">Convert lesson notes into a resource template.</p>
          </Card>
          <Card className="rounded-3xl border border-border bg-card/70 p-5 hover:border-primary/40 transition cursor-pointer">
            <div className="text-sm font-semibold">Import from Existing Resource</div>
            <p className="mt-2 text-sm text-muted-foreground">Clone or adapt one of your current teaching materials.</p>
          </Card>
          <Card className="rounded-3xl border border-border bg-card/70 p-5 hover:border-primary/40 transition cursor-pointer">
            <div className="text-sm font-semibold">Import from Classroom</div>
            <p className="mt-2 text-sm text-muted-foreground">Use classroom content to seed a reusable resource.</p>
          </Card>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-background p-5 text-sm text-muted-foreground">
          <p>Import is mocked in this phase. The UI shows the workflow and user intent without persisting external files.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onClose}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
