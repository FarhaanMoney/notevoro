import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'
import { checkPermission, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

export const maxDuration = 90

const SYSTEM = `You are Notevoro's Practice Test Designer. Build realistic, exam-style tests.

OUTPUT STRICT JSON:
{
  "title": "Test title",
  "subject": "subject label",
  "duration_minutes": integer 20-90,
  "questions": [
    {
      "question": "...",
      "options": ["A","B","C","D"],
      "answer_index": 0,
      "explanation": "why the correct answer is right",
      "topic": "a short topic tag e.g. 'Kinematics', 'French Revolution', 'Cell Division'",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Rules:
- Generate the requested number of questions.
- Mix difficulties (roughly 30% easy, 50% medium, 20% hard) unless overall difficulty is specified.
- Every question tagged with a topic (used for weak-topic analysis).
- All MCQs, 4 options each, one correct.
- Adapt language to grade & curriculum.`

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
    const subject = (body.subject || '').trim()
    if (!subject) return NextResponse.json({ error: 'Subject required' }, { status: 400 })
    const count = Math.min(30, Math.max(5, body.count || 15))
    const duration = Math.min(120, Math.max(10, body.duration_minutes || 30))

    // Check usage permission
    const permissionCheck = await checkPermission(user.id, 'tests')
    if (!permissionCheck.allowed) {
      await logUsageRequest(user.id, 'tests', false, Date.now() - startTime, false)
      return NextResponse.json(permissionCheck, { status: 429 })
    }

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Subject: ${subject}\nGrade: ${profile?.grade || 'unspecified'}\nCurriculum: ${profile?.curriculum || 'general'}\nQuestions: ${count}\nDuration: ${duration} minutes\n\nReturn JSON ONLY.` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })
    const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })

    const { data, error } = await supabase.from('practice_tests').insert({
      user_id: user.id,
      title: parsed.title || subject,
      subject: parsed.subject || subject,
      duration_minutes: parsed.duration_minutes || duration,
      questions: parsed.questions,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    
    // Consume usage only after successful completion
    await consumeUsage(user.id, 'tests')
    await logUsageRequest(user.id, 'tests', true, Date.now() - startTime, true)
    
    return NextResponse.json({ test: data })
  } catch (err) {
    console.error('[tests/generate]', err)
    if (user) await logUsageRequest(user.id, 'tests', true, Date.now() - startTime, false)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
