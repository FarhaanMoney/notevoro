-- Notevoro schema. Run in Supabase → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique, full_name text, display_name text, grade text, curriculum text, avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null, created_at timestamptz default now()
);
create table if not exists public.study_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, grade text, curriculum text,
  notes_md text not null default '',
  flashcards jsonb not null default '[]'::jsonb, quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.atlas_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, grade text, curriculum text,
  lesson jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{"concept_idx":0,"step_idx":0,"answers":{},"completed":false}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, color text default 'violet',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled',
  content_html text not null default '', content_text text not null default '',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, report jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, theme text default 'violet',
  slides jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, event_type text default 'reminder',
  event_date date not null, event_time time,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, cards jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null, difficulty text default 'medium',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, subject text, duration_minutes int not null default 30,
  questions jsonb not null default '[]'::jsonb,
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_chat_owner(p_chat_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.chats where id = p_chat_id and user_id = auth.uid());
$$;

do $$ declare tbl text;
begin
  for tbl in select unnest(array['profiles','chats','messages','study_packs','atlas_sessions','folders','notes','research_reports','presentations','calendar_events','flashcard_sets','quiz_sets','practice_tests']) loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

drop policy if exists "profile_own_all" on public.profiles;
create policy "profile_own_all" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

do $$ declare tbl text;
begin
  for tbl in select unnest(array['chats','study_packs','atlas_sessions','folders','notes','research_reports','presentations','calendar_events','flashcard_sets','quiz_sets','practice_tests']) loop
    execute format('drop policy if exists "own_all" on public.%I', tbl);
    execute format('create policy "own_all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', tbl);
  end loop;
end $$;

drop policy if exists "msg_own_chat_select" on public.messages;
create policy "msg_own_chat_select" on public.messages for select using (public.is_chat_owner(chat_id));
drop policy if exists "msg_own_chat_insert" on public.messages;
create policy "msg_own_chat_insert" on public.messages for insert with check (public.is_chat_owner(chat_id) and auth.uid() = user_id);
drop policy if exists "msg_own_chat_delete" on public.messages;
create policy "msg_own_chat_delete" on public.messages for delete using (public.is_chat_owner(chat_id));

create index if not exists idx_tests_user on public.practice_tests(user_id, created_at desc);
