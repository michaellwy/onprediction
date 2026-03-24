-- Add article_id to forum_posts for article-anchored discussions
-- NULL = standalone post (legacy behavior), integer = article discussion thread
alter table forum_posts add column article_id integer;

-- Each article can have at most one discussion thread
create unique index idx_forum_posts_article_id
  on forum_posts(article_id)
  where article_id is not null;

-- Relax title constraint for auto-created article threads (title >= 1 instead of >= 5)
alter table forum_posts drop constraint forum_posts_title_check;
alter table forum_posts add constraint forum_posts_title_check
  check (char_length(title) >= 1 and char_length(title) <= 150);

-- Relax body constraint to allow empty body for article discussion threads
alter table forum_posts drop constraint forum_posts_body_check;
alter table forum_posts add constraint forum_posts_body_check
  check (char_length(body) >= 0 and char_length(body) <= 20000);

-- Batch fetch comment counts for all article discussions
create or replace function get_article_comment_counts()
returns table(article_id integer, count bigint)
language sql stable
as $$
  select fp.article_id, count(fc.id) as count
  from forum_posts fp
  join forum_comments fc on fc.post_id = fp.id
  where fp.article_id is not null
  group by fp.article_id;
$$;

-- Recent discussions feed (posts with recent comment activity)
create or replace function get_recent_discussions(lim integer default 30, off integer default 0)
returns table(
  post_id uuid,
  article_id integer,
  title text,
  comment_count bigint,
  last_activity timestamptz,
  last_commenter_name text
)
language sql stable
as $$
  select
    fp.id as post_id,
    fp.article_id,
    fp.title,
    count(fc.id) as comment_count,
    max(fc.created_at) as last_activity,
    (select fc2.author_name
     from forum_comments fc2
     where fc2.post_id = fp.id
     order by fc2.created_at desc
     limit 1) as last_commenter_name
  from forum_posts fp
  join forum_comments fc on fc.post_id = fp.id
  group by fp.id, fp.article_id, fp.title
  order by max(fc.created_at) desc
  limit lim offset off;
$$;
