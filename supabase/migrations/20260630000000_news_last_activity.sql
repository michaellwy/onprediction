-- Incremental live-feed pipeline support.
-- Separate two concerns that the batch pipeline used to conflate:
--   * published_at    — drives FEED ORDER. Bumped only on a MATERIAL update
--                       (new info → headline/summary rewrite) so the feed
--                       resurfaces genuine developments, not trivial dupes.
--   * last_activity_at — drives the MATCHING WINDOW (which recent stories a new
--                       item is compared against). Bumped on EVERY new-outlet
--                       append so an ongoing story keeps absorbing late coverage
--                       instead of spawning a duplicate.
alter table news_stories
  add column if not exists last_activity_at timestamptz not null default now();

-- Backfill: existing rows start their activity clock at their break time.
update news_stories set last_activity_at = published_at;

create index if not exists idx_news_stories_last_activity
  on news_stories(last_activity_at desc);
