import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('practice_tests').select('*').eq('id', id).eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ test: data })
}

export async function PATCH(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  // Grade the test using questions stored server-side
  const { data: test } = await supabase.from('practice_tests').select('questions').eq('id', id).eq('user_id', user.id).single()
  if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const questions = test.questions || []
  const answers = body.answers || {}
  const timeTakenSec = body.time_taken_seconds || 0

  const perQuestion = questions.map((q, i) => ({
    idx: i,
    topic: q.topic || 'General',
    difficulty: q.difficulty || 'medium',
    correct: answers[i] === q.answer_index,
    selected: answers[i] ?? null,
  }))
  const total = questions.length
  const correct = perQuestion.filter((p) => p.correct).length
  const score_pct = total > 0 ? Math.round((correct / total) * 100) : 0

  // Topic breakdown
  const topicMap = {}
  perQuestion.forEach((p) => {
    if (!topicMap[p.topic]) topicMap[p.topic] = { topic: p.topic, total: 0, correct: 0 }
    topicMap[p.topic].total += 1
    if (p.correct) topicMap[p.topic].correct += 1
  })
  const topics = Object.values(topicMap).map((t) => ({ ...t, pct: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0 }))
  const weak_topics = topics.filter((t) => t.pct < 60).sort((a, b) => a.pct - b.pct).map((t) => t.topic)
  const strong_topics = topics.filter((t) => t.pct >= 80).sort((a, b) => b.pct - a.pct).map((t) => t.topic)

  const result = {
    total, correct, score_pct, time_taken_seconds: timeTakenSec,
    per_question: perQuestion, topics, weak_topics, strong_topics,
    answers,
  }

  const { error } = await supabase.from('practice_tests')
    .update({ result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ result })
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await supabase.from('practice_tests').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
