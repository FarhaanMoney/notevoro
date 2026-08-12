'use client'

import { useEffect, useState } from 'react'
import { getDocuments, uploadDocument } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, Plus, MoreHorizontal, Star, Folder } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

const DOCUMENT_TYPES = ['Notes', 'Reports', 'Proposals', 'Research', 'Presentations', 'Briefs', 'Meeting Notes']

export default function ProfessionalDocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'Notes', description: '' })

  useEffect(() => {
    let mounted = true
    getDocuments().then((data) => {
      if (mounted) setDocuments(data)
    })
    return () => { mounted = false }
  }, [])

  const filteredDocuments = documents.filter((doc) => {
    const matchesQuery = doc.title.toLowerCase().includes(query.toLowerCase()) || 
                         doc.description?.toLowerCase().includes(query.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesQuery && matchesType
  })

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const document = await uploadDocument({ ...form, type: form.type })
    setDocuments((prev) => [document, ...prev])
    setForm({ title: '', type: 'Notes', description: '' })
    setOpenCreate(false)
    toast.success('Document created')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your files</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="rounded-2xl px-5 py-3 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4" /> New Document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Search className="w-4 h-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{query || typeFilter !== 'all' ? 'No documents found' : 'No documents yet'}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {query || typeFilter !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Create your first document to get started.'}
          </p>
          {!query && typeFilter === 'all' && (
            <Button onClick={() => setOpenCreate(true)}>Create Document</Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="rounded-xl border border-border bg-card/60 p-6 hover:border-primary/40 transition cursor-pointer">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2">{doc.type}</Badge>
                  <h3 className="font-semibold truncate">{doc.title}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{doc.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated {formatDate(doc.updatedAt)}</span>
                <span>{doc.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Create new document</h2>
                <p className="text-sm text-muted-foreground">Start a new document for your work.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>Close</Button>
            </div>
            <form className="space-y-4" onSubmit={handleUpload}>
              <div>
                <Label htmlFor="title">Document title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="type">Document type</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit">Create Document</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}