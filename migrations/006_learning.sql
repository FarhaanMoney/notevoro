-- Migration 006: Learning System
-- Complete learning tools: flashcards, quizzes, tests, presentations, research, atlas

-- =========================
-- FLASHCARD SETS
-- =========================
create table public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Set details
  title text not null,
  description text,
  subject text,
  topic text,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  source_note_id uuid references public.notes(id) on delete set null,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Sharing
  shared_count integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_studied_at timestamptz,
  
  -- Constraints
  constraint flashcard_sets_title_not_empty check (length(trim(title)) > 0),
  constraint flashcard_sets_shared_non_negative check (shared_count >= 0)
);

-- =========================
-- FLASHCARDS
-- =========================
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  flashcard_set_id uuid not null references public.flashcard_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Card content
  front text not null,
  back text not null,
  front_type text default 'text', -- 'text', 'image', 'audio', 'video'
  back_type text default 'text',
  
  -- Media
  front_media_path text,
  back_media_path text,
  
  -- Ordering
  sort_order integer default 0,
  
  -- Spaced repetition
  ease_factor float default 2.5,
  interval integer default 0,
  repetitions integer default 0,
  next_review_at timestamptz,
  
  -- Performance
  total_reviews integer default 0,
  correct_reviews integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint flashcards_front_not_empty check (length(trim(front)) > 0),
  constraint flashcards_back_not_empty check (length(trim(back)) > 0),
  constraint flashcards_type_valid check (front_type in ('text', 'image', 'audio', 'video') and back_type in ('text', 'image', 'audio', 'video')),
  constraint flashcards_sort_non_negative check (sort_order >= 0),
  constraint flashcards_ease_valid check (ease_factor >= 1.3),
  constraint flashcards_interval_non_negative check (interval >= 0),
  constraint flashcards_repetitions_non_negative check (repetitions >= 0),
  constraint flashcards_reviews_non_negative check (total_reviews >= 0 and correct_reviews >= 0)
);

-- =========================
-- QUIZ SETS
-- =========================
create table public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Quiz details
  title text not null,
  description text,
  subject text,
  topic text,
  
  -- Quiz settings
  question_count integer default 10,
  time_limit_seconds integer, -- null for unlimited
  passing_score integer default 70,
  randomize_questions boolean default true,
  randomize_options boolean default true,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  source_note_id uuid references public.notes(id) on delete set null,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint quiz_sets_title_not_empty check (length(trim(title)) > 0),
  constraint quiz_sets_question_count_positive check (question_count > 0),
  constraint quiz_sets_passing_valid check (passing_score >= 0 and passing_score <= 100),
  constraint quiz_sets_time_positive check (time_limit_seconds is null or time_limit_seconds > 0)
);

-- =========================
-- QUIZ QUESTIONS
-- =========================
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.quiz_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Question details
  question text not null,
  question_type text default 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  explanation text,
  
  -- Options (for multiple choice)
  options jsonb default '[]'::jsonb,
  correct_answer text not null,
  
  -- Difficulty
  difficulty text default 'medium', -- 'easy', 'medium', 'hard'
  points integer default 1,
  
  -- Ordering
  sort_order integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint quiz_questions_question_not_empty check (length(trim(question)) > 0),
  constraint quiz_questions_type_valid check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  constraint quiz_questions_difficulty_valid check (difficulty in ('easy', 'medium', 'hard')),
  constraint quiz_questions_points_positive check (points > 0),
  constraint quiz_questions_sort_non_negative check (sort_order >= 0)
);

-- =========================
-- PRACTICE TESTS
-- =========================
create table public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Test details
  title text not null,
  description text,
  subject text,
  topic text,
  
  -- Test settings
  duration_minutes integer not null,
  total_questions integer default 50,
  passing_score integer default 70,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint practice_tests_title_not_empty check (length(trim(title)) > 0),
  constraint practice_tests_duration_positive check (duration_minutes > 0),
  constraint practice_tests_questions_positive check (total_questions > 0),
  constraint practice_tests_passing_valid check (passing_score >= 0 and passing_score <= 100)
);

-- =========================
-- TEST RESULTS
-- =========================
create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.practice_tests(id) on delete cascade,
  
  -- Score
  score integer not null,
  total_questions integer not null,
  correct_answers integer not null,
  percentage float not null,
  passed boolean not null,
  
  -- Timing
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_seconds integer,
  
  -- Answers
  answers jsonb default '{}'::jsonb,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint test_results_score_valid check (score >= 0 and score <= total_questions),
  constraint test_results_percentage_valid check (percentage >= 0 and percentage <= 100),
  constraint test_results_duration_positive check (duration_seconds is null or duration_seconds > 0)
);

