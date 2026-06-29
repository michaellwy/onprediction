-- News feed: curated, AI-analyzed prediction-market news stories.
-- Separate from the evergreen articles reading list (which lives in committed JSON).
-- News grows continuously and must be searchable, so it is stored in Postgres with
-- full-text search. This is the project's first use of tsvector/FTS.
--
-- Writes happen only from the service-role ingestion script (scripts/news/ingest-news.mjs),
-- which bypasses RLS. Public clients read via the RPCs below.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists news_stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  headline text not null,
  summary text not null,
  why_it_matters text,
  primary_category text,
  tags text[] not null default '{}',
  platforms text[] not null default '{}',
  lead_url text not null,
  lead_source text,
  score numeric not null default 0,
  outlet_count integer not null default 1,
  importance numeric not null default 0,
  cluster_key text,
  published_at timestamptz not null default now(),
  broke_on date not null default current_date,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  -- Full-text search across the human-meaningful fields + tags/platforms.
  -- Maintained by trigger below (a generated column can't use to_tsvector with a
  -- config name — Postgres deems that expression non-immutable).
  search tsvector
);

create or replace function news_stories_search_update()
returns trigger language plpgsql as $$
begin
  new.search :=
    to_tsvector('english',
      coalesce(new.headline, '') || ' ' ||
      coalesce(new.summary, '') || ' ' ||
      coalesce(new.why_it_matters, '') || ' ' ||
      array_to_string(new.tags, ' ') || ' ' ||
      array_to_string(new.platforms, ' ')
    );
  return new;
end;
$$;

drop trigger if exists trg_news_stories_search on news_stories;
create trigger trg_news_stories_search
  before insert or update on news_stories
  for each row execute function news_stories_search_update();

-- One row per underlying story; cluster_key lets the pipeline update-not-duplicate
-- when an ongoing story gets fresh coverage on a later day.
create unique index if not exists idx_news_stories_cluster_key
  on news_stories(cluster_key) where cluster_key is not null;
create index if not exists idx_news_stories_search on news_stories using gin(search);
create index if not exists idx_news_stories_importance on news_stories(importance desc);
create index if not exists idx_news_stories_published_at on news_stories(published_at desc);
create index if not exists idx_news_stories_status on news_stories(status);

-- The folded-in "N outlets" list shown under each story card.
create table if not exists news_story_sources (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references news_stories(id) on delete cascade,
  outlet text,
  url text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_news_story_sources_story_id on news_story_sources(story_id);
create unique index if not exists idx_news_story_sources_story_url
  on news_story_sources(story_id, url);

-- Dedup history: raw items already considered, so re-runs skip them.
create table if not exists news_seen (
  url_hash text primary key,
  seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — public read of stories/sources; writes only via service role (bypasses RLS)
-- ---------------------------------------------------------------------------

alter table news_stories enable row level security;
alter table news_story_sources enable row level security;
alter table news_seen enable row level security;

drop policy if exists "Public read published stories" on news_stories;
create policy "Public read published stories" on news_stories
  for select using (status = 'published');

drop policy if exists "Public read story sources" on news_story_sources;
create policy "Public read story sources" on news_story_sources
  for select using (
    exists (
      select 1 from news_stories s
      where s.id = news_story_sources.story_id and s.status = 'published'
    )
  );

-- news_seen: no public access at all (no policies => deny for anon/authenticated).

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Paginated feed of published stories, newest first, with their outlet list.
create or replace function get_news_feed(
  lim integer default 20,
  off integer default 0,
  p_category text default null,
  p_tag text default null
)
returns table (
  id uuid,
  slug text,
  headline text,
  summary text,
  why_it_matters text,
  primary_category text,
  tags text[],
  platforms text[],
  lead_url text,
  lead_source text,
  score numeric,
  outlet_count integer,
  importance numeric,
  published_at timestamptz,
  broke_on date,
  sources json
)
language sql stable security definer
as $$
  select
    s.id, s.slug, s.headline, s.summary, s.why_it_matters,
    s.primary_category, s.tags, s.platforms, s.lead_url, s.lead_source,
    s.score, s.outlet_count, s.importance, s.published_at, s.broke_on,
    coalesce(
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url) order by src.published_at desc nulls last)
       from news_story_sources src where src.story_id = s.id),
      '[]'::json
    ) as sources
  from news_stories s
  where s.status = 'published'
    and (p_category is null or s.primary_category = p_category)
    and (p_tag is null or p_tag = any(s.tags))
  order by s.published_at desc, s.importance desc
  limit lim offset off;
$$;

-- Full-text search over published stories, ranked by relevance then importance.
create or replace function search_news(
  q text,
  lim integer default 20,
  off integer default 0
)
returns table (
  id uuid,
  slug text,
  headline text,
  summary text,
  why_it_matters text,
  primary_category text,
  tags text[],
  platforms text[],
  lead_url text,
  lead_source text,
  score numeric,
  outlet_count integer,
  importance numeric,
  published_at timestamptz,
  broke_on date,
  sources json
)
language sql stable security definer
as $$
  select
    s.id, s.slug, s.headline, s.summary, s.why_it_matters,
    s.primary_category, s.tags, s.platforms, s.lead_url, s.lead_source,
    s.score, s.outlet_count, s.importance, s.published_at, s.broke_on,
    coalesce(
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url) order by src.published_at desc nulls last)
       from news_story_sources src where src.story_id = s.id),
      '[]'::json
    ) as sources
  from news_stories s
  where s.status = 'published'
    and s.search @@ websearch_to_tsquery('english', q)
  order by ts_rank(s.search, websearch_to_tsquery('english', q)) desc, s.importance desc
  limit lim offset off;
$$;

-- Facets for the filter sidebar: tag and category counts over published stories.
create or replace function get_news_facets()
returns table (kind text, value text, count bigint)
language sql stable security definer
as $$
  select 'tag' as kind, t as value, count(*) as count
  from news_stories s, unnest(s.tags) as t
  where s.status = 'published'
  group by t
  union all
  select 'category' as kind, s.primary_category as value, count(*) as count
  from news_stories s
  where s.status = 'published' and s.primary_category is not null
  group by s.primary_category
  order by count desc;
$$;

grant execute on function get_news_feed(integer, integer, text, text) to anon, authenticated;
grant execute on function search_news(text, integer, integer) to anon, authenticated;
grant execute on function get_news_facets() to anon, authenticated;
