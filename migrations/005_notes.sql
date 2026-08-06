-- Migration 005: Notes System
-- Google Docs-style notes with version history, folders, and attachments

-- =========================
-- FOLDERS
-- =========================
-- Note organization folders
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  
  -- Folder details
  name text not null,
  description text,
  color text default 'gray',
  icon text,
  
  -- Ordering
  sort_order integer default 0,
  
  -- Sharing
  is_shared boolean default false,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint folders_name_not_empty check (length(trim(name)) > 0),
  constraint folders_sort_order_non_negative check (sort_order >= 0)
);

-- =========================
-- NOTES
-- =========================
-- Rich text notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  
  -- Note details
  title text not null,
  content_html text, -- HTML content
  content_text text, -- Plain text content
  content_type text default 'html', -- 'html', 'markdown', 'json'
  
  -- Metadata
  tags jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  
  -- AI-generated
  is_ai_generated boolean default false,
  ai_model text,
  ai_prompt text,
  
  -- Status
  is_pinned boolean default false,
  is_archived boolean default false,
  is_trashed boolean default false,
  
  -- Sharing
  is_shared boolean default false,
  shared_at timestamptz,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_edited_at timestamptz,
  archived_at timestamptz,
  trashed_at timestamptz,
  
  -- Constraints
  constraint notes_title_not_empty check (length(trim(title)) > 0),
  constraint notes_content_type_valid check (content_type in ('html', 'markdown', 'json'))
);

-- =========================
-- NOTE VERSIONS
-- =========================
-- Version history for notes
create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Version details
  version_number integer not null,
  content_html text,
  content_text text,
  content_type text not null,

  -- Change summary
  change_summary text,
  change_type text default 'edit', -- 'create', 'edit', 'ai_edit', 'restore',

  -- Metadata
  metadata jsonb default '{}'::jsonb,

  -- Size
  content_size integer,

  -- Timestamps
  created_at timestamptz default now(),

  -- Constraints
  constraint note_versions_number_positive check (version_number > 0),
  constraint note_versions_type_valid check (change_type in ('create', 'edit', 'ai_edit', 'restore')),
  constraint note_versions_size_non_negative check (content_size is null or content_size >= 0)
);

-- =========================
-- NOTE TAGS
-- =========================
-- Tag system for notes
create table public.note_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Tag details
  name text not null,
  color text default 'blue',
  
  -- Usage count
  usage_count integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint note_tags_name_unique unique (user_id, name),
  constraint note_tags_name_not_empty check (length(trim(name)) > 0),
  constraint note_tags_usage_non_negative check (usage_count >= 0)
);

-- =========================
-- NOTE TAG RELATIONS
-- =========================
-- Many-to-many relationship between notes and tags
create table public.note_tag_relations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.note_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint note_tag_relations_unique unique (note_id, tag_id)
);

-- =========================
-- NOTE FILES
-- =========================
-- File attachments to notes
create table public.note_files (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- File details
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  
  -- Preview
  preview_path text,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint note_files_size_positive check (file_size > 0)
);

-- =========================
-- INDEXES
-- =========================
-- Folders
create index idx_folders_user_id on public.folders(user_id);
create index idx_folders_parent_folder_id on public.folders(parent_folder_id);
create index idx_folders_sort_order on public.folders(sort_order);
create index idx_folders_user_parent on public.folders(user_id, parent_folder_id);

-- Notes
create index idx_notes_user_id on public.notes(user_id);
create index idx_notes_folder_id on public.notes(folder_id);
create index idx_notes_title on public.notes(title);
create index idx_notes_is_pinned on public.notes(is_pinned);
create index idx_notes_is_archived on public.notes(is_archived);
create index idx_notes_is_trashed on public.notes(is_trashed);
create index idx_notes_is_shared on public.notes(is_shared);
create index idx_notes_is_ai_generated on public.notes(is_ai_generated);
create index idx_notes_created_at on public.notes(created_at);
create index idx_notes_updated_at on public.notes(updated_at);
create index idx_notes_last_edited on public.notes(last_edited_at);
create index idx_notes_user_folder on public.notes(user_id, folder_id);
create index idx_notes_user_updated on public.notes(user_id, updated_at desc);