-- =========================
-- ATLAS SESSIONS
-- =========================
create table public.atlas_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Session details
  title text not null,
  topic text not null,
  subject text,
  
  -- Session settings
  difficulty text default 'medium', -- 'beginner', 'intermediate', 'advanced'
  duration_minutes integer default 30,
  learning_objectives jsonb default '[]'::jsonb,
  
  -- Progress
  current_step integer default 0,
  total_steps integer default 5,
  progress_percentage float default 0,
  
  -- Status
  status text default 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Constraints
  constraint atlas_sessions_title_not_empty check (length(trim(title)) > 0),
  constraint atlas_sessions_topic_not_empty check (length(trim(topic)) > 0),
  constraint atlas_sessions_difficulty_valid check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint atlas_sessions_duration_positive check (duration_minutes > 0),
  constraint atlas_sessions_step_valid check (current_step >= 0 and total_steps > 0 and current_step <= total_steps),
  constraint atlas_sessions_progress_valid check (progress_percentage >= 0 and progress_percentage <= 100),
  constraint atlas_sessions_status_valid check (status in ('in_progress', 'completed', 'abandoned'))
);

-- =========================
-- ATLAS STEPS
-- =========================
create table public.atlas_steps (
  id uuid primary key default gen_random_uuid(),
  atlas_session_id uuid not null references public.atlas_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Step details
  step_number integer not null,
  title text not null,
  content text not null,
  
  -- Step type
  step_type text default 'explanation', -- 'explanation', 'example', 'practice', 'quiz', 'summary'
  
  -- Media
  media_path text,
  media_type text,
  
  -- Completion
  is_completed boolean default false,
  completed_at timestamptz,
  
  -- User notes
  user_notes text,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint atlas_steps_number_positive check (step_number > 0),
  constraint atlas_steps_title_not_empty check (length(trim(title)) > 0),
  constraint atlas_steps_content_not_empty check (length(trim(content)) > 0),
  constraint atlas_steps_type_valid check (step_type in ('explanation', 'example', 'practice', 'quiz', 'summary'))
);

-- =========================
-- ATLAS PROGRESS
-- =========================
create table public.atlas_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  atlas_session_id uuid not null references public.atlas_sessions(id) on delete cascade,
  
  -- Progress tracking
  steps_completed integer default 0,
  time_spent_seconds integer default 0,
  
  -- Quiz performance
  quiz_score float,
  quiz_attempts integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint atlas_progress_steps_non_negative check (steps_completed >= 0),
  constraint atlas_progress_time_non_negative check (time_spent_seconds >= 0),
  constraint atlas_progress_score_valid check (quiz_score is null or (quiz_score >= 0 and quiz_score <= 100)),
  constraint atlas_progress_attempts_non_negative check (quiz_attempts >= 0)
);

-- =========================
-- PRESENTATIONS
-- =========================
create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Presentation details
  title text not null,
  description text,
  topic text,
  subject text,
  
  -- Content
  slides jsonb default '[]'::jsonb,
  slide_count integer default 0,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  source_note_id uuid references public.notes(id) on delete set null,
  
  -- Export
  export_format text, -- 'pptx', 'pdf', 'html'
  export_path text,
  exported_at timestamptz,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint presentations_title_not_empty check (length(trim(title)) > 0),
  constraint presentations_slides_non_negative check (slide_count >= 0)
);

-- =========================
-- RESEARCH REPORTS
-- =========================
create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Report details
  title text not null,
  topic text not null,
  description text,
  
  -- Content
  content text,
  word_count integer default 0,
  
  -- Sources
  sources jsonb default '[]'::jsonb,
  source_count integer default 0,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  search_query text,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint research_reports_title_not_empty check (length(trim(title)) > 0),
  constraint research_reports_topic_not_empty check (length(trim(topic)) > 0),
  constraint research_reports_word_count_non_negative check (word_count >= 0),
  constraint research_reports_source_count_non_negative check (source_count >= 0)
);

-- =========================
-- STUDY GUIDES
-- =========================
create table public.study_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Guide details
  title text not null,
  subject text,
  topic text,
  description text,
  
  -- Content
  sections jsonb default '[]'::jsonb,
  section_count integer default 0,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  source_note_ids jsonb default '[]'::jsonb,
  
  -- Status
  is_public boolean default false,
  is_archived boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint study_guides_title_not_empty check (length(trim(title)) > 0),
  constraint study_guides_section_count_non_negative check (section_count >= 0)
);

