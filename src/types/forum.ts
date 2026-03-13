export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  author_name: string;
  author_avatar_url: string | null;
  created_at: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  author_name: string;
  author_avatar_url: string | null;
  created_at: string;
}

export type ForumSortOption = "newest" | "most_upvoted";
