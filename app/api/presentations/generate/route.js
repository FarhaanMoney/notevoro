import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 90

const SYSTEM = `You are Notevoro's Presentation Designer. Generate a professional slide deck.

OUTPUT STRICT JSON:
{
  "title": "deck title",
  "theme": "violet|blue|green|orange",
  "slides": [
    { "type": "title", "title": "Deck title", "subtitle": "one-line hook", "speaker_notes": "..." },
    { "type": "content", "title": "slide title", "bullets": ["point 1","point 2","point 3","point 4"], "speaker_notes": "what presenter says (60-80 words)" },
    { "type": "quote", "quote": "...", "attribution": "...", "speaker_notes": "..." },
    { "type": "stat", "stat": "BIG NUMBER", "caption": "what it means", "speaker_notes": "..." },
    { "type": "end", "title": "Thank You", "subtitle": "Questions?", "speaker_notes": "..." }
  ]
}

Rules:
- Generate 8-12 slides total.
- Slide 1 must be type "title", last slide must be type "end".
- Mix content slides with 1-2 quote or stat slides.
- Bullets: 3-5 short phrases (max 12 words each). Never full paragraphs.
- Every slide must have speaker_notes.
- Adapt to grade/curriculum. Cover the topic progressively.`

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const topic = (body.topic || '').trim()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })
    const theme = body.theme || 'violet'

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Topic: ${topic}\nTheme: ${theme}\nGrade: ${profile?.grade || 'unspecified'}\nCurriculum: ${profile?.curriculum || 'general'}\n\nReturn JSON ONLY.` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const deck = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    if (!Array.isArray(deck.slides) || deck.slides.length < 3) return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })

    const { data, error } = await supabase.from('presentations').insert({
      user_id: user.id, topic: deck.title || topic, theme: deck.theme || theme, slides: deck.slides,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ presentation: data })
  } catch (err) {
    console.error('[presentations/generate]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
