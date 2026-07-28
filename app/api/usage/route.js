import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLAN_LIMITS = {
  free: { chats_per_day: 20, atlas_per_day: 1, flashcards_per_day: 3, quizzes_per_day: 3, tests_per_day: 1, presentations_per_day: 1, research_per_day: 1, storage_mb: 500 },
  pro: { chats_per_day: 250, atlas_per_day: 999, flashcards_per_day: 999, quizzes_per_day: 999, tests_per_day: 999, presentations_per_day: 999, research_per_day: 999, storage_mb: 10240 },
  premium: { chats_per_day: 999, atlas_per_day: 999, flashcards_per_day: 999, quizzes_per_day: 999, tests_per_day: 999, presentations_per_day: 999, research_per_day: 999, storage_mb: 102400 },
}

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ preview: true, plan: 'free', limits: PLAN_LIMITS.free, usage: {} })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const startOfDay = new Date(today + 'T00:00:00Z').toISOString()

  // Count activity: today and all-time
  const [chatsToday, chatsAll, atlasToday, atlasAll, spToday, spAll, fcToday, fcAll, qzToday, qzAll, tstToday, tstAll, presToday, presAll, resToday, resAll, notesAll, foldersAll] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'user').gte('created_at', startOfDay),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'user'),
    supabase.from('atlas_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('atlas_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('study_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('study_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('flashcard_sets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('flashcard_sets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('quiz_sets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('quiz_sets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('practice_tests').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('practice_tests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('presentations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('presentations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('research_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfDay),
    supabase.from('research_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('folders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const plan = 'free' // TODO: pull from subscription table when Razorpay is wired
  const usage = {
    today: {
      chats: chatsToday.count || 0,
      atlas: atlasToday.count || 0,
      study_packs: spToday.count || 0,
      flashcards: fcToday.count || 0,
      quizzes: qzToday.count || 0,
      tests: tstToday.count || 0,
      presentations: presToday.count || 0,
      research: resToday.count || 0,
    },
    all_time: {
      chats: chatsAll.count || 0,
      atlas: atlasAll.count || 0,
      study_packs: spAll.count || 0,
      flashcards: fcAll.count || 0,
      quizzes: qzAll.count || 0,
      tests: tstAll.count || 0,
      presentations: presAll.count || 0,
      research: resAll.count || 0,
      notes: notesAll.count || 0,
      folders: foldersAll.count || 0,
    },
  }

  return NextResponse.json({ plan, limits: PLAN_LIMITS[plan], usage })
}
