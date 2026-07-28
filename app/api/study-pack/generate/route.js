import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are Notevoro's expert AI tutor. Generate a comprehensive study pack for a student.

OUTPUT STRICT JSON (no prose, no markdown fences) with this schema:
{
  "title": "string (concise topic title)",
  "notes_md": "string (well-structured markdown study notes with headings, bullet lists, key definitions, examples, and a short summary at the end. 400-800 words. Use ## and ### for headings.)",
  "flashcards": [ { "front": "question or term", "back": "clear concise answer" }, ... exactly 10 items ],
  "quiz": [ { "question": "...", "options": ["A","B","C","D"], "answer_index": 0, "explanation": "why" }, ... exactly 5 items ]
}

Adapt vocabulary and depth to the student's grade & curriculum. Be accurate, engaging, and pedagogically strong.`

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured. Add keys to /app/.env' }, { status: 500 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const topic = (body.topic || '').trim()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum, display_name').eq('id', user.id).single()

    const userPrompt = `Topic: ${topic}
Student grade: ${profile?.grade || 'unspecified'}
Curriculum: ${profile?.curriculum || 'general'}

Generate the study pack now. Return JSON ONLY.`

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    let parsed
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 }) }

    if (!parsed.notes_md || !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.quiz)) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    }

    const { data: pack, error } = await supabase.from('study_packs').insert({
      user_id: user.id,
      topic: parsed.title || topic,
      grade: profile?.grade || null,
      curriculum: profile?.curriculum || null,
      notes_md: parsed.notes_md,
      flashcards: parsed.flashcards,
      quiz: parsed.quiz,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ pack })
  } catch (err) {
    console.error('[study-pack/generate]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
