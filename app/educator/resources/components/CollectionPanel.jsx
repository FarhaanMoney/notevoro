'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function CollectionPanel({ collections, selectedCollection, onCreate, onSelect }) {
  return (
    <Card className="rounded-3xl border border-border bg-card/70 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">My Collections</p>
          <h2 className="text-lg font-semibold">Collections</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => onCreate('New collection')}>New</Button>
      </div>
      <div className="space-y-3">
        {collections.map((collection) => (
          <button
            type="button"
            key={collection.id}
            onClick={() => onSelect(collection.id)}
            className={`w-full rounded-3xl border px-4 py-4 text-left transition ${selectedCollection === collection.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'}`}
          >
            <div className="font-semibold">{collection.name}</div>
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          </button>
        ))}
      </div>
    </Card>
  )
}