-- =========================
-- INDEXES
-- =========================
-- Flashcard Sets
create index idx_flashcard_sets_user_id on public.flashcard_sets(user_id);
create index idx_flashcard_sets_subject on public.flashcard_sets(subject);
create index idx_flashcard_sets_topic on public.flashcard_sets(topic);
create index idx_flashcard_sets_is_ai_generated on public.flashcard_sets(is_ai_generated);
create index idx_flashcard_sets_is_public on public.flashcard_sets(is_public);
create index idx_flashcard_sets_created_at on public.flashcard_sets(created_at);
create index idx_flashcard_sets_last_studied on public.flashcard_sets(last_studied_at);

-- Flashcards
create index idx_flashcards_set_id on public.flashcards(flashcard_set_id);
create index idx_flashcards_user_id on public.flashcards(user_id);
create index idx_flashcards_sort_order on public.flashcards(sort_order);
create index idx_flashcards_next_review on public.flashcards(next_review_at);
create index idx_flashcards_set_next_review on public.flashcards(flashcard_set_id, next_review_at);

-- Quiz Sets
create index idx_quiz_sets_user_id on public.quiz_sets(user_id);
create index idx_quiz_sets_subject on public.quiz_sets(subject);
create index idx_quiz_sets_topic on public.quiz_sets(topic);
create index idx_quiz_sets_is_ai_generated on public.quiz_sets(is_ai_generated);
create index idx_quiz_sets_is_public on public.quiz_sets(is_public);
create index idx_quiz_sets_created_at on public.quiz_sets(created_at);

-- Quiz Questions
create index idx_quiz_questions_set_id on public.quiz_questions(quiz_set_id);
create index idx_quiz_questions_user_id on public.quiz_questions(user_id);
create index idx_quiz_questions_difficulty on public.quiz_questions(difficulty);
create index idx_quiz_questions_sort_order on public.quiz_questions(sort_order);

-- Practice Tests
create index idx_practice_tests_user_id on public.practice_tests(user_id);
create index idx_practice_tests_subject on public.practice_tests(subject);
create index idx_practice_tests_topic on public.practice_tests(topic);
create index idx_practice_tests_is_ai_generated on public.practice_tests(is_ai_generated);
create index idx_practice_tests_is_public on public.practice_tests(is_public);
create index idx_practice_tests_created_at on public.practice_tests(created_at);

-- Test Results
create index idx_test_results_user_id on public.test_results(user_id);
create index idx_test_results_test_id on public.test_results(test_id);
create index idx_test_results_passed on public.test_results(passed);
create index idx_test_results_percentage on public.test_results(percentage);
create index idx_test_results_created_at on public.test_results(created_at);
create index idx_test_results_user_created on public.test_results(user_id, created_at desc);

-- Atlas Sessions
create index idx_atlas_sessions_user_id on public.atlas_sessions(user_id);
create index idx_atlas_sessions_subject on public.atlas_sessions(subject);
create index idx_atlas_sessions_difficulty on public.atlas_sessions(difficulty);
create index idx_atlas_sessions_status on public.atlas_sessions(status);
create index idx_atlas_sessions_created_at on public.atlas_sessions(created_at);

-- Atlas Steps
create index idx_atlas_steps_session_id on public.atlas_steps(atlas_session_id);
create index idx_atlas_steps_user_id on public.atlas_steps(user_id);
create index idx_atlas_steps_step_number on public.atlas_steps(step_number);
create index idx_atlas_steps_is_completed on public.atlas_steps(is_completed);

-- Atlas Progress
create index idx_atlas_progress_user_id on public.atlas_progress(user_id);
create index idx_atlas_progress_session_id on public.atlas_progress(atlas_session_id);

-- Presentations
create index idx_presentations_user_id on public.presentations(user_id);
create index idx_presentations_subject on public.presentations(subject);
create index idx_presentations_topic on public.presentations(topic);
create index idx_presentations_is_ai_generated on public.presentations(is_ai_generated);
create index idx_presentations_is_public on public.presentations(is_public);
create index idx_presentations_created_at on public.presentations(created_at);

-- Research Reports
create index idx_research_reports_user_id on public.research_reports(user_id);
create index idx_research_reports_topic on public.research_reports(topic);
create index idx_research_reports_is_ai_generated on public.research_reports(is_ai_generated);
create index idx_research_reports_is_public on public.research_reports(is_public);
create index idx_research_reports_created_at on public.research_reports(created_at);

