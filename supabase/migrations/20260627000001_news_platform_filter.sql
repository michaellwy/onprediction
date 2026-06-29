-- Add platform filtering to the news feed + expose platform facets.
-- Platforms are auto-detected per story by the ingestion pipeline and grow over time.

-- get_news_feed gains a p_platform argument; adding a param changes the function
-- signature, so drop the old one first.
drop function if exists get_news_feed(integer, integer, text, text);

create or replace function get_news_feed(
  lim integer default 20,
  off integer default 0,
  p_category text default null,
  p_tag text default null,
  p_platform text default null
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
    and (p_platform is null or p_platform = any(s.platforms))
  order by s.published_at desc, s.importance desc
  limit lim offset off;
$$;

-- Add platform facets alongside tag/category.
create or replace function get_news_facets()
returns table (kind text, value text, count bigint)
language sql stable security definer
as $$
  select 'platform' as kind, p as value, count(*) as count
  from news_stories s, unnest(s.platforms) as p
  where s.status = 'published'
  group by p
  union all
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

grant execute on function get_news_feed(integer, integer, text, text, text) to anon, authenticated;
grant execute on function get_news_facets() to anon, authenticated;
