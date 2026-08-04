-- Migration 007: File Storage System
-- Track file ownership, storage usage, and storage logs

-- =========================
-- FILES
-- =========================
-- Central file registry for all uploaded files
create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- File details
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  mime_type text,
  
  -- Storage details
  bucket text not null default 'notevoro-files',
  storage_path text not null,
  storage_url text,
  
  -- File category
  category text, -- 'avatar', 'attachment', 'export', 'media', 'document', 'other'
  
  -- Entity association
  entity_type text, -- 'note', 'flashcard', 'conversation', 'presentation', etc.
  entity_id uuid,
  
  -- Status
  is_public boolean default false,
  is_deleted boolean default false,
  deleted_at timestamptz,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz,
  
  -- Constraints
  constraint files_size_positive check (file_size > 0),
  constraint files_path_not_empty check (length(trim(storage_path)) > 0)
);

-- =========================
-- STORAGE USAGE
-- =========================
-- Track storage usage per user
create table public.storage_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Usage by category
  total_size_bytes bigint default 0,
  avatar_size_bytes bigint default 0,
  attachment_size_bytes bigint default 0,
  export_size_bytes bigint default 0,
  media_size_bytes bigint default 0,
  document_size_bytes bigint default 0,
  other_size_bytes bigint default 0,
  
  -- File counts
  total_files integer default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint storage_usage_non_negative check (
    total_size_bytes >= 0 and
    avatar_size_bytes >= 0 and
    attachment_size_bytes >= 0 and
    export_size_bytes >= 0 and
    media_size_bytes >= 0 and
    document_size_bytes >= 0 and
    other_size_bytes >= 0 and
    total_files >= 0
  )
);

-- =========================
-- STORAGE LOGS
-- =========================
-- Log all storage operations for audit and analytics
create table public.storage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  
  -- Operation
  operation text not null, -- 'upload', 'download', 'delete', 'move', 'copy', 'rename'
  
  -- Details
  file_name text,
  file_size integer,
  file_type text,
  
  -- Context
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  
  -- Constraints
  constraint storage_logs_operation_valid check (operation in ('upload', 'download', 'delete', 'move', 'copy', 'rename')),
  constraint storage_logs_size_non_negative check (file_size is null or file_size >= 0)
);

-- =========================
-- INDEXES
-- =========================
-- Files
create index idx_files_user_id on public.files(user_id);
create index idx_files_bucket on public.files(bucket);
create index idx_files_category on public.files(category);
create index idx_files_entity on public.files(entity_type, entity_id);
create index idx_files_is_deleted on public.files(is_deleted);
create index idx_files_is_public on public.files(is_public);
create index idx_files_created_at on public.files(created_at);
create index idx_files_last_accessed on public.files(last_accessed_at);
create index idx_files_user_category on public.files(user_id, category);
create index idx_files_user_entity on public.files(user_id, entity_type, entity_id);

-- Storage Usage
create index idx_storage_usage_user_id on public.storage_usage(user_id);
create index idx_storage_usage_updated_at on public.storage_usage(updated_at);

-- Storage Logs
create index idx_storage_logs_user_id on public.storage_logs(user_id);
create index idx_storage_logs_file_id on public.storage_logs(file_id);
create index idx_storage_logs_operation on public.storage_logs(operation);
create index idx_storage_logs_created_at on public.storage_logs(created_at);
create index idx_storage_logs_user_created on public.storage_logs(user_id, created_at desc);

-- =========================
-- FUNCTIONS
-- =========================

