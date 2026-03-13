-- User profiles for display name customization
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) >= 1 and char_length(display_name) <= 50),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table user_profiles enable row level security;

create policy "Public read access" on user_profiles
  for select using (true);

create policy "Users can insert own profile" on user_profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);
