import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 60

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const content = (body.content || '').trim()
    const title = body.title || 'Study Pack from Notes'
    if (content.length < 20) return NextResponse.json({ error: 'Notes too short' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: `Convert the student's notes into a study pack. OUTPUT STRICT JSON: {"title":"...","notes_md":"cleaned-up markdown notes (400-800 words)","flashcards":[10 items with front/back],"quiz":[5 MCQ items with question, options (4), answer_index, explanation]}. Adapt to grade ${profile?.grade || 'general'}, curriculum ${profile?.curriculum || 'general'}.` },
        { role: 'user', content: `Title: ${title}\n\nNotes:\n${content}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    if (!parsed.notes_md || !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.quiz)) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    }

    const { data: pack, error } = await supabase.from('study_packs').insert({
      user_id: user.id,
      topic: parsed.title || title,
      grade: profile?.grade || null,
      curriculum: profile?.curriculum || null,
      notes_md: parsed.notes_md,
      flashcards: parsed.flashcards,
      quiz: parsed.quiz,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ pack })
  } catch (err) {
    console.error('[notes/convert]', err)
    return NextResponse.json({ error: err.message || 'Convert failed' }, { status: 500 })
  }
}