-- Register file upload
create or replace function public.register_file(
  p_user_id uuid,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_mime_type text,
  p_storage_path text,
  p_bucket text,
  p_category text,
  p_entity_type text,
  p_entity_id uuid,
  p_is_public boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file_id uuid;
  v_category_size_column text;
begin
  insert into public.files (
    user_id,
    file_name,
    file_type,
    file_size,
    mime_type,
    bucket,
    storage_path,
    category,
    entity_type,
    entity_id,
    is_public
  )
  values (
    p_user_id,
    p_file_name,
    p_file_type,
    p_file_size,
    p_mime_type,
    p_bucket,
    p_storage_path,
    p_category,
    p_entity_type,
    p_entity_id,
    p_is_public
  )
  returning id into v_file_id;
  
  -- Update storage usage
  v_category_size_column := case p_category
    when 'avatar' then 'avatar_size_bytes'
    when 'attachment' then 'attachment_size_bytes'
    when 'export' then 'export_size_bytes'
    when 'media' then 'media_size_bytes'
    when 'document' then 'document_size_bytes'
    else 'other_size_bytes'
  end;
  
  insert into public.storage_usage (user_id)
  values (p_user_id)
  on conflict (user_id) do update set
    total_size_bytes = storage_usage.total_size_bytes + p_file_size,
    avatar_size_bytes = case when p_category = 'avatar' then storage_usage.avatar_size_bytes + p_file_size else storage_usage.avatar_size_bytes end,
    attachment_size_bytes = case when p_category = 'attachment' then storage_usage.attachment_size_bytes + p_file_size else storage_usage.attachment_size_bytes end,
    export_size_bytes = case when p_category = 'export' then storage_usage.export_size_bytes + p_file_size else storage_usage.export_size_bytes end,
    media_size_bytes = case when p_category = 'media' then storage_usage.media_size_bytes + p_file_size else storage_usage.media_size_bytes end,
    document_size_bytes = case when p_category = 'document' then storage_usage.document_size_bytes + p_file_size else storage_usage.document_size_bytes end,
    other_size_bytes = case when p_category = 'other' then storage_usage.other_size_bytes + p_file_size else storage_usage.other_size_bytes end,
    total_files = storage_usage.total_files + 1,
    updated_at = now();
  
  -- Log upload
  insert into public.storage_logs (
    user_id,
    file_id,
    operation,
    file_name,
    file_size,
    file_type,
    metadata
  )
  values (
    p_user_id,
    v_file_id,
    'upload',
    p_file_name,
    p_file_size,
    p_file_type,
    jsonb_build_object('category', p_category, 'entity_type', p_entity_type)
  );
  
  -- Record usage event
  perform public.record_usage_event(p_user_id, 'UPLOAD', 'file', v_file_id,
    jsonb_build_object('size', p_file_size, 'category', p_category));
  
  return v_file_id;
end;
$$;

-- Mark file as deleted (soft delete)
create or replace function public.delete_file(
  p_file_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file public.files;
  v_category_size_column text;
begin
  select * into v_file
  from public.files
  where id = p_file_id
    and user_id = p_user_id;
  
  if not found or v_file.is_deleted then
    return false;
  end if;
  
  -- Soft delete the file
  update public.files
  set
    is_deleted = true,
    deleted_at = now(),
    updated_at = now()
  where id = p_file_id;
  
  -- Update storage usage
  v_category_size_column := case v_file.category
    when 'avatar' then 'avatar_size_bytes'
    when 'attachment' then 'attachment_size_bytes'
    when 'export' then 'export_size_bytes'
    when 'media' then 'media_size_bytes'
    when 'document' then 'document_size_bytes'
    else 'other_size_bytes'
  end;
  
  update public.storage_usage
  set
    total_size_bytes = greatest(total_size_bytes - v_file.file_size, 0),
    avatar_size_bytes = case when v_file.category = 'avatar' then greatest(avatar_size_bytes - v_file.file_size, 0) else avatar_size_bytes end,
    attachment_size_bytes = case when v_file.category = 'attachment' then greatest(attachment_size_bytes - v_file.file_size, 0) else attachment_size_bytes end,
    export_size_bytes = case when v_file.category = 'export' then greatest(export_size_bytes - v_file.file_size, 0) else export_size_bytes end,
    media_size_bytes = case when v_file.category = 'media' then greatest(media_size_bytes - v_file.file_size, 0) else media_size_bytes end,
    document_size_bytes = case when v_file.category = 'document' then greatest(document_size_bytes - v_file.file_size, 0) else document_size_bytes end,
    other_size_bytes = case when v_file.category = 'other' then greatest(other_size_bytes - v_file.file_size, 0) else other_size_bytes end,
    total_files = greatest(total_files - 1, 0),
    updated_at = now()
  where user_id = p_user_id;
  
  -- Log deletion
  insert into public.storage_logs (
    user_id,
    file_id,
    operation,
    file_name,
    file_size,
    file_type
  )
  values (
    p_user_id,
    p_file_id,
    'delete',
    v_file.file_name,
    v_file.file_size,
    v_file.file_type
  );
  
  return true;
end;
$$;

-- Get user storage usage
create or replace function public.get_user_storage_usage(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage jsonb;
  v_subscription jsonb;
  v_limit_mb integer;
  v_used_mb decimal(10,2);
  v_remaining_mb decimal(10,2);
begin
  select row_to_json(su) into v_usage
  from public.storage_usage su
  where user_id = p_user_id;
  
  if v_usage is null then
    v_usage := jsonb_build_object(
      'total_size_bytes', 0,
      'total_files', 0,
      'avatar_size_bytes', 0,
      'attachment_size_bytes', 0,
      'export_size_bytes', 0,
      'media_size_bytes', 0,
      'document_size_bytes', 0,
      'other_size_bytes', 0
    );
  end if;
  
  -- Get storage limit from subscription
  v_subscription := public.get_user_subscription(p_user_id);
  v_limit_mb := (v_subscription->'limits'->>'storage_mb')::int;
  
  -- Calculate used MB
  v_used_mb := (v_usage->>'total_size_bytes')::bigint / 1024.0 / 1024.0;
  
  -- Calculate remaining
  if v_limit_mb = -1 then
    v_remaining_mb := -1; -- Unlimited
  else
    v_remaining_mb := v_limit_mb - v_used_mb;
  end if;
  
  return v_usage || jsonb_build_object(
    'used_mb', v_used_mb,
    'limit_mb', v_limit_mb,
    'remaining_mb', v_remaining_mb,
    'unlimited', v_limit_mb = -1
  );
end;
$$;

-- Log file access
create or replace function public.log_file_access(
  p_file_id uuid,
  p_user_id uuid,
  p_operation text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file public.files;
  v_log_id uuid;
begin
  select * into v_file
  from public.files
  where id = p_file_id;
  
  if v_file is null then
    return null;
  end if;
  
  -- Update last accessed
  update public.files
  set
    last_accessed_at = now()
  where id = p_file_id;
  
  -- Log access
  insert into public.storage_logs (
    user_id,
    file_id,
    operation,
    file_name,
    file_size,
    file_type
  )
  values (
    p_user_id,
    p_file_id,
    p_operation,
    v_file.file_name,
    v_file.file_size,
    v_file.file_type
  )
  returning id into v_log_id;
  
  return v_log_id;
end;
$$;

-- Cleanup permanently deleted files (run by scheduled job)
create or replace function public.cleanup_deleted_files(p_days_to_keep integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  delete from public.files
  where deleted_at is not null
    and deleted_at < now() - (p_days_to_keep || ' days')::interval;

  get diagnostics v_deleted_count = row_count;

  return v_deleted_count;
end;
$$;

-- Recalculate storage usage for user (for data correction)
create or replace function public.recalculate_storage_usage(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.storage_usage (user_id, total_size_bytes, avatar_size_bytes, attachment_size_bytes, export_size_bytes, media_size_bytes, document_size_bytes, other_size_bytes, total_files)
  select
    p_user_id,
    coalesce(sum(case when not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'avatar' and not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'attachment' and not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'export' and not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'media' and not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'document' and not is_deleted then file_size else 0 end), 0),
    coalesce(sum(case when category = 'other' and not is_deleted then file_size else 0 end), 0),
    coalesce(count(case when not is_deleted then 1 end), 0)
  from public.files
  where user_id = p_user_id
  on conflict (user_id) do update set
    total_size_bytes = excluded.total_size_bytes,
    avatar_size_bytes = excluded.avatar_size_bytes,
    attachment_size_bytes = excluded.attachment_size_bytes,
    export_size_bytes = excluded.export_size_bytes,
    media_size_bytes = excluded.media_size_bytes,
    document_size_bytes = excluded.document_size_bytes,
    other_size_bytes = excluded.other_size_bytes,
    total_files = excluded.total_files,
    updated_at = now();
  
  return true;
end;
$$;

-- =========================
-- TRIGGERS
-- =========================

-- Auto-update updated_at on files
create trigger update_file_updated_at
before update on public.files
for each row
execute procedure public.update_profile_timestamp();

-- Auto-update updated_at on storage_usage
create trigger update_storage_usage_updated_at
before update on public.storage_usage
for each row
execute procedure public.update_profile_timestamp();
