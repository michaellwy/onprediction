-- Per-source article headlines for the news "Coverage" list.
-- The titles already exist in news_raw_items.title (the durable harvest cache)
-- but were never carried into news_story_sources or the feed RPCs. This adds the
-- column, backfills it from the raw cache (matching on url or resolved_url —
-- 100% join coverage at migration time), and surfaces it in the feed JSON so the
-- UI can render "NYT: <headline>" per outlet.

alter table news_story_sources add column if not exists title text;

-- Backfill existing rows from the raw-item cache (latest harvest wins).
update news_story_sources s
set title = (
  select r.title
  from news_raw_items r
  where r.url = s.url or r.resolved_url = s.url
  order by r.harvested_at desc
  limit 1
)
where s.title is null;

-- Recreate the feed RPCs with 'title' added to each source object. Bodies are
-- otherwise identical to the live definitions.
create or replace function public.get_news_feed(
  lim integer default 20, off integer default 0, p_category text default null,
  p_tag text default null, p_platform text default null
)
returns table(id uuid, slug text, headline text, summary text, why_it_matters text,
  primary_category text, tags text[], platforms text[], lead_url text, lead_source text,
  score numeric, outlet_count integer, importance numeric, published_at timestamptz,
  broke_on date, sources json)
language sql stable security definer as $function$
  select
    s.id, s.slug, s.headline, s.summary, s.why_it_matters,
    s.primary_category, s.tags, s.platforms, s.lead_url, s.lead_source,
    s.score, s.outlet_count, s.importance, s.published_at, s.broke_on,
    coalesce(
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url, 'title', src.title) order by src.published_at desc nulls last)
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
$function$;

create or replace function public.search_news(q text, lim integer default 20, off integer default 0)
returns table(id uuid, slug text, headline text, summary text, why_it_matters text,
  primary_category text, tags text[], platforms text[], lead_url text, lead_source text,
  score numeric, outlet_count integer, importance numeric, published_at timestamptz,
  broke_on date, sources json)
language sql stable security definer as $function$
  select
    s.id, s.slug, s.headline, s.summary, s.why_it_matters,
    s.primary_category, s.tags, s.platforms, s.lead_url, s.lead_source,
    s.score, s.outlet_count, s.importance, s.published_at, s.broke_on,
    coalesce(
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url, 'title', src.title) order by src.published_at desc nulls last)
       from news_story_sources src where src.story_id = s.id),
      '[]'::json
    ) as sources
  from news_stories s
  where s.status = 'published'
    and s.search @@ websearch_to_tsquery('english', q)
  order by ts_rank(s.search, websearch_to_tsquery('english', q)) desc, s.importance desc
  limit lim offset off;
$function$;
