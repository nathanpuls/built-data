-- Create the namespace schema
create schema if not exists built_flexdata;

-- PROJECTS: Top level container
create table if not exists built_flexdata.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  description text,
  -- Simple identification for connecting apps (in real app would be stricter)
  api_key text default gen_random_uuid() 
);

-- COLLECTIONS: Analogous to tables
create table if not exists built_flexdata.collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references built_flexdata.projects(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- FIELDS: The schema definition
create table if not exists built_flexdata.fields (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references built_flexdata.collections(id) on delete cascade not null,
  name text not null, -- The key used in the JSON
  type text not null, -- 'text', 'number', 'boolean', 'date', 'json', 'file'
  label text,
  required boolean default false,
  created_at timestamptz default now()
);

-- ROWS: The actual data storage
create table if not exists built_flexdata.rows (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references built_flexdata.collections(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb, -- dynamic storage
  buyer_uid uuid, -- optional: link to end user 'owner'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table built_flexdata.projects enable row level security;
alter table built_flexdata.collections enable row level security;
alter table built_flexdata.fields enable row level security;
alter table built_flexdata.rows enable row level security;

-- Policies (Permissive for development/prototype phase as requested)
-- Drop existing policies first to be idempotent
drop policy if exists "Allow all access to projects" on built_flexdata.projects;
drop policy if exists "Allow all access to collections" on built_flexdata.collections;
drop policy if exists "Allow all access to fields" on built_flexdata.fields;
drop policy if exists "Allow all access to rows" on built_flexdata.rows;

create policy "Allow all access to projects" on built_flexdata.projects for all using (true) with check (true);
create policy "Allow all access to collections" on built_flexdata.collections for all using (true) with check (true);
create policy "Allow all access to fields" on built_flexdata.fields for all using (true) with check (true);
create policy "Allow all access to rows" on built_flexdata.rows for all using (true) with check (true);
