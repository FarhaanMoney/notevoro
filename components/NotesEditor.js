'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3,
  Undo2, Redo2, Wand2, Sparkles, FileText, BookOpen, Layers, Zap, Check, Undo
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { VoroThinking } from '@/components/voro/VoroThinking'

const AI_ACTIONS = [
  { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
  { id: 'summarize', label: 'Summarize', icon: FileText },
  { id: 'expand', label: 'Expand', icon: Sparkles },
  { id: 'simplify', label: 'Simplify', icon: Zap },
  { id: 'study_guide', label: 'Study Guide', icon: BookOpen },
]

export function NotesEditor({ noteId, preview, folders, onUpdated }) {
  const router = useRouter()
  const [note, setNote] = useState(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)
  const [converting, setConverting] = useState(false)
  const [aiPreview, setAiPreview] = useState(null) // {result, originalHtml}
  const saveTimer = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing, or paste your notes here...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Typography,
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-notevoro focus:outline-none max-w-none min-h-[400px]',
      },
    },
    onUpdate: ({ editor }) => scheduleSave({ content_html: editor.getHTML(), content_text: editor.getText() }),
  })

  useEffect(() => {
    if (preview) {
      const demoContent = `<h2>Photosynthesis</h2><p>Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.</p><h3>Key Equation</h3><p><code>6CO2 + 6H2O + light → C6H12O6 + 6O2</code></p><ul><li>Occurs in <strong>chloroplasts</strong></li><li>Two stages: light-dependent and Calvin cycle</li><li>Chlorophyll absorbs red and blue light</li></ul><blockquote>Without photosynthesis, most life on Earth would not exist.</blockquote>`
      setNote({ id: noteId, title: 'Photosynthesis — my notes' })
      setTitle('Photosynthesis — my notes')
      editor?.commands.setContent(demoContent)
      return
    }
    ;(async () => {
      const res = await fetch(`/api/notes/${noteId}`)
      const data = await res.json()
      if (res.ok) {
        setNote(data.note)
        setTitle(data.note.title)
        editor?.commands.setContent(data.note.content_html || '')
        setSavedAt(new Date())
      }
    })()
  }, [noteId, editor, preview])

  function scheduleSave(patch) {
    if (preview) return
    setSaving(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${noteId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        setSavedAt(new Date())
        if (patch.title !== undefined) onUpdated?.(noteId, { title: patch.title })
      } catch (e) { toast.error('Hmm... Voro had trouble saving. Please try again.') } finally { setSaving(false) }
    }, 800)
  }

  function onTitleChange(v) {
    setTitle(v)
    scheduleSave({ title: v || 'Untitled' })
  }

  async function runAI(actionId) {
    if (!editor) return
    const content = editor.getText()
    if (content.trim().length < 5) return toast.error('Add some notes first')
    setAiLoading(actionId)
    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const originalHtml = editor.getHTML()
      // Convert markdown-ish result to simple HTML by wrapping in paragraphs (TipTap will handle basic formatting)
      const html = markdownToHtml(data.result)
      editor.commands.setContent(html)
      setAiPreview({ originalHtml })
      toast.success('Voro updated your notes! Review — you can undo if you don\'t like it.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAiLoading(null)
    }
  }

  function undoAI() {
    if (!aiPreview || !editor) return
    editor.commands.setContent(aiPreview.originalHtml)
    setAiPreview(null)
  }

  async function convertToStudyPack() {
    if (!editor) return
    const content = editor.getText()
    if (content.trim().length < 20) return toast.error('Need at least a paragraph of notes')
    setConverting(true)
    try {
      const res = await fetch('/api/notes/convert-to-pack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: title || 'Study Pack' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Voro created your study pack!')
      router.push(`/dashboard/study-pack/${data.pack.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setConverting(false)
    }
  }

  if (!editor || !note) return (
    <div className="flex-1 flex items-center justify-center">
      <VoroThinking size="lg" className="text-primary" />
    </div>
  )

  const btn = (active, onClick, Icon, title) => (
    <button onClick={onClick} title={title} className={`p-2 rounded hover:bg-muted/60 ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <>
      {/* Top bar */}
      <div className="border-b border-border p-3 flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Input value={title} onChange={(e) => onTitleChange(e.target.value)} className="border-none bg-transparent text-lg font-semibold px-0 focus-visible:ring-0 flex-1" placeholder="Untitled" />
        <span className="text-[11px] text-muted-foreground shrink-0">
          {saving ? 'Saving...' : savedAt ? `Saved · ${savedAt.toLocaleTimeString()}` : ''}
        </span>
      </div>

      {/* Formatting toolbar */}
      <div className="border-b border-border p-2 flex items-center gap-0.5 flex-wrap">
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Heading1, 'H1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, 'H2')}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3, 'H3')}
        <div className="w-px h-5 bg-border mx-1" />
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), Bold, 'Bold')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), Italic, 'Italic')}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), Strikethrough, 'Strike')}
        <div className="w-px h-5 bg-border mx-1" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), List, 'Bullet list')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, 'Numbered list')}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), Quote, 'Quote')}
        {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), Code, 'Code block')}
        <div className="w-px h-5 bg-border mx-1" />
        {btn(false, () => editor.chain().focus().undo().run(), Undo2, 'Undo')}
        {btn(false, () => editor.chain().focus().redo().run(), Redo2, 'Redo')}

        <div className="ml-auto flex items-center gap-1">
          {AI_ACTIONS.map((a) => (
            <button key={a.id} disabled={aiLoading === a.id} onClick={() => runAI(a.id)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1.5 transition disabled:opacity-50">
              {aiLoading === a.id ? <VoroStatus type="notes" className="text-primary" /> : <a.icon className="w-3 h-3" />}
              {a.label}
            </button>
          ))}
          {aiPreview && (
            <button onClick={undoAI} title="Undo AI change" className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted/60 flex items-center gap-1.5">
              <Undo className="w-3 h-3" /> Undo
            </button>
          )}
          <button onClick={convertToStudyPack} disabled={converting}
            className="text-xs px-2.5 py-1.5 rounded-md bg-gradient-to-r from-violet-500 to-pink-500 text-white flex items-center gap-1.5 disabled:opacity-50">
            {converting ? <VoroThinking size="xs" className="text-white" /> : <Sparkles className="w-3 h-3" />}
            Study Pack
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-10">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  )
}

function markdownToHtml(md) {
  // Very simple markdown → HTML for AI outputs (headings, bold, italic, code, lists, paragraphs)
  let html = md
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Lists
  html = html.replace(/(^|\n)((?:[-*] .+\n?)+)/g, (m, p1, list) => {
    const items = list.trim().split('\n').map((l) => `<li>${l.replace(/^[-*] /, '')}</li>`).join('')
    return `${p1}<ul>${items}</ul>`
  })
  html = html.replace(/(^|\n)((?:\d+\. .+\n?)+)/g, (m, p1, list) => {
    const items = list.trim().split('\n').map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
    return `${p1}<ol>${items}</ol>`
  })
  // Paragraphs
  html = html.split(/\n{2,}/).map((block) => {
    if (/^<(h\d|ul|ol|blockquote|pre)/.test(block.trim())) return block
    if (!block.trim()) return ''
    return `<p>${block.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
  return html
}
