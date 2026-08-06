-- Migration 004: AI Workspace
-- Complete AI conversation and workspace system
-- Supports multi-modal AI interactions with proper data relationships

-- =========================
-- CONVERSATIONS
-- =========================
-- AI chat conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Title and metadata
  title text not null default 'New Chat',
  description text,
  
  -- Conversation settings
  model text default 'gpt-4', -- AI model used
  system_prompt text, -- Custom system prompt
  temperature decimal(3,2) default 0.7,
  
  -- Workspace type
  workspace_type text default 'general', -- 'general', 'study', 'research', 'coding', 'creative'
  
  -- Sharing
  is_shared boolean default false,
  shared_at timestamptz,
  
  -- Archival
  is_archived boolean default false,
  archived_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz
);

-- =========================
-- MESSAGES
-- =========================
-- Individual messages in conversations
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Role
  role text not null, -- 'user', 'assistant', 'system'
  
  -- Content
  content text not null,
  content_type text default 'text', -- 'text', 'image', 'code', 'mixed'
  
  -- Token usage
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint messages_role_valid check (role in ('user', 'assistant', 'system')),
  constraint messages_tokens_non_negative check (
    prompt_tokens >= 0 and
    completion_tokens >= 0 and
    total_tokens >= 0
  )
);

-- =========================
-- ATTACHMENTS
-- =========================
-- File attachments to messages
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- File info
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  
  -- Processing status
  processing_status text default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at timestamptz,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint attachments_size_positive check (file_size > 0),
  constraint attachments_status_valid check (processing_status in ('pending', 'processing', 'completed', 'failed'))
);

-- =========================
-- ARTIFACTS
-- =========================
-- Generated content artifacts (code blocks, documents, etc.)
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Artifact type
  artifact_type text not null, -- 'code', 'document', 'image', 'audio', 'video', 'data'
  
  -- Content
  content text not null,
  language text, -- For code artifacts
  title text,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint artifacts_type_valid check (artifact_type in ('code', 'document', 'image', 'audio', 'video', 'data'))
);

-- =========================
-- TOOL CALLS
-- =========================
-- AI tool/function calls
create table public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Tool info
  tool_name text not null,
  tool_id text,
  
  -- Arguments and result
  arguments jsonb,
  result jsonb,
  
  -- Status
  status text not null default 'pending', -- 'pending', 'running', 'completed', 'failed'
  error_message text,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint tool_calls_status_valid check (status in ('pending', 'running', 'completed', 'failed')),
  constraint tool_calls_duration_non_negative check (duration_ms is null or duration_ms >= 0)
);

-- =========================
-- SOURCES
-- =========================
-- Source references (documents, websites, etc.)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Source type
  source_type text not null, -- 'document', 'website', 'database', 'api', 'note', 'file'
  
  -- Source details
  title text,
  url text,
  author text,
  publication_date date,
  
  -- Content
  excerpt text,
  page_numbers text,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint sources_type_valid check (source_type in ('document', 'website', 'database', 'api', 'note', 'file'))
);

-- =========================
-- CITATIONS
-- =========================
-- Specific citations from sources
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Citation text
  text text not null,
  
  -- Position in source
  start_position integer,
  end_position integer,
  
  -- Confidence
  confidence float default 1.0,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint citations_confidence_valid check (confidence >= 0 and confidence <= 1),
  constraint citations_position_valid check (
    start_position is null or
    end_position is null or
    end_position >= start_position
  )
);

-- =========================
-- MEMORIES
-- =========================
-- Long-term conversation memories
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  
  -- Memory type
  memory_type text not null, -- 'preference', 'fact', 'context', 'instruction'
  
  -- Content
  content text not null,
  key text, -- For quick lookup
  
  -- Importance
  importance integer default 5, -- 1-10 scale
  access_count integer default 0,
  
  -- Expiration
  expires_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz,
  
  -- Constraints
  constraint memories_type_valid check (memory_type in ('preference', 'fact', 'context', 'instruction')),
  constraint memories_importance_valid check (importance >= 1 and importance <= 10),
  constraint memories_access_non_negative check (access_count >= 0)
);

