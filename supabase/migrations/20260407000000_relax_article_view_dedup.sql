-- Relax view dedup from once-per-day to once-per-hour cooldown

-- Drop the daily unique constraint
drop index idx_article_views_unique;

-- Index for the cooldown check (viewer + article + recent time)
create index idx_article_views_cooldown
  on article_views(article_id, viewer_id, created_at desc);

-- Record a view only if none from this viewer+article in the last hour
create or replace function record_article_view(p_article_id integer, p_viewer_id text)
returns void
language sql security definer
as $$
  insert into article_views (article_id, viewer_id)
  select p_article_id, p_viewer_id
  where not exists (
    select 1 from article_views
    where article_id = p_article_id
      and viewer_id = p_viewer_id
      and created_at > now() - interval '1 hour'
  );
$$;

-- Count total views (not just distinct viewers)
create or replace function get_article_view_counts()
returns table(article_id integer, count bigint)
language sql stable security definer
as $$
  select article_id, count(*) as count
  from article_views
  group by article_id;
$$;
