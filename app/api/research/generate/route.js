import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, AI_MODEL } from '@/lib/ai/openai'
import { checkPermission, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

export const maxDuration = 90

const SYSTEM = `You are Notevoro's Research Agent. Generate a comprehensive, well-cited research report.

OUTPUT STRICT JSON (no markdown fences):
{
  "title": "clear title",
  "abstract": "2-3 sentence executive summary",
  "sections": [
    { "heading": "...", "body_md": "200-word markdown section with bullet points, examples" },
    ... 5-7 sections total. Cover: Introduction, Background/History, Key Concepts, Real-world Applications, Debates & Perspectives, Recent Developments, Conclusion
  ],
  "key_takeaways": ["5 bullet points, one sentence each"],
  "sources": [
    { "title": "Source name", "type": "book|paper|article|website", "authors": "...", "year": "YYYY", "note": "1-sentence why relevant" },
    ... 6-10 well-known, real, verifiable sources
  ],
  "further_reading": ["3-5 suggested search queries or topics"]
}

Only cite well-known, real sources. Adapt depth to student's grade & curriculum. Be objective and cite perspectives where relevant.`

export async function POST(request) {
  const startTime = Date.now()
  let user = null
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const topic = (body.topic || '').trim()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    // Check usage permission
    const permissionCheck = await checkPermission(user.id, 'research')
    if (!permissionCheck.allowed) {
      await logUsageRequest(user.id, 'research', false, Date.now() - startTime, false)
      return NextResponse.json(permissionCheck, { status: 429 })
    }

    const { data: profile } = await supabase.from('profiles').select('grade, curriculum').eq('id', user.id).single()

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Research topic: ${topic}\nGrade: ${profile?.grade || 'unspecified'}\nCurriculum: ${profile?.curriculum || 'general'}\n\nReturn JSON ONLY.` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })

    const report = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    if (!report.sections || !Array.isArray(report.sections)) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    }

    const { data, error } = await supabase.from('research_reports').insert({
      user_id: user.id, topic: report.title || topic, report,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    
    // Consume usage only after successful completion
    await consumeUsage(user.id, 'research')
    await logUsageRequest(user.id, 'research', true, Date.now() - startTime, true)
    
    return NextResponse.json({ report: data })
  } catch (err) {
    console.error('[research/generate]', err)
    if (user) await logUsageRequest(user.id, 'research', true, Date.now() - startTime, false)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
