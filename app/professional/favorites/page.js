'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Folder, CheckSquare, FileText } from 'lucide-react'

export default function FavoritesPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Favorites</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your starred items</h1>
      </div>

      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Star projects, tasks, or documents to quickly access them here.
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