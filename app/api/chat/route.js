import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 60

const SYSTEM = (profile) => `You are Notevoro's friendly, expert AI tutor. You help students learn.

Student context:
- Name: ${profile?.display_name || 'student'}
- Grade: ${profile?.grade || 'unspecified'}
- Curriculum: ${profile?.curriculum || 'general'}

Guidelines:
- Match the student's level; use analogies and examples they'd relate to.
- Use markdown formatting (headings, bullets, code fences, tables) for clarity.
- Be concise but thorough. Show your reasoning step-by-step when solving problems.
- Never dump raw information — teach.`

export async function POST(request) {
  const supabase = await createClient()
  if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body = await request.json()
  const { message, chatId } = body
  if (!message) return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('display_name, grade, curriculum').eq('id', user.id).single()

  let activeChatId = chatId
  if (!activeChatId) {
    const title = message.slice(0, 60)
    const { data: newChat } = await supabase.from('chats').insert({ user_id: user.id, title }).select().single()
    activeChatId = newChat?.id
  }

  await supabase.from('messages').insert({ chat_id: activeChatId, user_id: user.id, role: 'user', content: message })

  const { data: history } = await supabase.from('messages').select('role, content').eq('chat_id', activeChatId).order('created_at', { ascending: true }).limit(30)

  const openai = getOpenAI()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chatId: activeChatId, type: 'meta' })}\n\n`))
      let fullText = ''
      try {
        const completion = await openai.chat.completions.create({
          model: AI_MODEL,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM(profile) },
            ...(history || []).map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
        })
        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content || ''
          if (delta) {
            fullText += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', delta })}\n\n`))
          }
        }
        await supabase.from('messages').insert({ chat_id: activeChatId, user_id: user.id, role: 'assistant', content: fullText })
        await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', activeChatId)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        console.error('[chat stream]', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' },
  })
}
