-- Remove minimum body length constraints
alter table forum_posts drop constraint forum_posts_body_check;
alter table forum_posts add constraint forum_posts_body_check check (char_length(body) >= 1 and char_length(body) <= 20000);
