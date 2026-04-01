-- =============================================
-- FlowLens Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New query)
-- =============================================

-- 1. Profiles (auto-created on Google sign-in)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  figma_token_encrypted text,  -- stored encrypted, never exposed to client
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Projects
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  figma_file_key text,
  figma_file_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;
create policy "Users can CRUD own projects" on public.projects for all using (auth.uid() = owner_id);

-- 3. Screens
create table if not exists public.screens (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  category text default 'Uncategorized',
  subcategory text,
  figma_node_id text,
  image_url text,                -- Figma temporary URL
  cached_image_path text,        -- Supabase Storage path (permanent)
  image_width int default 0,
  image_height int default 0,
  "order" int default 0,
  is_start_screen boolean default false,
  created_at timestamptz default now()
);

alter table public.screens enable row level security;
create policy "Users can manage screens via project" on public.screens for all
  using (exists (select 1 from public.projects where projects.id = screens.project_id and projects.owner_id = auth.uid()));

-- 4. Hotspots
create table if not exists public.hotspots (
  id uuid default gen_random_uuid() primary key,
  screen_id uuid references public.screens(id) on delete cascade not null,
  figma_node_id text,
  label text not null,
  element_type text not null,
  raw_name text not null,
  bounds_x float default 0,
  bounds_y float default 0,
  bounds_w float default 0,
  bounds_h float default 0,
  created_at timestamptz default now()
);

alter table public.hotspots enable row level security;
create policy "Users can manage hotspots via screen" on public.hotspots for all
  using (exists (
    select 1 from public.screens
    join public.projects on projects.id = screens.project_id
    where screens.id = hotspots.screen_id and projects.owner_id = auth.uid()
  ));

-- 5. Connections
create table if not exists public.connections (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  source_hotspot_id uuid references public.hotspots(id) on delete cascade not null,
  source_screen_id uuid references public.screens(id) on delete cascade not null,
  target_screen_id uuid references public.screens(id) on delete set null,
  target_url text,
  action text default 'navigate',
  transition text default 'push',
  created_at timestamptz default now()
);

alter table public.connections enable row level security;
create policy "Users can manage connections via project" on public.connections for all
  using (exists (select 1 from public.projects where projects.id = connections.project_id and projects.owner_id = auth.uid()));

-- 6. Share links
create table if not exists public.share_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz default now(),
  revoked_at timestamptz
);

alter table public.share_links enable row level security;
create policy "Owners can manage share links" on public.share_links for all
  using (exists (select 1 from public.projects where projects.id = share_links.project_id and projects.owner_id = auth.uid()));
-- Public read for valid tokens (used by share page)
create policy "Anyone can read active share links" on public.share_links for select
  using (revoked_at is null);

-- 7. Storage bucket for cached screenshots
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload screenshots"
  on storage.objects for insert
  with check (bucket_id = 'screenshots' and auth.role() = 'authenticated');

create policy "Anyone can view screenshots"
  on storage.objects for select
  using (bucket_id = 'screenshots');

-- 8. Indexes
create index if not exists idx_screens_project on public.screens(project_id);
create index if not exists idx_hotspots_screen on public.hotspots(screen_id);
create index if not exists idx_connections_project on public.connections(project_id);
create index if not exists idx_share_links_token on public.share_links(token);
