export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  author_name: string;
  author_avatar_url: string | null;
  created_at: string;
  article_id: number | null;
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

export interface DiscussionFeedItem {
  post_id: string;
  article_id: number | null;
  title: string;
  comment_count: number;
  last_activity: string;
  last_commenter_name: string | null;
}

export type ForumSortOption = "newest" | "most_upvoted";
export type DiscussionTab = "recent" | "general";
