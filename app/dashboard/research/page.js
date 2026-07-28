import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { ResearchLauncher } from '@/components/ResearchLauncher'
import { Search, ArrowRight } from 'lucide-react'

export default async function ResearchPage() {
  const supabase = await createClient()
  let reports = []
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('research_reports').select('id, topic, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12)
      reports = data || []
    }
  } else {
    reports = [
      { id: 'demo-1', topic: 'Climate Change: Causes & Impacts', created_at: new Date(Date.now() - 3600e3).toISOString() },
      { id: 'demo-2', topic: 'The Rise of Artificial Intelligence', created_at: new Date(Date.now() - 86400e3).toISOString() },
    ]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3">
          <Search className="w-3 h-3" /> AI research
        </div>
        <h1 className="text-3xl font-bold">Research Agent</h1>
        <p className="text-muted-foreground mt-1">Generate a comprehensive, cited research report on any topic — sections, key takeaways, and sources.</p>
      </div>

      <ResearchLauncher />

      {reports.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your reports</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/dashboard/research/${r.id}`}>
                <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.topic}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
