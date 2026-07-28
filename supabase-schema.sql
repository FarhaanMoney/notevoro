-- Notevoro Phase 1 schema. Run this in Supabase → SQL Editor.
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  grade text,
  curriculum text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- Study Packs (Notes + Flashcards + Quiz per topic)
create table if not exists public.study_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  grade text,
  curriculum text,
  notes_md text not null default '',
  flashcards jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper
create or replace function public.is_chat_owner(p_chat_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.chats where id = p_chat_id and user_id = auth.uid());
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.study_packs enable row level security;

drop policy if exists "profile_own_all" on public.profiles;
create policy "profile_own_all" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "chat_own_all" on public.chats;
create policy "chat_own_all" on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "msg_own_chat_select" on public.messages;
create policy "msg_own_chat_select" on public.messages for select using (public.is_chat_owner(chat_id));
drop policy if exists "msg_own_chat_insert" on public.messages;
create policy "msg_own_chat_insert" on public.messages for insert with check (public.is_chat_owner(chat_id) and auth.uid() = user_id);
drop policy if exists "msg_own_chat_delete" on public.messages;
create policy "msg_own_chat_delete" on public.messages for delete using (public.is_chat_owner(chat_id));

drop policy if exists "sp_own_all" on public.study_packs;
create policy "sp_own_all" on public.study_packs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_chats_user on public.chats(user_id, updated_at desc);
create index if not exists idx_messages_chat on public.messages(chat_id, created_at asc);
create index if not exists idx_sp_user on public.study_packs(user_id, updated_at desc);