-- Note Versions
create index idx_note_versions_note_id on public.note_versions(note_id);
create index idx_note_versions_user_id on public.note_versions(user_id);
create index idx_note_versions_version_number on public.note_versions(version_number);
create index idx_note_versions_created_at on public.note_versions(created_at);
create index idx_note_versions_note_version on public.note_versions(note_id, version_number);

-- Note Tags
create index idx_note_tags_user_id on public.note_tags(user_id);
create index idx_note_tags_name on public.note_tags(name);
create index idx_note_tags_usage_count on public.note_tags(usage_count);

-- Note Tag Relations
create index idx_note_tag_relations_note_id on public.note_tag_relations(note_id);
create index idx_note_tag_relations_tag_id on public.note_tag_relations(tag_id);
create index idx_note_tag_relations_user_id on public.note_tag_relations(user_id);

-- Note Files
create index idx_note_files_note_id on public.note_files(note_id);
create index idx_note_files_user_id on public.note_files(user_id);
create index idx_note_files_file_type on public.note_files(file_type);
create index idx_note_files_created_at on public.note_files(created_at);

-- =========================
-- FUNCTIONS
-- =========================

-- Create folder
create or replace function public.create_folder(
  p_user_id uuid,
  p_name text,
  p_parent_folder_id uuid,
  p_color text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folder_id uuid;
  v_max_sort_order integer;
begin
  -- Get max sort order for parent folder
  select coalesce(max(sort_order), 0) into v_max_sort_order
  from public.folders
  where user_id = p_user_id
    and parent_folder_id = p_parent_folder_id;
  
  insert into public.folders (
    user_id,
    parent_folder_id,
    name,
    color,
    description,
    sort_order
  )
  values (
    p_user_id,
    p_parent_folder_id,
    p_name,
    p_color,
    p_description,
    v_max_sort_order + 1
  )
  returning id into v_folder_id;
  
  return v_folder_id;
end;
$$;

-- Create note
create or replace function public.create_note(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_content_type text,
  p_folder_id uuid,
  p_tags jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
begin
  insert into public.notes (
    user_id,
    title,
    content,
    content_type,
    folder_id,
    tags,
    last_edited_at
  )
  values (
    p_user_id,
    p_title,
    p_content,
    p_content_type,
    p_folder_id,
    p_tags,
    now()
  )
  returning id into v_note_id;
  
  -- Create initial version
  insert into public.note_versions (
    note_id,
    user_id,
    version_number,
    content,
    content_type,
    change_type,
    content_size,
    change_summary
  )
  values (
    v_note_id,
    p_user_id,
    1,
    p_content,
    p_content_type,
    'create',
    length(p_content),
    'Initial version'
  );
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'NOTE_CREATE', 'note', v_note_id);
  
  -- Update user stats
  perform public.update_user_stats(p_user_id, jsonb_build_object('notes_created', 1));
  
  return v_note_id;
end;
$$;

-- Update note
create or replace function public.update_note(
  p_note_id uuid,
  p_user_id uuid,
  p_title text,
  p_content text,
  p_tags jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version integer;
  v_old_content text;
  v_old_content_type text;
  v_content_size integer;
begin
  -- Get current version and content
  select
    (select coalesce(max(version_number), 0) from public.note_versions where note_id = p_note_id),
    content,
    content_type
  into v_current_version, v_old_content, v_old_content_type
  from public.notes
  where id = p_note_id
    and user_id = p_user_id;

  if not found then
    return null;
  end if;

  -- Update note
  update public.notes
  set
    title = coalesce(p_title, title),
    content = coalesce(p_content, content),
    tags = coalesce(p_tags, tags),
    updated_at = now(),
    last_edited_at = now()
  where id = p_note_id
    and user_id = p_user_id;

  -- Create new version if content changed
  if p_content is not null and p_content != v_old_content then
    v_content_size := length(p_content);

    insert into public.note_versions (
      note_id,
      user_id,
      version_number,
      content,
      content_type,
      change_type,
      content_size,
      change_summary
    )
    values (
      p_note_id,
      p_user_id,
      v_current_version + 1,
      p_content,
      v_old_content_type,
      'edit',
      v_content_size,
      'Content updated'
    );
  end if;

  -- Record usage event
  perform public.record_usage_event(p_user_id, 'NOTE_EDIT', 'note', p_note_id);

  return p_note_id;
end;
$$;

-- Create tag
create or replace function public.create_tag(
  p_user_id uuid,
  p_name text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag_id uuid;
begin
  insert into public.note_tags (
    user_id,
    name,
    color
  )
  values (
    p_user_id,
    p_name,
    p_color
  )
  on conflict (user_id, name) do update set
    color = excluded.color,
    updated_at = now()
  returning id into v_tag_id;
  
  return v_tag_id;
end;
$$;

-- Add tag to note
create or replace function public.add_tag_to_note(
  p_note_id uuid,
  p_tag_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.note_tag_relations (
    note_id,
    tag_id,
    user_id
  )
  values (
    p_note_id,
    p_tag_id,
    p_user_id
  )
  on conflict (note_id, tag_id) do nothing;
  
  -- Update tag usage count
  update public.note_tags
  set
    usage_count = usage_count + 1,
    updated_at = now()
  where id = p_tag_id;
  
  return true;
end;
$$;

-- Remove tag from note
create or replace function public.remove_tag_from_note(
  p_note_id uuid,
  p_tag_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.note_tag_relations
  where note_id = p_note_id
    and tag_id = p_tag_id
    and user_id = p_user_id;
  
  -- Update tag usage count
  update public.note_tags
  set
    usage_count = greatest(usage_count - 1, 0),
    updated_at = now()
  where id = p_tag_id;
  
  return true;
end;
$$;

-- Add file to note
create or replace function public.add_file_to_note(
  p_note_id uuid,
  p_user_id uuid,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_storage_path text,
  p_preview_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file_id uuid;
begin
  insert into public.note_files (
    note_id,
    user_id,
    file_name,
    file_type,
    file_size,
    storage_path,
    preview_path
  )
  values (
    p_note_id,
    p_user_id,
    p_file_name,
    p_file_type,
    p_file_size,
    p_storage_path,
    p_preview_path
  )
  returning id into v_file_id;
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'UPLOAD', 'note_file', v_file_id,
    jsonb_build_object('size', p_file_size));
  
  return v_file_id;
end;
$$;

-- Restore note version
create or replace function public.restore_note_version(
  p_note_id uuid,
  p_version_number integer,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_content text;
  v_version_content_type text;
  v_current_version integer;
  v_content_size integer;
begin
  -- Get version content
  select content, content_type into v_version_content, v_version_content_type
  from public.note_versions
  where note_id = p_note_id
    and version_number = p_version_number;
  
  if not found then
    return false;
  end if;
  
  -- Get current version number
  select coalesce(max(version_number), 0) into v_current_version
  from public.note_versions
  where note_id = p_note_id;
  
  -- Update note content
  update public.notes
  set
    content = v_version_content,
    updated_at = now(),
    last_edited_at = now()
  where id = p_note_id
    and user_id = p_user_id;
  
  -- Create new version
  v_content_size := length(v_version_content);
  
  insert into public.note_versions (
    note_id,
    user_id,
    version_number,
    content,
    content_type,
    change_type,
    content_size,
    change_summary
  )
  values (
    p_note_id,
    p_user_id,
    v_current_version + 1,
    v_version_content,
    v_version_content_type,
    'restore',
    v_content_size,
    'Restored from version ' || p_version_number
  );
  
  return true;
end;
$$;

-- Archive note
create or replace function public.archive_note(p_note_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notes
  set
    is_archived = true,
    archived_at = now(),
    updated_at = now()
  where id = p_note_id
    and user_id = p_user_id;
  
  return found;
end;
$$;

-- Trash note
create or replace function public.trash_note(p_note_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notes
  set
    is_trashed = true,
    trashed_at = now(),
    updated_at = now()
  where id = p_note_id
    and user_id = p_user_id;
  
  return found;
end;
$$;

-- Permanently delete note
create or replace function public.delete_note_permanently(p_note_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notes
  where id = p_note_id
    and user_id = p_user_id
    and is_trashed = true;
  
  return found;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on folders
create trigger update_folder_updated_at
before update on public.folders
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on notes
create trigger update_note_updated_at
before update on public.notes
for each row
execute procedure public.update_timestamp();

-- Auto-update updated_at on note_tags
create trigger update_note_tag_updated_at
before update on public.note_tags
for each row
execute procedure public.update_timestamp();
