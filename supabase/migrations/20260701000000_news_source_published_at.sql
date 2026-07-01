-- Surface each source's own publish date in the news "Coverage" list.
-- news_story_sources.published_at already exists (the article's byline date, set
-- by the ingest); it was used only to ORDER the sources json, never exposed. The
-- Coverage panel now shows a per-outlet timestamp so a reader can spot a stale
-- source or a story whose coverage spans an implausibly wide date range. Bodies
-- are otherwise identical to the live definitions (see 20260629 source-titles).

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
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url, 'title', src.title, 'published_at', src.published_at) order by src.published_at desc nulls last)
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
      (select json_agg(json_build_object('outlet', src.outlet, 'url', src.url, 'title', src.title, 'published_at', src.published_at) order by src.published_at desc nulls last)
       from news_story_sources src where src.story_id = s.id),
      '[]'::json
    ) as sources
  from news_stories s
  where s.status = 'published'
    and s.search @@ websearch_to_tsquery('english', q)
  order by ts_rank(s.search, websearch_to_tsquery('english', q)) desc, s.importance desc
  limit lim offset off;
$function$;
