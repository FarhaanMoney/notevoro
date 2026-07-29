import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'
import { checkPermission, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

export const maxDuration = 60

export async function POST(request) {
  const startTime = Date.now()
  let user = null
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const authResult = await supabase.auth.getUser()
    user = authResult.data.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const topic = (body.topic || '').trim()
    const count = Math.min(20, Math.max(5, body.count || 10))
    const difficulty = body.difficulty || 'medium'
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    // Check usage permission
    const permissionCheck = await checkPermission(user.id, 'quizzes')
    if (!permissionCheck.allowed) {
      await logUsageRequest(user.id, 'quizzes', false, Date.now() - startTime, false)
      return NextResponse.json(permissionCheck, { status: 429 })
    }

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: `Generate a quiz. OUTPUT STRICT JSON: {"title":"...","questions":[{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"..."},...exactly ${count} MCQs at ${difficulty} difficulty]}. Adapt to grade/curriculum.` },
        { role: 'user', content: `Topic: ${topic}\nDifficulty: ${difficulty}\nGrade: ${profile?.grade || 'unspecified'}\nCurriculum: ${profile?.curriculum || 'general'}\nCount: ${count}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })
    const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    const { data, error } = await supabase.from('quiz_sets').insert({ user_id: user.id, topic: parsed.title || topic, difficulty, questions: parsed.questions }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    
    // Consume usage only after successful completion
    await consumeUsage(user.id, 'quizzes')
    await logUsageRequest(user.id, 'quizzes', true, Date.now() - startTime, true)
    
    return NextResponse.json({ set: data })
  } catch (err) { 
    console.error('[quizzes/generate]', err)
    if (user) await logUsageRequest(user.id, 'quizzes', true, Date.now() - startTime, false)
    return NextResponse.json({ error: err.message }, { status: 500 }) 
  }
}
