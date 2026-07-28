import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'

export const maxDuration = 60

const ACTIONS = {
  rewrite: 'Rewrite these notes to be clearer, more organized, and more engaging. Preserve all facts and key points. Use markdown formatting.',
  summarize: 'Summarize these notes into a concise TL;DR (~150 words) with the most important points. Use markdown.',
  expand: 'Expand these notes with additional context, examples, and depth. Add relevant details a student would want. Use markdown with headings.',
  simplify: 'Rewrite these notes in simpler, easier-to-understand language. Use short sentences and analogies where helpful. Use markdown.',
  study_guide: 'Convert these notes into a study guide with clear sections: Key Concepts, Definitions, Examples, Common Pitfalls, Quick Review. Use markdown.',
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, content } = body
    if (!ACTIONS[action]) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    if (!content || content.trim().length < 5) return NextResponse.json({ error: 'Content too short' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: `You are Notevoro's writing assistant. ${ACTIONS[action]} Adapt to grade ${profile?.grade || 'general'}, curriculum ${profile?.curriculum || 'general'}. Return ONLY the new markdown content, no preamble.` },
        { role: 'user', content },
      ],
      temperature: 0.6,
    })

    const result = completion.choices?.[0]?.message?.content || ''
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[notes/ai]', err)
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
