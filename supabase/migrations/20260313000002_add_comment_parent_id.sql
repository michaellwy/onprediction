-- Add parent_id for single-level reply threading
alter table forum_comments add column parent_id uuid references forum_comments(id) on delete cascade;
create index idx_forum_comments_parent_id on forum_comments(parent_id);