-- =========================
-- GENERATED IMAGES
-- =========================
-- AI-generated images
create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Image details
  prompt text not null,
  negative_prompt text,
  model text,
  style text,
  
  -- Storage
  storage_path text not null,
  thumbnail_path text,
  
  -- Dimensions
  width integer,
  height integer,
  
  -- Generation parameters
  seed integer,
  steps integer,
  guidance_scale float,
  
  -- Status
  status text not null default 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message text,
  
  -- Timestamps
  created_at timestamptz default now(),
  generated_at timestamptz,
  
  -- Constraints
  constraint images_status_valid check (status in ('pending', 'generating', 'completed', 'failed')),
  constraint images_dimensions_positive check (width is null or height is null or (width > 0 and height > 0)),
  constraint images_guidance_valid check (guidance_scale is null or guidance_scale >= 0)
);

-- =========================
-- WEB RESULTS
-- =========================
-- Web search results
create table public.web_results (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Search details
  query text not null,
  search_engine text default 'google',
  
  -- Result details
  title text not null,
  url text not null,
  snippet text,
  
  -- Ranking
  rank integer,
  score float,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint web_results_rank_positive check (rank is null or rank > 0)
);

-- =========================
-- YOUTUBE RESULTS
-- =========================
-- YouTube search/transcript results
create table public.youtube_results (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Video details
  video_id text not null,
  title text not null,
  channel_title text,
  channel_id text,
  description text,
  
  -- Duration
  duration_seconds integer,
  published_at timestamptz,
  
  -- Thumbnails
  thumbnail_default text,
  thumbnail_medium text,
  thumbnail_high text,
  
  -- Transcript
  transcript_text text,
  transcript_timestamps jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint youtube_duration_positive check (duration_seconds is null or duration_seconds > 0)
);

-- =========================
-- INDEXES
-- =========================
-- Conversations
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_conversations_workspace_type on public.conversations(workspace_type);
create index idx_conversations_is_archived on public.conversations(is_archived);
create index idx_conversations_is_shared on public.conversations(is_shared);
create index idx_conversations_created_at on public.conversations(created_at);
create index idx_conversations_updated_at on public.conversations(updated_at);
create index idx_conversations_last_message on public.conversations(last_message_at);
create index idx_conversations_user_updated on public.conversations(user_id, updated_at desc);

-- Messages
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_user_id on public.messages(user_id);
create index idx_messages_role on public.messages(role);
create index idx_messages_created_at on public.messages(created_at);
create index idx_messages_conversation_created on public.messages(conversation_id, created_at);

-- Attachments
create index idx_attachments_message_id on public.attachments(message_id);
create index idx_attachments_user_id on public.attachments(user_id);
create index idx_attachments_status on public.attachments(processing_status);
create index idx_attachments_created_at on public.attachments(created_at);

-- Artifacts
create index idx_artifacts_message_id on public.artifacts(message_id);
create index idx_artifacts_user_id on public.artifacts(user_id);
create index idx_artifacts_type on public.artifacts(artifact_type);
create index idx_artifacts_language on public.artifacts(language);
create index idx_artifacts_created_at on public.artifacts(created_at);

-- Tool Calls
create index idx_tool_calls_message_id on public.tool_calls(message_id);
create index idx_tool_calls_user_id on public.tool_calls(user_id);
create index idx_tool_calls_tool_name on public.tool_calls(tool_name);
create index idx_tool_calls_status on public.tool_calls(status);
create index idx_tool_calls_created_at on public.tool_calls(created_at);

-- Sources
create index idx_sources_message_id on public.sources(message_id);
create index idx_sources_user_id on public.sources(user_id);
create index idx_sources_type on public.sources(source_type);
create index idx_sources_url on public.sources(url);
create index idx_sources_created_at on public.sources(created_at);

-- Citations
create index idx_citations_message_id on public.citations(message_id);
create index idx_citations_source_id on public.citations(source_id);
create index idx_citations_user_id on public.citations(user_id);
create index idx_citations_created_at on public.citations(created_at);

-- Memories
create index idx_memories_user_id on public.memories(user_id);
create index idx_memories_conversation_id on public.memories(conversation_id);
create index idx_memories_type on public.memories(memory_type);
create index idx_memories_key on public.memories(key);
create index idx_memories_importance on public.memories(importance);
create index idx_memories_expires_at on public.memories(expires_at);
create index idx_memories_user_type on public.memories(user_id, memory_type);

