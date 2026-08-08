import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus, FileText, Layers, HelpCircle, Presentation, Search, Folder } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

const RESOURCE_TYPES = [
  { type: 'lesson', label: 'Lesson Plans', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
  { type: 'worksheet', label: 'Worksheets', icon: FileText, color: 'from-violet-500 to-purple-500' },
  { type: 'quiz', label: 'Quizzes', icon: HelpCircle, color: 'from-pink-500 to-rose-500' },
  { type: 'presentation', label: 'Presentations', icon: Presentation, color: 'from-orange-500 to-amber-500' },
  { type: 'research', label: 'Research', icon: Search, color: 'from-green-500 to-emerald-500' },
  { type: 'notes', label: 'Notes', icon: Layers, color: 'from-indigo-500 to-blue-500' },
]

export default function ResourcesPage() {
  // Mock resources data
  const resourceses = [
    { id: '1', title: 'Photosynthesis Lesson Plan', type: 'lesson', classroom: 'Biology 10B', createdAt: '2 days ago' },
    { id: '2', title: 'Algebra Worksheet Set', type: 'worksheet', classroom: 'Mathematics 8A', createdAt: '1 week ago' },
    { id: '3', title: 'Cell Division Quiz', type: 'quiz', classroom: null, createdAt: '3 days ago' },
  ]

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

      {/* Resource Type Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {RESOURCE_TYPES.map((rt) => (
          <Card key={rt.type} className="p-4 bg-card/60 hover:border-primary/40 transition cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow mb-3">
              <rt.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm font-semibold">{rt.label}</div>
          </Card>
        ))}
      </div>

      {resourceses.length === 0 ? (
        <VoroEmptyState
          type="default"
          title="No resources yet"
          description="Create your first teaching resource to start building your content library."
          action={<Button className="bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />Create Resource
          </Button>}
          className="bg-card/40 border-dashed"
        />
      ) : (
        <div className="space-y-3">
          {resourceses.map((resource) => {
            const resourceType = RESOURCE_TYPES.find(rt => rt.type === resource.type)
            return (
              <Card key={resource.id} className="p-5 bg-card/60 hover:border-primary/40 transition">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                    {resourceType && <resourceType.icon className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{resource.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {resource.classroom ? resource.classroom : 'Personal Resource'}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                        {resourceType?.label || 'Resource'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Created {resource.createdAt}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="outline">Share</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
