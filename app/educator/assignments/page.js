import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function AssignmentsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Create, distribute, and grade assignments.</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Assignment
        </Button>
      </div>

      <VoroEmptyState
        type="default"
        title="No assignments yet"
        description="Create your first assignment to start tracking student work."
        action={<Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Assignment
        </Button>}
        className="bg-card/40 border-dashed"
      />
    </div>
  )
}
