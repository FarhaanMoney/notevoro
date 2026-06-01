-- Add missing columns to existing tables

-- Add missing columns to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('topic', 'text', 'pdf', 'image')),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS key_concepts JSONB,
ADD COLUMN IF NOT EXISTS important_points JSONB,
ADD COLUMN IF NOT EXISTS definitions JSONB,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add missing columns to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Quiz',
ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'General',
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add missing columns to mock_tests table
ALTER TABLE mock_tests
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Mock Test',
ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'General',
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add missing columns to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
