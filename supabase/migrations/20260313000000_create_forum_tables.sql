-- Forum posts
create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) >= 5 and char_length(title) <= 150),
  body text not null check (char_length(body) >= 100 and char_length(body) <= 20000),
  author_name text not null,
  author_avatar_url text,
  created_at timestamptz not null default now()
);

create index idx_forum_posts_created_at on forum_posts(created_at desc);

-- Forum comments
create table forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 5000),
  author_name text not null,
  author_avatar_url text,
  created_at timestamptz not null default now()
);

create index idx_forum_comments_post_id on forum_comments(post_id);

-- Forum post upvotes
create table forum_post_upvotes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references forum_posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create index idx_forum_post_upvotes_post_id on forum_post_upvotes(post_id);

-- Forum comment upvotes
create table forum_comment_upvotes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references forum_comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

create index idx_forum_comment_upvotes_comment_id on forum_comment_upvotes(comment_id);

-- Forum post bookmarks
create table forum_post_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references forum_posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- RPC: get forum post upvote counts
create or replace function get_forum_post_upvote_counts()
returns table(post_id uuid, count bigint)
language sql stable
as $$
  select post_id, count(*) as count
  from forum_post_upvotes
  group by post_id;
$$;

-- RPC: get forum comment upvote counts for a specific post
create or replace function get_forum_comment_upvote_counts(target_post_id uuid)
returns table(comment_id uuid, count bigint)
language sql stable
as $$
  select fcu.comment_id, count(*) as count
  from forum_comment_upvotes fcu
  join forum_comments fc on fc.id = fcu.comment_id
  where fc.post_id = target_post_id
  group by fcu.comment_id;
$$;

-- RLS policies

-- forum_posts
alter table forum_posts enable row level security;

create policy "Public read access" on forum_posts
  for select using (true);

create policy "Users can insert own posts" on forum_posts
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own posts" on forum_posts
  for delete using (auth.uid() = user_id);

-- forum_comments
alter table forum_comments enable row level security;

create policy "Public read access" on forum_comments
  for select using (true);

create policy "Users can insert own comments" on forum_comments
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments" on forum_comments
  for delete using (auth.uid() = user_id);

-- forum_post_upvotes
alter table forum_post_upvotes enable row level security;

create policy "Public read access" on forum_post_upvotes
  for select using (true);

create policy "Users can insert own upvotes" on forum_post_upvotes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own upvotes" on forum_post_upvotes
  for delete using (auth.uid() = user_id);

-- forum_comment_upvotes
alter table forum_comment_upvotes enable row level security;

create policy "Public read access" on forum_comment_upvotes
  for select using (true);

create policy "Users can insert own upvotes" on forum_comment_upvotes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own upvotes" on forum_comment_upvotes
  for delete using (auth.uid() = user_id);

-- forum_post_bookmarks (user's own only)
alter table forum_post_bookmarks enable row level security;

create policy "Users can read own bookmarks" on forum_post_bookmarks
  for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks" on forum_post_bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks" on forum_post_bookmarks
  for delete using (auth.uid() = user_id);
