import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookMarked, ExternalLink, Quote } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default async function ResearchDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: r } = await supabase.from('research_reports').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!r) notFound()
  const report = r.report || {}

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/research"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />All reports</Button></Link>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Research Report</div>
        <h1 className="text-4xl font-bold">{report.title || r.topic}</h1>
        {report.abstract && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-card/40 flex gap-3">
            <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">{report.abstract}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {(report.sections || []).map((s, i) => (
          <Card key={i} className="p-6">
            <div className="text-xs text-primary uppercase tracking-wide font-semibold mb-1">Section {i + 1}</div>
            <h2 className="text-2xl font-bold mb-4">{s.heading}</h2>
            <div className="prose-notevoro">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body_md || ''}</ReactMarkdown>
            </div>
          </Card>
        ))}

        {report.key_takeaways && report.key_takeaways.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30">
            <h2 className="text-xl font-bold mb-3">Key Takeaways</h2>
            <ul className="space-y-2">
              {report.key_takeaways.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm"><span className="text-primary font-semibold">{i + 1}.</span> {t}</li>
              ))}
            </ul>
          </Card>
        )}

        {report.sources && report.sources.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BookMarked className="w-5 h-5 text-primary" />Sources</h2>
            <div className="space-y-3">
              {report.sources.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-card/40">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary">{s.type}</span>
                    {s.year && <span>· {s.year}</span>}
                  </div>
                  <div className="font-medium text-sm">{s.title}</div>
                  {s.authors && <div className="text-xs text-muted-foreground">{s.authors}</div>}
                  {s.note && <div className="text-xs text-muted-foreground mt-1 italic">{s.note}</div>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {report.further_reading && report.further_reading.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-3">Further Reading</h2>
            <div className="flex flex-wrap gap-2">
              {report.further_reading.map((f, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary">{f}</span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
