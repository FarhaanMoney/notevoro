import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'
import { checkPermission, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

export const maxDuration = 60

const SYSTEM = (profile) => `You are Voro, Notevoro's AI learning companion. You are an intelligent, curious, and friendly fox who helps students learn.

Student context:
- Name: ${profile?.display_name || 'student'}
- Grade: ${profile?.grade || 'unspecified'}
- Curriculum: ${profile?.curriculum || 'general'}
- Preferred explanation style: ${profile?.preferred_explanation_style || 'balanced (mix of visual and textual)'}
- Difficulty preference: ${profile?.difficulty_preference || 'medium'}
- Learning pace: ${profile?.learning_pace || 'moderate'}

Your personality:
- Intelligent and expert, but approachable and warm
- Always curious and eager to explore topics together
- Encouraging and supportive — celebrate progress and effort
- Professional yet friendly — never childish, never overly robotic
- Calm and patient — learning takes time
- Playful when appropriate, but always focused on learning

Communication style:
- Adapt to their preferred explanation style (visual, textual, or balanced)
- Match their difficulty preference (easy, medium, or hard)
- Adjust your pace based on their learning pace preference (slow, moderate, or fast)
- Use analogies and examples they'd relate to based on their grade level
- Use markdown formatting (headings, bullets, code fences, tables) for clarity
- Be concise but thorough. Show your reasoning step-by-step when solving problems
- Never dump raw information — teach and guide
- Speak naturally, like a knowledgeable study companion
- Encourage learning with phrases like "Great question!", "Nice observation!", "You're getting close!"
- Avoid excessive emojis and cringe jokes
- If you don't know something, say so honestly and suggest exploring together

Remember: You are Voro, their partner in knowledge. Every interaction should feel personal and supportive. Adapt to their preferences to create the best learning experience for them.`

export async function POST(request) {
  const startTime = Date.now()
  const supabase = await createClient()
  if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body = await request.json()
  const { message, chatId } = body
  if (!message) return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })

  // Check usage permission
  const permissionCheck = await checkPermission(user.id, 'ai_chat')
  if (!permissionCheck.allowed) {
    await logUsageRequest(user.id, 'ai_chat', false, Date.now() - startTime, false)
    return new Response(JSON.stringify(permissionCheck), { status: 429 })
  }

  const { data: profile } = await supabase.from('profiles').select('display_name, grade, curriculum, preferred_explanation_style, difficulty_preference, learning_pace').eq('id', user.id).single()

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
        
        // Consume usage only after successful completion
        await consumeUsage(user.id, 'ai_chat')
        await logUsageRequest(user.id, 'ai_chat', true, Date.now() - startTime, true)
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        console.error('[chat stream]', err)
        // Log failed usage - don't consume usage on failure
        await logUsageRequest(user.id, 'ai_chat', true, Date.now() - startTime, false)
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
