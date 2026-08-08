import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function EducatorVoroPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Voro Assistant</h1>
        <p className="text-muted-foreground mt-1">Your AI teaching assistant is here to help.</p>
      </div>

      <VoroEmptyState
        type="default"
        title="Start a conversation with Voro"
        description="Ask Voro to help you create lessons, quizzes, assignments, or analyze your classroom performance."
        action={<Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Start Chat
        </Button>}
        className="bg-card/40 border-dashed"
      />
    </div>
  )
}
