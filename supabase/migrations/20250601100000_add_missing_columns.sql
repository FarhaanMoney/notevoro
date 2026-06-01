-- Add file_url column to flashcards table
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add workspace_id column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add file_url column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS file_url TEXT;
