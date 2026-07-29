import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsageSummary } from '@/lib/usage/usageEngine'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) {
    // Return preview mode data
    return NextResponse.json({ 
      preview: true, 
      plan: 'free', 
      status: 'preview',
      limits: {
        ai_chat_per_day: 20,
        atlas_per_day: 1,
        flashcards_per_day: 3,
        quizzes_per_day: 3,
        tests_per_day: 1,
        presentations_per_day: 1,
        research_per_day: 1,
        images_per_day: 1,
        storage_mb: 500,
      },
      usage: {
        today: {
          ai_chat_used: 0,
          atlas_sessions_used: 0,
          flashcards_used: 0,
          quizzes_used: 0,
          tests_used: 0,
          presentations_used: 0,
          research_used: 0,
          images_used: 0,
        },
        all_time: {
          notes: 0,
          folders: 0,
        },
      },
      remaining: {
        ai_chat: 20,
        atlas_sessions: 1,
        flashcards: 3,
        quizzes: 3,
        tests: 1,
        presentations: 1,
        research: 1,
        images: 1,
        storage_mb: 500,
      },
    })
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const usageSummary = await getUsageSummary(user.id)
  return NextResponse.json(usageSummary)
}
