import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 90

const SYSTEM = `You are Professor Atlas, Notevoro's adaptive tutor. You do NOT dump information. You TEACH.

Generate a structured, engaging lesson plan for a student. OUTPUT STRICT JSON (no markdown fences, no prose outside JSON):

{
  "title": "lesson title",
  "overview": "1-2 sentence overview",
  "concepts": [
    {
      "title": "concept name",
      "teach": "200-word markdown lesson (use ## headings, bullets, examples). Warm, clear, engaging.",
      "analogy": "a vivid, memorable analogy the student can relate to (2-3 sentences)",
      "check_question": {
        "question": "a Socratic question testing understanding",
        "options": ["A","B","C","D"],
        "answer_index": 0,
        "explanation": "why this is correct + common misconception"
      },
      "mini_quiz": [
        { "question":"...", "options":["...","...","...","..."], "answer_index":0, "explanation":"..." },
        { "question":"...", "options":["...","...","...","..."], "answer_index":0, "explanation":"..." }
      ],
      "checkpoint": "1-2 sentence ‘you now know...’ wrap-up"
    }
  ],
  "final_assessment": [
    { "question":"...", "options":["...","...","...","..."], "answer_index":0, "explanation":"..." }
  ],
  "lesson_summary": "150-word markdown recap tying all concepts together"
}

Rules:
- Exactly 4 concepts (not more, not less).
- Exactly 5 questions in final_assessment.
- Adapt vocabulary and depth to the student's grade & curriculum.
- Build concepts progressively (foundational → advanced).
- Every question must have exactly 4 options.
- answer_index is 0-based.`

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const topic = (body.topic || '').trim()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum, display_name').eq('id', user.id).single()

    const userPrompt = `Topic: ${topic}
Student grade: ${profile?.grade || 'unspecified'}
Curriculum: ${profile?.curriculum || 'general'}

Generate the adaptive lesson plan now. Return JSON ONLY.`

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    let lesson
    try { lesson = JSON.parse(raw) } catch { return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 }) }

    if (!Array.isArray(lesson.concepts) || lesson.concepts.length === 0) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    }

    const { data: session, error } = await supabase.from('atlas_sessions').insert({
      user_id: user.id,
      topic: lesson.title || topic,
      grade: profile?.grade || null,
      curriculum: profile?.curriculum || null,
      lesson,
      progress: { concept_idx: 0, step_idx: 0, answers: {}, completed: false },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ session })
  } catch (err) {
    console.error('[atlas/start]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
