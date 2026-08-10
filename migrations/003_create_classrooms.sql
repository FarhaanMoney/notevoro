-- Minimal migration: create classrooms and classroom_memberships tables

create extension if not exists pgcrypto;

create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  educator_id uuid references auth.users(id) on delete cascade,
  name text not null,
  subject text,
  grade text,
  description text,
  classroom_code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists classroom_memberships (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  status text
);

-- Enable RLS
alter table classrooms enable row level security;
alter table classroom_memberships enable row level security;

-- Policies for classrooms
-- Educator (owner) can select/insert/update/delete their own classrooms
create policy classrooms_owner_all on classrooms
  for all
  using (auth.uid() = educator_id)
  with check (auth.uid() = educator_id);

-- Students can select classrooms they are members of
create policy classrooms_select_members on classrooms
  for select
  using (exists(select 1 from classroom_memberships cm where cm.classroom_id = classrooms.id and cm.student_id = auth.uid()));

-- Policies for classroom_memberships
-- Allow students to insert a membership for themselves
create policy memberships_insert_self on classroom_memberships
  for insert
  with check (student_id = auth.uid());

-- Allow educators to select memberships for their classrooms
create policy memberships_educator_select on classroom_memberships
  for select
  using (exists(select 1 from classrooms c where c.id = classroom_memberships.classroom_id and c.educator_id = auth.uid()));

-- Allow students to select their own memberships
create policy memberships_select_self on classroom_memberships
  for select
  using (student_id = auth.uid());

-- Prevent public access by default (RLS is enabled)

-- Index classroom_code for fast lookups
create index if not exists idx_classrooms_code on classrooms(lower(classroom_code));

-- Trigger to update updated_at
create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp
  before update on classrooms
  for each row execute procedure trigger_set_timestamp();

-- End migration
