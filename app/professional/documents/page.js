'use client'

import { useEffect, useState } from 'react'
import { getDocuments, uploadDocument } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ProfessionalDocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    let mounted = true
    getDocuments().then((data) => {
      if (mounted) setDocuments(data)
    })
    return () => { mounted = false }
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!fileName.trim()) return
    const document = await uploadDocument({ title: fileName })
    setDocuments((prev) => [document, ...prev])
    setFileName('')
    toast.success('Document added')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-4xl font-semibold tracking-tight">Files for planning, sharing, and reference</h1>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleUpload}>
          <Input
            placeholder="New document title"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="min-w-[240px]"
          />
          <Button type="submit">Upload</Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="rounded-3xl border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{doc.type}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{doc.title}</h2>
                </div>
                <div className="text-right text-sm text-muted-foreground">{doc.updatedAt}</div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{doc.description}</p>
            </Card>
          ))}
        </div>
        <Card className="rounded-3xl border border-border p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Document stats</div>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <div>Total files: <span className="text-foreground font-semibold">{documents.length}</span></div>
            <div>Last upload: <span className="text-foreground font-semibold">{documents[0]?.updatedAt ?? 'None'}</span></div>
            <div>Most recent: <span className="text-foreground font-semibold">{documents[0]?.title ?? 'No documents yet'}</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
