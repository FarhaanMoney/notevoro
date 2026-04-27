-- Notevoro schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor.

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password text,
  avatar text,
  google_id text,
  xp integer not null default 0,
  streak integer not null default 0,
  plan text not null default 'free',
  credits integer not null default 50,
  credits_reset_at text,
  quizzes_taken integer not null default 0,
  correct_answers integer not null default 0,
  total_questions integer not null default 0,
  last_active text,
  created_at text not null
);

create index if not exists idx_users_google_id on users (google_id);

create table if not exists chats (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_chats_user_id on chats (user_id);
create index if not exists idx_chats_updated_at on chats (updated_at);

create table if not exists messages (
  id text primary key,
  chat_id text not null references chats(id) on delete cascade,
  role text not null,
  content text not null,
  created_at text not null
);
create index if not exists idx_messages_chat_id on messages (chat_id);
create index if not exists idx_messages_created_at on messages (created_at);

create table if not exists quizzes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  topic text not null,
  difficulty text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at text not null
);
create index if not exists idx_quizzes_user_id on quizzes (user_id);

create table if not exists quiz_attempts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  quiz_id text not null references quizzes(id) on delete cascade,
  topic text,
  correct integer not null default 0,
  total integer not null default 0,
  xp_gained integer not null default 0,
  created_at text not null
);
create index if not exists idx_quiz_attempts_user_id on quiz_attempts (user_id);
create index if not exists idx_quiz_attempts_created_at on quiz_attempts (created_at);

create table if not exists flashcard_decks (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at text not null
);
create index if not exists idx_flashcard_decks_user_id on flashcard_decks (user_id);

create table if not exists notes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  topic text,
  source_chat_id text references chats(id) on delete set null,
  public_slug text unique,
  is_public boolean not null default false,
  created_at text not null
);
create index if not exists idx_notes_user_id on notes (user_id);
create index if not exists idx_notes_public_slug on notes (public_slug);

create table if not exists study_plans (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  goal text not null,
  days jsonb not null default '[]'::jsonb,
  created_at text not null
);
create index if not exists idx_study_plans_user_id on study_plans (user_id);

create table if not exists mock_tests (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  topic text not null,
  duration_minutes integer not null default 20,
  questions jsonb not null default '[]'::jsonb,
  created_at text not null
);
create index if not exists idx_mock_tests_user_id on mock_tests (user_id);

create table if not exists mock_attempts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  test_id text not null references mock_tests(id) on delete cascade,
  topic text,
  correct integer not null default 0,
  total integer not null default 0,
  xp_gained integer not null default 0,
  time_taken_seconds integer not null default 0,
  created_at text not null
);
create index if not exists idx_mock_attempts_user_id on mock_attempts (user_id);

create table if not exists file_analyses (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  filename text not null,
  type text,
  action text not null,
  result text not null,
  created_at text not null
);
create index if not exists idx_file_analyses_user_id on file_analyses (user_id);

create table if not exists orders (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan text not null,
  amount integer not null,
  status text not null,
  payment_id text,
  paid_at text,
  created_at text not null
);
create index if not exists idx_orders_user_id on orders (user_id);
