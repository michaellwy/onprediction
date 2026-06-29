-- Durable raw-item cache for the news pipeline.
-- Stage 1 (harvest) populates this: scraped items + gate scores + fetched
-- article text + cluster assignment. Expensive work (scrape, Google URL decode,
-- article fetch, gating, clustering) lands here ONCE.
-- Stage 2 (build) reads from here and only re-runs the cheap interpretation layer
-- (headline/bullets/tags) to rebuild news_stories. Tweaking wording => build only.
--
-- Service-role only (written by scripts, read by scripts). No public access.

create table if not exists news_raw_items (
  url_hash text primary key,
  url text not null,
  resolved_url text,
  title text not null,
  source text,
  source_type text,
  published_at timestamptz,
  broke_day date,
  on_topic boolean,
  gate_score numeric,
  article_text text,
  cluster_key text,
  harvested_at timestamptz not null default now()
);

create index if not exists idx_news_raw_cluster on news_raw_items(cluster_key);
create index if not exists idx_news_raw_ontopic on news_raw_items(on_topic, gate_score);
create index if not exists idx_news_raw_ungated on news_raw_items(gate_score) where gate_score is null;

alter table news_raw_items enable row level security;
-- No policies: anon/authenticated denied. Only the service-role scripts touch it.
