-- Add workspace_id columns to quizzes, mock_tests, and flashcards tables

-- Add workspace_id to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to mock_tests table  
ALTER TABLE mock_tests
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
