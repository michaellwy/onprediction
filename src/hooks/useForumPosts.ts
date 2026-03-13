"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { ForumPost, ForumSortOption } from "@/types/forum";

const PAGE_SIZE = 20;

export function useForumPosts(sort: ForumSortOption = "newest") {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());

  const fetchPosts = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("forum_posts")
        .select("*")
        .range(from, to);

      if (sort === "newest") {
        query = query.order("created_at", { ascending: false });
      }
      // For "most_upvoted", we fetch all and sort client-side using upvote counts
      // (passed in from the parent component). Default to newest for DB query.
      if (sort === "most_upvoted") {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (!error && data) {
        if (append) {
          setPosts((prev) => [...prev, ...data]);
        } else {
          setPosts(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
      setIsLoading(false);
    },
    [sort]
  );

  // Fetch comment counts for all loaded posts
  const fetchCommentCounts = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;

    const { data, error } = await supabase
      .from("forum_comments")
      .select("post_id")
      .in("post_id", postIds);

    if (!error && data) {
      const counts = new Map<string, number>();
      for (const row of data) {
        counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1);
      }
      setCommentCounts(counts);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchPosts(0);
  }, [fetchPosts]);

  useEffect(() => {
    if (posts.length > 0) {
      fetchCommentCounts(posts.map((p) => p.id));
    }
  }, [posts, fetchCommentCounts]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }, [page, fetchPosts]);

  const createPost = useCallback(
    async (title: string, body: string, profile: { display_name: string; avatar_url: string | null } | null): Promise<ForumPost | null> => {
      if (!user) return null;

      const authorName =
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Anonymous";
      const authorAvatarUrl =
        profile?.avatar_url ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const { data, error } = await supabase
        .from("forum_posts")
        .insert({
          user_id: user.id,
          title: title.trim(),
          body: body.trim(),
          author_name: authorName,
          author_avatar_url: authorAvatarUrl,
        })
        .select()
        .single();

      if (error || !data) return null;

      setPosts((prev) => [data, ...prev]);
      return data;
    },
    [user]
  );

  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      if (!user) return false;

      // Optimistic removal
      setPosts((prev) => prev.filter((p) => p.id !== postId));

      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) {
        // Refetch to restore
        fetchPosts(0);
        return false;
      }
      return true;
    },
    [user, fetchPosts]
  );

  return {
    posts,
    isLoading,
    hasMore,
    loadMore,
    createPost,
    deletePost,
    commentCounts,
  };
}
