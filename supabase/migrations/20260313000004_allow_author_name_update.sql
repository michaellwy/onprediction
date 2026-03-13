-- Allow users to update author_name on their own posts and comments
create policy "Users can update own posts" on forum_posts
  for update using (auth.uid() = user_id);

create policy "Users can update own comments" on forum_comments
  for update using (auth.uid() = user_id);
