-- Article expansion view tracking
-- Tracks unique (article, viewer, date) tuples to measure daily unique engagement

create table article_views (
  id uuid primary key default gen_random_uuid(),
  article_id integer not null,
  viewer_id text not null,
  view_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- One view per viewer per article per day
create unique index idx_article_views_unique
  on article_views(article_id, viewer_id, view_date);

-- Fast count aggregation
create index idx_article_views_article_id
  on article_views(article_id);

-- RLS: anyone can insert, no direct reads (only via RPCs)
alter table article_views enable row level security;

create policy "Anyone can insert views" on article_views
  for insert with check (true);

create policy "No direct reads" on article_views
  for select using (false);

-- Batch fetch all article view counts (unique viewers per article)
create or replace function get_article_view_counts()
returns table(article_id integer, count bigint)
language sql stable security definer
as $$
  select article_id, count(distinct viewer_id) as count
  from article_views
  group by article_id;
$$;

-- Record a view (idempotent via ON CONFLICT)
create or replace function record_article_view(p_article_id integer, p_viewer_id text)
returns void
language sql security definer
as $$
  insert into article_views (article_id, viewer_id, view_date)
  values (p_article_id, p_viewer_id, current_date)
  on conflict (article_id, viewer_id, view_date) do nothing;
$$;
