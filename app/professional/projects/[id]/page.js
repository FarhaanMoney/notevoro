import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProfessionalProjectDetailPage({ params }) {
  const project = await getProjectById(params.id)
  if (!project) notFound()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Project workspace</p>
          <h1 className="text-4xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/professional/projects" className="text-sm text-primary hover:underline">Back to projects</Link>
          <Button>Open details</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Category</p>
          <p className="mt-3 text-xl font-semibold">{project.category}</p>
        </Card>
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Progress</p>
          <p className="mt-3 text-xl font-semibold">{project.progress}%</p>
        </Card>
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Last updated</p>
          <p className="mt-3 text-xl font-semibold">{new Date(project.updatedAt).toLocaleDateString()}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{project.description}</p>
        </Card>
        <Card className="rounded-3xl border border-border bg-card/80 p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Workspace actions</p>
            <Button variant="outline">Open Voro</Button>
          </div>
          <div className="grid gap-3">
            <Button variant="secondary" className="w-full">View tasks</Button>
            <Button variant="secondary" className="w-full">View documents</Button>
            <Button variant="secondary" className="w-full">Open research</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
