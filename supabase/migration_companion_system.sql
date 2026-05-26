-- Notevoro Companion System Database Schema
-- Migration for study companion features

-- Add companion fields to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS study_goal TEXT,
ADD COLUMN IF NOT EXISTS preferred_study_time TEXT;

-- Create study_profile table
CREATE TABLE IF NOT EXISTS study_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subjects TEXT[] DEFAULT '{}',
  weak_subjects TEXT[] DEFAULT '{}',
  exam_dates JSONB DEFAULT '{}',
  study_goal TEXT,
  preferred_study_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  completed BOOLEAN DEFAULT false,
  session_type TEXT DEFAULT 'focus', -- focus, break, review
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL, -- study, revision, assignment, exam
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_checkins table
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  studying_today TEXT,
  main_goal_today TEXT,
  ready_for_focus BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, checkin_date) -- One checkin per user per day
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_checkin_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_study_profile_user_id ON study_profile(user_id);

-- Enable Row Level Security for study_sessions, reminders, and daily_checkins and allow users to manage their own rows
ALTER TABLE IF EXISTS study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_sessions
DROP POLICY IF EXISTS study_sessions_select_own ON study_sessions;
CREATE POLICY study_sessions_select_own ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS study_sessions_insert_own ON study_sessions;
CREATE POLICY study_sessions_insert_own ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_sessions_update_own ON study_sessions;
CREATE POLICY study_sessions_update_own ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_sessions_delete_own ON study_sessions;
CREATE POLICY study_sessions_delete_own ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for reminders
DROP POLICY IF EXISTS reminders_select_own ON reminders;
CREATE POLICY reminders_select_own ON reminders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_insert_own ON reminders;
CREATE POLICY reminders_insert_own ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_update_own ON reminders;
CREATE POLICY reminders_update_own ON reminders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_delete_own ON reminders;
CREATE POLICY reminders_delete_own ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Enable Row Level Security for daily_checkins and allow users to manage their own rows
ALTER TABLE IF EXISTS daily_checkins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_checkins
DROP POLICY IF EXISTS daily_checkins_select_own ON daily_checkins;
CREATE POLICY daily_checkins_select_own ON daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_checkins_insert_own ON daily_checkins;
CREATE POLICY daily_checkins_insert_own ON daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_checkins_update_own ON daily_checkins;
CREATE POLICY daily_checkins_update_own ON daily_checkins
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_checkins_delete_own ON daily_checkins;
CREATE POLICY daily_checkins_delete_own ON daily_checkins
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update streak
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's streak count and last active date
  UPDATE users 
  SET 
    streak_count = CASE 
      WHEN users.last_active_date IS NULL THEN 1
      WHEN users.last_active_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
      WHEN users.last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN users.streak_count + 1
      ELSE users.streak_count
    END,
    last_active_date = CURRENT_DATE
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update streak when study session is completed
DROP TRIGGER IF EXISTS trigger_update_study_streak ON study_sessions;
CREATE TRIGGER trigger_update_study_streak
  AFTER INSERT ON study_sessions
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_study_streak();

-- Create function to get user study context for AI
CREATE OR REPLACE FUNCTION get_user_study_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'streak_count', COALESCE(u.streak_count, 0),
    'last_active_date', u.last_active_date,
    'study_goal', u.study_goal,
    'preferred_study_time', u.preferred_study_time,
    'subjects', sp.subjects,
    'weak_subjects', sp.weak_subjects,
    'exam_dates', sp.exam_dates,
    'recent_sessions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'subject', s.subject,
          'duration', s.duration,
          'completed', s.completed,
          'created_at', s.created_at
        )
      )
      FROM study_sessions s
      WHERE s.user_id = p_user_id
      AND s.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY s.created_at DESC
      LIMIT 5
    ),
    'upcoming_reminders', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', r.title,
          'reminder_time', r.reminder_time,
          'reminder_type', r.reminder_type
        )
      )
      FROM reminders r
      WHERE r.user_id = p_user_id
      AND r.completed = false
      AND r.reminder_time >= NOW()
      ORDER BY r.reminder_time ASC
      LIMIT 10
    ),
    'today_checkin', (
      SELECT jsonb_build_object(
        'studying_today', dc.studying_today,
        'main_goal_today', dc.main_goal_today,
        'ready_for_focus', dc.ready_for_focus,
        'completed', dc.completed
      )
      FROM daily_checkins dc
      WHERE dc.user_id = p_user_id
      AND dc.checkin_date = CURRENT_DATE
    )
  ) INTO context
  FROM users u
  LEFT JOIN study_profile sp ON u.id = sp.user_id
  WHERE u.id = p_user_id;
  
  RETURN COALESCE(context, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;
