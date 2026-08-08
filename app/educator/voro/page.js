'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Plus, Send, BookOpen, FileText, HelpCircle, Presentation, Search, BarChart3, MessageSquare, Loader2 } from 'lucide-react'
import { VoroIllustration } from '@/components/voro/VoroIllustration'
import { VoroAvatarFox } from '@/components/voro/VoroAvatar'

const EDUCATOR_ACTIONS = [
  { icon: BookOpen, label: 'Create Lesson', prompt: 'Create a 45-minute lesson on ' },
  { icon: FileText, label: 'Create Worksheet', prompt: 'Create a worksheet for ' },
  { icon: HelpCircle, label: 'Create Quiz', prompt: 'Create a quiz about ' },
  { icon: BookOpen, label: 'Create Assignment', prompt: 'Create an assignment for ' },
  { icon: Presentation, label: 'Create Presentation', prompt: 'Create a presentation on ' },
  { icon: Search, label: 'Research Topic', prompt: 'Research and explain ' },
  { icon: BarChart3, label: 'Analyze Class', prompt: 'Analyze my classroom performance for ' },
  { icon: MessageSquare, label: 'Generate Feedback', prompt: 'Generate feedback for ' },
]

export default function EducatorVoroPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  async function send(e) {
    e?.preventDefault?.()
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input, id: `tmp-${Date.now()}` }
    setMessages((m) => [...m, userMsg])
    const msg = input
    setInput('')
    setLoading(true)

    try {
      // Mock AI response - will be replaced with real API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      const aiResponse = {
        role: 'assistant',
        content: `I'd be happy to help you with that! As your AI teaching assistant, I can help you create lessons, quizzes, assignments, and analyze your classroom data. Let me work on "${msg}" for you.`,
        id: `a-${Date.now()}`,
      }
      setMessages((m) => [...m, aiResponse])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function useAction(prompt) {
    setInput(prompt)
  }

  return (
    <div className="flex h-screen">
      {/* Actions Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <VoroAvatarFox size="sm" />
            <span className="text-sm font-semibold">🦊 Voro Actions</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Quick educator commands</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {EDUCATOR_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => useAction(action.prompt)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <action.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border p-4 flex items-center gap-2">
          <VoroAvatarFox size="md" />
          <div>
            <span className="font-semibold">Talk to Voro</span>
            <p className="text-xs text-muted-foreground">Your AI Teaching Assistant</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {messages.length === 0 && !loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <VoroIllustration type="dashboard" size="xl" className="mx-auto mb-6" />
                <h2 className="text-xl font-bold mb-2">Hi! I'm Voro 🦊</h2>
                <p className="text-sm text-muted-foreground mb-6">Your AI teaching assistant. I can help you create lessons, quizzes, assignments, and analyze your classroom performance.</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Create a 45-minute Grade 8 lesson on photosynthesis',
                    'Create a 20-question algebra quiz',
                    'Analyze my Mathematics 8A class performance',
                    'Generate feedback for struggling students',
                  ].map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="text-left text-sm p-3 rounded-lg border border-border bg-card/40 hover:border-primary/40 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold ${
                  m.role === 'user' ? 'bg-muted text-foreground' : 'bg-gradient-to-br from-violet-500 to-pink-500 text-white'
                }`}>
                  {m.role === 'user' ? 'You' : '🦊'}
                </div>
                <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                  m.role === 'user' ? 'bg-primary/15 border border-primary/20' : 'bg-card/60 border border-border'
                }`}>
                  <div className="text-sm">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                  🦊
                </div>
                <div className="rounded-2xl px-4 py-3 bg-card/60 border border-border">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Voro is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={send} className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Voro to help you teach... e.g. Create a lesson on photosynthesis"
              disabled={loading}
              className="h-11"
              autoFocus
            />
            <Button type="submit" disabled={loading || !input.trim()} size="lg" className="h-11 bg-gradient-to-r from-violet-500 to-pink-500">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
