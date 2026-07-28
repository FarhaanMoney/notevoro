'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { NotesEditor } from '@/components/NotesEditor'
import { Plus, FolderPlus, Folder, FileText, Trash2, Sparkles, Search, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

export function NotesWorkspace({ initialNotes, initialFolders, preview }) {
  const [notes, setNotes] = useState(initialNotes)
  const [folders, setFolders] = useState(initialFolders)
  const [activeNoteId, setActiveNoteId] = useState(initialNotes[0]?.id || null)
  const [activeFolderId, setActiveFolderId] = useState(null)
  const [q, setQ] = useState('')

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (activeFolderId === 'unfiled' && n.folder_id) return false
      if (activeFolderId && activeFolderId !== 'unfiled' && n.folder_id !== activeFolderId) return false
      if (q && !n.title.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [notes, q, activeFolderId])

  async function newNote() {
    if (preview) return toast.error('Preview mode — add Supabase keys to create notes')
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', folder_id: activeFolderId && activeFolderId !== 'unfiled' ? activeFolderId : null }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    setNotes((n) => [{ id: data.note.id, title: data.note.title, folder_id: data.note.folder_id, updated_at: data.note.updated_at }, ...n])
    setActiveNoteId(data.note.id)
  }

  async function newFolder() {
    if (preview) return toast.error('Preview mode')
    const name = prompt('Folder name')
    if (!name) return
    const res = await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    setFolders((f) => [...f, data.folder])
  }

  async function deleteNote(id, e) {
    e?.stopPropagation()
    if (preview) return toast.error('Preview mode')
    if (!confirm('Delete this note?')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes((n) => n.filter((x) => x.id !== id))
    if (activeNoteId === id) setActiveNoteId(null)
  }

  function onNoteUpdated(id, updates) {
    setNotes((n) => n.map((x) => x.id === id ? { ...x, ...updates, updated_at: new Date().toISOString() } : x))
  }

  return (
    <div className="flex h-screen">
      {/* Left tree */}
      <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <Button onClick={newNote} className="w-full bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />New note
          </Button>
          <Button onClick={newFolder} variant="outline" size="sm" className="w-full">
            <FolderPlus className="w-3.5 h-3.5 mr-2" />New folder
          </Button>
        </div>
        <div className="p-3 space-y-1 border-b border-border">
          <FolderRow label="All notes" active={activeFolderId === null} onClick={() => setActiveFolderId(null)} count={notes.length} />
          <FolderRow label="Unfiled" active={activeFolderId === 'unfiled'} onClick={() => setActiveFolderId('unfiled')} count={notes.filter((n) => !n.folder_id).length} />
          {folders.map((f) => (
            <FolderRow key={f.id} label={f.name} active={activeFolderId === f.id} onClick={() => setActiveFolderId(f.id)}
              count={notes.filter((n) => n.folder_id === f.id).length}
              color={f.color} />
          ))}
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="pl-8 h-9 text-xs" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {filteredNotes.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">No notes</div>}
          {filteredNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveNoteId(n.id)}
              className={`w-full group text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${activeNoteId === n.id ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{n.title || 'Untitled'}</span>
              <Trash2 onClick={(e) => deleteNote(n.id, e)} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 hover:text-red-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeNoteId ? (
          <NotesEditor noteId={activeNoteId} preview={preview} folders={folders} onUpdated={onNoteUpdated} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4 glow">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold">Your notes, supercharged</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">Write, paste, or generate. AI can rewrite, summarize, or turn any note into a study pack.</p>
              <Button onClick={newNote} className="mt-6 bg-gradient-to-r from-violet-500 to-pink-500"><Plus className="w-4 h-4 mr-2" />Create your first note</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FolderRow({ label, active, onClick, count, color }) {
  const colorClass = { violet: 'text-violet-400', green: 'text-green-400', orange: 'text-orange-400', blue: 'text-blue-400', pink: 'text-pink-400' }[color || 'violet']
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition ${active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
    >
      <Folder className={`w-3.5 h-3.5 ${colorClass}`} />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[10px] text-muted-foreground">{count}</span>
    </button>
  )
}
