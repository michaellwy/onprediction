-- Usage tracking for "Ask the Library" AI Q&A
create table ask_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  ip_address text not null,
  question text not null,
  created_at timestamptz not null default now(),
  token_count integer
);

create index idx_ask_usage_user on ask_usage(user_id, created_at);
create index idx_ask_usage_ip on ask_usage(ip_address, created_at);

alter table ask_usage enable row level security;

create policy "Anyone can insert usage" on ask_usage
  for insert with check (true);

create policy "Users can read own usage" on ask_usage
  for select using (auth.uid() = user_id);
