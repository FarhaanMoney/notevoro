-- Workspaces migration for Notevoro
-- Creates workspace tables and relationships

-- Workspaces table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  color text default '#000000',
  icon text default 'folder',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspaces_user_id on public.workspaces(user_id);
create index if not exists idx_workspaces_is_archived on public.workspaces(is_archived);

-- Workspace notes relationship
create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(workspace_id, note_id)
);

create index if not exists idx_workspace_notes_workspace_id on public.workspace_notes(workspace_id);
create index if not exists idx_workspace_notes_note_id on public.workspace_notes(note_id);

-- Workspace flashcards relationship
create table if not exists public.workspace_flashcards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  flashcard_id uuid not null references public.flashcard_decks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(workspace_id, flashcard_id)
);

create index if not exists idx_workspace_flashcards_workspace_id on public.workspace_flashcards(workspace_id);
create index if not exists idx_workspace_flashcards_flashcard_id on public.workspace_flashcards(flashcard_id);

-- Workspace quizzes relationship
create table if not exists public.workspace_quizzes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(workspace_id, quiz_id)
);

create index if not exists idx_workspace_quizzes_workspace_id on public.workspace_quizzes(workspace_id);
create index if not exists idx_workspace_quizzes_quiz_id on public.workspace_quizzes(quiz_id);

-- Workspace files
create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  file_type text not null,
  file_size integer,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_files_workspace_id on public.workspace_files(workspace_id);
create index if not exists idx_workspace_files_user_id on public.workspace_files(user_id);

-- Add updated_at trigger to workspaces
drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

-- Enable RLS for workspace tables
alter table public.workspaces enable row level security;
alter table public.workspace_notes enable row level security;
alter table public.workspace_flashcards enable row level security;
alter table public.workspace_quizzes enable row level security;
alter table public.workspace_files enable row level security;

-- RLS policies for workspaces
drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own" on public.workspaces for select using (auth.uid() = user_id);
drop policy if exists "workspaces_insert_own" on public.workspaces;
create policy "workspaces_insert_own" on public.workspaces for insert with check (auth.uid() = user_id);
drop policy if exists "workspaces_update_own" on public.workspaces;
create policy "workspaces_update_own" on public.workspaces for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "workspaces_delete_own" on public.workspaces;
create policy "workspaces_delete_own" on public.workspaces for delete using (auth.uid() = user_id);

-- RLS policies for workspace relationships (cascaded through workspace ownership)
drop policy if exists "workspace_notes_cascaded" on public.workspace_notes;
create policy "workspace_notes_cascaded" on public.workspace_notes for all using (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
) with check (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
);

drop policy if exists "workspace_flashcards_cascaded" on public.workspace_flashcards;
create policy "workspace_flashcards_cascaded" on public.workspace_flashcards for all using (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
) with check (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
);

drop policy if exists "workspace_quizzes_cascaded" on public.workspace_quizzes;
create policy "workspace_quizzes_cascaded" on public.workspace_quizzes for all using (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
) with check (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
);

drop policy if exists "workspace_files_cascaded" on public.workspace_files;
create policy "workspace_files_cascaded" on public.workspace_files for all using (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
) with check (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
);
