'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Archive, Folder, CheckSquare, FileText } from 'lucide-react'

export default function ArchivePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Archive</p>
        <h1 className="text-3xl font-semibold tracking-tight">Archived items</h1>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Archive className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Archive is empty</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Archived projects, tasks, and documents will appear here.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/professional/projects">
            <Button variant="outline">
              <Folder className="w-4 h-4 mr-2" />
              Browse Projects
            </Button>
          </Link>
          <Link href="/professional/tasks">
            <Button variant="outline">
              <CheckSquare className="w-4 h-4 mr-2" />
              Browse Tasks
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}