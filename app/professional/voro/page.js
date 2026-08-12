'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send, FileText, Search, BarChart3, CheckSquare, Calendar, MessageSquare, Plus, User, Bot } from 'lucide-react'
import { toast } from 'sonner'

const QUICK_ACTIONS = [
  { icon: FileText, label: 'Summarize document', prompt: 'Please summarize this document for me...' },
  { icon: Search, label: 'Analyze research', prompt: 'Analyze this research and provide key insights...' },
  { icon: FileText, label: 'Draft report', prompt: 'Help me draft a professional report about...' },
  { icon: CheckSquare, label: 'Extract action items', prompt: 'Extract action items from this content...' },
  { icon: MessageSquare, label: 'Create meeting notes', prompt: 'Create structured meeting notes from...' },
  { icon: CheckSquare, label: 'Generate project plan', prompt: 'Generate a project plan for...' },
]

export default function ProfessionalVoroPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  async function sendMessage(e) {
    e?.preventDefault?.()
    if (!input.trim() || isTyping) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI response (in production, this would call your AI API)
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: `I understand you're asking about "${input}". As your professional work assistant, I can help you with research, document analysis, report drafting, and task management. How would you like me to assist you with this?`
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  function handleQuickAction(action) {
    setInput(action.prompt)
  }

  function handleNewChat() {
    setMessages([])
    setInput('')
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <Button 
            onClick={handleNewChat}
            className="w-full justify-start gap-2 bg-gradient-to-r from-violet-500 to-pink-500"
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">Recent</div>
          <div className="space-y-1">
            {messages.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-4 text-center">No recent chats</div>
            ) : (
              messages.slice(0, 3).map((msg, i) => (
                <button key={i} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition truncate">
                  {msg.content.slice(0, 30)}...
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Voro</span>
          </div>
          <span className="text-xs text-muted-foreground">Professional Work Assistant</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground mb-8 max-w-md text-center">
                I'm your professional work assistant. I can help with research, document analysis, report drafting, and task management.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl w-full">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/60 hover:border-primary/40 hover:bg-card/80 transition text-left"
                  >
                    <action.icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Voro..."
                className="min-h-[60px] max-h-[200px] pr-12 resize-none rounded-2xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bottom-2 h-8 w-8 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Voro can make mistakes. Consider checking important information.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}