import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Plus } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track student and classroom performance.</p>
      </div>

      <VoroEmptyState
        type="default"
        title="No analytics data yet"
        description="Once you have classrooms and assignments, analytics will appear here."
        action={<Button variant="outline" disabled>
          Coming Soon
        </Button>}
        className="bg-card/40 border-dashed"
      />
    </div>
  )
}