-- Generated Images
create index idx_generated_images_message_id on public.generated_images(message_id);
create index idx_generated_images_user_id on public.generated_images(user_id);
create index idx_generated_images_status on public.generated_images(status);
create index idx_generated_images_created_at on public.generated_images(created_at);

-- Web Results
create index idx_web_results_message_id on public.web_results(message_id);
create index idx_web_results_user_id on public.web_results(user_id);
create index idx_web_results_query on public.web_results(query);
create index idx_web_results_url on public.web_results(url);
create index idx_web_results_created_at on public.web_results(created_at);

-- YouTube Results
create index idx_youtube_results_message_id on public.youtube_results(message_id);
create index idx_youtube_results_user_id on public.youtube_results(user_id);
create index idx_youtube_results_video_id on public.youtube_results(video_id);
create index idx_youtube_results_channel_id on public.youtube_results(channel_id);
create index idx_youtube_results_created_at on public.youtube_results(created_at);

-- =========================
-- FUNCTIONS
-- =========================

-- Create conversation
create or replace function public.create_conversation(
  p_user_id uuid,
  p_title text,
  p_workspace_type text,
  p_model text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  insert into public.conversations (
    user_id,
    title,
    workspace_type,
    model
  )
  values (
    p_user_id,
    p_title,
    p_workspace_type,
    p_model
  )
  returning id into v_conversation_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'AI_CHAT', 'conversation', v_conversation_id);
  
  return v_conversation_id;
end;
$$;

-- Add message to conversation
create or replace function public.add_message(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text,
  p_content text,
  p_content_type text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_total_tokens integer;
begin
  v_total_tokens := p_prompt_tokens + p_completion_tokens;

  insert into public.messages (
    conversation_id,
    user_id,
    role,
    content,
    content_type,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    metadata
  )
  values (
    p_conversation_id,
    p_user_id,
    p_role,
    p_content,
    p_content_type,
    p_prompt_tokens,
    p_completion_tokens,
    v_total_tokens,
    p_metadata
  )
  returning id into v_message_id;
  
  -- Update conversation last_message_at
  update public.conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = p_conversation_id;
  
  -- Record usage event for AI messages
  if p_role = 'assistant' then
    perform public.record_usage_event(p_user_id, 'AI_MESSAGE', 'message', v_message_id, 
      jsonb_build_object('tokens', v_total_tokens));
  end if;
  
  return v_message_id;
end;
$$;

-- Store memory
create or replace function public.store_memory(
  p_user_id uuid,
  p_conversation_id uuid,
  p_memory_type text,
  p_content text,
  p_key text,
  p_importance integer,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_memory_id uuid;
begin
  insert into public.memories (
    user_id,
    conversation_id,
    memory_type,
    content,
    key,
    importance,
    expires_at
  )
  values (
    p_user_id,
    p_conversation_id,
    p_memory_type,
    p_content,
    p_key,
    p_importance,
    p_expires_at
  )
  returning id into v_memory_id;
  
  return v_memory_id;
end;
$$;

-- Get user memories
create or replace function public.get_user_memories(
  p_user_id uuid,
  p_limit integer,
  p_memory_type text
)
returns table (
  id uuid,
  memory_type text,
  content text,
  key text,
  importance integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    m.id,
    m.memory_type,
    m.content,
    m.key,
    m.importance,
    m.created_at
  from public.memories m
  where m.user_id = p_user_id
    and (p_memory_type is null or m.memory_type = p_memory_type)
    and (m.expires_at is null or m.expires_at > now())
  order by m.importance desc, m.created_at desc
  limit p_limit;
end;
$$;

-- Archive conversation
create or replace function public.archive_conversation(p_conversation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    is_archived = true,
    archived_at = now(),
    updated_at = now()
  where id = p_conversation_id
    and user_id = p_user_id;
  
  return found;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on conversations
create trigger update_conversation_updated_at
before update on public.conversations
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on messages
create trigger update_message_updated_at
before update on public.messages
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on memories
create trigger update_memory_updated_at
before update on public.memories
for each row
execute procedure public.update_timestamp();

-- Update memory access count on read
create or replace function public.update_memory_access()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.access_count := old.access_count + 1;
  new.last_accessed_at := now();
  return new;
end;
$$;

-- Note: This trigger would be applied when implementing memory access tracking