-- Study Guides
create index idx_study_guides_user_id on public.study_guides(user_id);
create index idx_study_guides_subject on public.study_guides(subject);
create index idx_study_guides_topic on public.study_guides(topic);
create index idx_study_guides_is_ai_generated on public.study_guides(is_ai_generated);
create index idx_study_guides_is_public on public.study_guides(is_public);
create index idx_study_guides_created_at on public.study_guides(created_at);

-- =========================
-- FUNCTIONS
-- =========================

-- Create flashcard set
create or replace function public.create_flashcard_set(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_subject text,
  p_topic text,
  p_is_ai_generated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
begin
  insert into public.flashcard_sets (
    user_id,
    title,
    description,
    subject,
    topic,
    is_ai_generated
  )
  values (
    p_user_id,
    p_title,
    p_description,
    p_subject,
    p_topic,
    p_is_ai_generated
  )
  returning id into v_set_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'FLASHCARDS', 'flashcard_set', v_set_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('flashcard_sets_created', 1));
  
  return v_set_id;
end;
$$;

-- Add flashcard to set
create or replace function public.add_flashcard(
  p_flashcard_set_id uuid,
  p_user_id uuid,
  p_front text,
  p_back text,
  p_sort_order integer default null,
  p_front_type text default 'text',
  p_back_type text default 'text'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_sort_order integer;
  v_card_id uuid;
begin
  if p_sort_order is null then
    select coalesce(max(sort_order), 0) into v_max_sort_order
    from public.flashcards
    where flashcard_set_id = p_flashcard_set_id;
    p_sort_order := v_max_sort_order + 1;
  end if;
  
  insert into public.flashcards (
    flashcard_set_id,
    user_id,
    front,
    back,
    front_type,
    back_type,
    sort_order
  )
  values (
    p_flashcard_set_id,
    p_user_id,
    p_front,
    p_back,
    p_front_type,
    p_back_type,
    p_sort_order
  )
  returning id into v_card_id;
  
  return v_card_id;
end;
$$;

-- Update flashcard review (spaced repetition)
create or replace function public.update_flashcard_review(
  p_flashcard_id uuid,
  p_user_id uuid,
  p_quality integer -- 0-5 scale (0=again, 5=easy)
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ease_factor float;
  v_interval integer;
  v_repetitions integer;
  v_new_interval integer;
  v_new_ease_factor float;
  v_new_repetitions integer;
begin
  select ease_factor, interval, repetitions into v_ease_factor, v_interval, v_repetitions
  from public.flashcards
  where id = p_flashcard_id
    and user_id = p_user_id;
  
  if not found then
    return false;
  end if;
  
  -- SM-2 algorithm simplified
  if p_quality >= 3 then
    if v_repetitions = 0 then
      v_new_interval := 1;
    elsif v_repetitions = 1 then
      v_new_interval := 6;
    else
      v_new_interval := round(v_interval * v_ease_factor);
    end if;
    v_new_repetitions := v_repetitions + 1;
  else
    v_new_repetitions := 0;
    v_new_interval := 1;
  end if;
  
  v_new_ease_factor := v_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  v_new_ease_factor := greatest(1.3, v_new_ease_factor);
  
  update public.flashcards
  set
    ease_factor = v_new_ease_factor,
    interval = v_new_interval,
    repetitions = v_new_repetitions,
    next_review_at = now() + (v_new_interval || ' days')::interval,
    total_reviews = total_reviews + 1,
    correct_reviews = correct_reviews + case when p_quality >= 3 then 1 else 0 end,
    updated_at = now()
  where id = p_flashcard_id
    and user_id = p_user_id;
  
  -- Update flashcard set last_studied_at
  update public.flashcard_sets
  set last_studied_at = now()
  where id = (select flashcard_set_id from public.flashcards where id = p_flashcard_id);
  
  return true;
end;
$$;

-- Create quiz set
create or replace function public.create_quiz_set(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_subject text,
  p_topic text,
  p_question_count integer,
  p_is_ai_generated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz_id uuid;
begin
  insert into public.quiz_sets (
    user_id,
    title,
    description,
    subject,
    topic,
    question_count,
    is_ai_generated
  )
  values (
    p_user_id,
    p_title,
    p_description,
    p_subject,
    p_topic,
    p_question_count,
    p_is_ai_generated
  )
  returning id into v_quiz_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'QUIZ', 'quiz_set', v_quiz_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('quizzes_created', 1));
  
  return v_quiz_id;
end;
$$;

-- Create practice test
create or replace function public.create_practice_test(
  p_user_id uuid,
  p_title text,
  p_duration_minutes integer,
  p_description text,
  p_subject text,
  p_topic text,
  p_total_questions integer,
  p_is_ai_generated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test_id uuid;
begin
  insert into public.practice_tests (
    user_id,
    title,
    description,
    subject,
    topic,
    duration_minutes,
    total_questions,
    is_ai_generated
  )
  values (
    p_user_id,
    p_title,
    p_description,
    p_subject,
    p_topic,
    p_duration_minutes,
    p_total_questions,
    p_is_ai_generated
  )
  returning id into v_test_id;
  
  return v_test_id;
end;
$$;

-- Submit test result
create or replace function public.submit_test_result(
  p_test_id uuid,
  p_user_id uuid,
  p_total_questions integer,
  p_correct_answers integer,
  p_started_at timestamptz,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result_id uuid;
  v_score numeric;
begin
  v_score := (p_correct_answers::numeric / p_total_questions::numeric) * 100;

  insert into public.test_results (
    test_id,
    user_id,
    total_questions,
    correct_answers,
    score,
    percentage,
    passed,
    started_at,
    completed_at,
    duration_seconds,
    answers
  )
  values (
    p_user_id,
    p_test_id,
    p_score,
    p_total_questions,
    p_correct_answers,
    v_percentage,
    v_passed,
    p_started_at,
    now(),
    v_duration_seconds,
    p_answers
  )
  returning id into v_result_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'TEST', 'test_result', v_result_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('tests_completed', 1));
  
  return v_result_id;
end;
$$;

-- Create atlas session
create or replace function public.create_atlas_session(
  p_user_id uuid,
  p_title text,
  p_topic text,
  p_subject text,
  p_difficulty text,
  p_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  insert into public.atlas_sessions (
    user_id,
    title,
    topic,
    subject,
    difficulty,
    duration_minutes,
    started_at
  )
  values (
    p_user_id,
    p_title,
    p_topic,
    p_subject,
    p_difficulty,
    p_duration_minutes,
    now()
  )
  returning id into v_session_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'ATLAS_SESSION', 'atlas_session', v_session_id);
  
  return v_session_id;
end;
$$;

-- Create presentation
create or replace function public.create_presentation(
  p_user_id uuid,
  p_title text,
  p_topic text,
  p_subject text,
  p_slides jsonb,
  p_is_ai_generated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_presentation_id uuid;
  v_slide_count integer;
begin
  v_slide_count := jsonb_array_length(p_slides);
  
  insert into public.presentations (
    user_id,
    title,
    topic,
    subject,
    slides,
    slide_count,
    is_ai_generated
  )
  values (
    p_user_id,
    p_title,
    p_topic,
    p_subject,
    p_slides,
    v_slide_count,
    p_is_ai_generated
  )
  returning id into v_presentation_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'PRESENTATION', 'presentation', v_presentation_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('presentations_created', 1));
  
  return v_presentation_id;
end;
$$;

-- Create research report
create or replace function public.create_research_report(
  p_user_id uuid,
  p_title text,
  p_topic text,
  p_content text,
  p_sources jsonb,
  p_search_query text,
  p_is_ai_generated boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_word_count integer;
  v_source_count integer;
begin
  v_word_count := length(p_content);
  v_source_count := jsonb_array_length(p_sources);
  
  insert into public.research_reports (
    user_id,
    title,
    topic,
    content,
    word_count,
    sources,
    source_count,
    search_query,
    is_ai_generated
  )
  values (
    p_user_id,
    p_title,
    p_topic,
    p_content,
    v_word_count,
    p_sources,
    v_source_count,
    p_search_query,
    p_is_ai_generated
  )
  returning id into v_report_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'RESEARCH', 'research_report', v_report_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('research_reports_created', 1));
  
  return v_report_id;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on flashcard_sets
create trigger update_flashcard_set_updated_at
before update on public.flashcard_sets
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on flashcards
create trigger update_flashcard_updated_at
before update on public.flashcards
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on quiz_sets
create trigger update_quiz_set_updated_at
before update on public.quiz_sets
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on quiz_questions
create trigger update_quiz_question_updated_at
before update on public.quiz_questions
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on practice_tests
create trigger update_practice_test_updated_at
before update on public.practice_tests
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on atlas_sessions
create trigger update_atlas_session_updated_at
before update on public.atlas_sessions
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on atlas_steps
create trigger update_atlas_step_updated_at
before update on public.atlas_steps
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on atlas_progress
create trigger update_atlas_progress_updated_at
before update on public.atlas_progress
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on presentations
create trigger update_presentation_updated_at
before update on public.presentations
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on research_reports
create trigger update_research_report_updated_at
before update on public.research_reports
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on study_guides
create trigger update_study_guide_updated_at
before update on public.study_guides
for each row
execute procedure public.update_profile_timestamp();
