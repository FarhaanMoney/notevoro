'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, MessagesSquare, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function ChatUI() {
  const params = useSearchParams()
  const router = useRouter()
  const initialChatId = params.get('id')
  const [chatId, setChatId] = useState(initialChatId || null)
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => { loadChats() }, [])
  useEffect(() => { if (chatId) loadChat(chatId); else setMessages([]) }, [chatId])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, streamText])

  async function loadChats() {
    const res = await fetch('/api/chats')
    if (res.ok) { const d = await res.json(); setChats(d.chats) }
  }
  async function loadChat(id) {
    const res = await fetch(`/api/chats/${id}`)
    if (res.ok) { const d = await res.json(); setMessages(d.messages) }
  }
  async function deleteChat(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this chat?')) return
    await fetch(`/api/chats/${id}`, { method: 'DELETE' })
    if (chatId === id) { setChatId(null); router.push('/dashboard/chat') }
    loadChats()
  }
  function newChat() {
    setChatId(null); setMessages([]); router.push('/dashboard/chat')
  }

  async function send(e) {
    e?.preventDefault?.()
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input, id: `tmp-${Date.now()}` }
    setMessages((m) => [...m, userMsg])
    const msg = input
    setInput('')
    setStreaming(true)
    setStreamText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, chatId }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Chat failed')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''
      let newChatId = chatId
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6))
          if (payload.type === 'meta') {
            newChatId = payload.chatId
            if (!chatId && newChatId) { setChatId(newChatId); window.history.replaceState(null, '', `/dashboard/chat?id=${newChatId}`) }
          } else if (payload.type === 'chunk') {
            acc += payload.delta
            setStreamText(acc)
          } else if (payload.type === 'done') {
            setMessages((m) => [...m, { role: 'assistant', content: acc, id: `a-${Date.now()}` }])
            setStreamText('')
            loadChats()
          } else if (payload.type === 'error') {
            throw new Error(payload.error)
          }
        }
      }
    } catch (err) {
      toast.error(err.message)
      setMessages((m) => m.filter((mm) => mm.id !== userMsg.id))
    } finally {
      setStreaming(false)
      setStreamText('')
    }
  }

  return (
    <div className="flex h-screen">
      {/* Chat list */}
      <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={newChat} className="w-full bg-gradient-to-r from-violet-500 to-pink-500"><Plus className="w-4 h-4 mr-2" />New chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {chats.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">No chats yet</div>}
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => { setChatId(c.id); router.push(`/dashboard/chat?id=${c.id}`) }}
              className={`w-full text-left group px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition ${chatId === c.id ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{c.title}</span>
              <Trash2 onClick={(e) => deleteChat(c.id, e)} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 hover:text-red-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border p-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold">AI Tutor</span>
          <span className="text-xs text-muted-foreground ml-auto">GPT-4o · personalized</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4 glow">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold">Ask me anything</h2>
                <p className="text-sm text-muted-foreground mt-1">I'll explain, teach, and help you study. Try asking about a concept, a problem, or a topic.</p>
                <div className="grid grid-cols-1 gap-2 mt-6">
                  {['Explain quantum entanglement like I’m 15', 'Help me solve: 2x² + 5x - 3 = 0', 'What caused World War 1?', 'Difference between mitosis and meiosis'].map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="text-left text-sm p-3 rounded-lg border border-border bg-card/40 hover:border-primary/40 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => <MessageBubble key={m.id} role={m.role} content={m.content} />)}
            {streaming && streamText && <MessageBubble role="assistant" content={streamText} streaming />}
            {streaming && !streamText && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            )}
          </div>
        </div>

        <form onSubmit={send} className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything... e.g. Explain photosynthesis"
              disabled={streaming}
              className="h-11"
              autoFocus
            />
            <Button type="submit" disabled={streaming || !input.trim()} size="lg" className="h-11 bg-gradient-to-r from-violet-500 to-pink-500">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ role, content, streaming }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold ${
        isUser ? 'bg-muted text-foreground' : 'bg-gradient-to-br from-violet-500 to-pink-500 text-white'
      }`}>
        {isUser ? 'You' : <Sparkles className="w-4 h-4" />}
      </div>
      <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${isUser ? 'bg-primary/15 border border-primary/20' : 'bg-card/60 border border-border'}`}>
        <div className="prose-notevoro text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {streaming && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
      <ChatUI />
    </Suspense>
  )
}
