import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function ResourcesPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground mt-1">Create and manage teaching materials.</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Resource
        </Button>
      </div>

      <VoroEmptyState
        type="default"
        title="No resources yet"
        description="Create your first teaching resource to start building your content library."
        action={<Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Resource
        </Button>}
        className="bg-card/40 border-dashed"
      />
    </div>
  )
}
