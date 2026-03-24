"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { ForumPost, ForumComment } from "@/types/forum";

export function useArticleDiscussion(articleId: number | null, articleTitle: string) {
  const { user, profile } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  // Fetch existing discussion thread for this article
  useEffect(() => {
    if (articleId === null) {
      setPost(null);
      setComments([]);
      setPostId(null);
      return;
    }

    async function fetchDiscussion() {
      setIsLoading(true);

      const { data: existingPost } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("article_id", articleId)
        .single();

      if (existingPost) {
        setPost(existingPost);
        setPostId(existingPost.id);

        const { data: existingComments } = await supabase
          .from("forum_comments")
          .select("*")
          .eq("post_id", existingPost.id)
          .order("created_at", { ascending: true });

        setComments(existingComments || []);
      } else {
        setPost(null);
        setPostId(null);
        setComments([]);
      }

      setIsLoading(false);
    }

    fetchDiscussion();
  }, [articleId]);

  const ensureThread = useCallback(async (): Promise<string | null> => {
    if (!user || articleId === null) return null;

    // Thread already exists
    if (postId) return postId;

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
        article_id: articleId,
        title: articleTitle,
        body: "",
        author_name: authorName,
        author_avatar_url: authorAvatarUrl,
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation — thread was created by another user concurrently
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("forum_posts")
          .select("*")
          .eq("article_id", articleId)
          .single();
        if (existing) {
          setPost(existing);
          setPostId(existing.id);
          return existing.id;
        }
      }
      return null;
    }

    setPost(data);
    setPostId(data.id);
    return data.id;
  }, [user, profile, articleId, articleTitle, postId]);

  const addComment = useCallback(
    async (body: string, parentId?: string | null): Promise<ForumComment | null> => {
      if (!user) return null;

      const threadId = await ensureThread();
      if (!threadId) return null;

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
        .from("forum_comments")
        .insert({
          post_id: threadId,
          user_id: user.id,
          body: body.trim(),
          author_name: authorName,
          author_avatar_url: authorAvatarUrl,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error || !data) return null;

      setComments((prev) => [...prev, data]);
      return data;
    },
    [user, profile, ensureThread]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!user) return false;

      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const { error } = await supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) {
        // Refetch
        if (postId) {
          const { data } = await supabase
            .from("forum_comments")
            .select("*")
            .eq("post_id", postId)
            .order("created_at", { ascending: true });
          if (data) setComments(data);
        }
        return false;
      }
      return true;
    },
    [user, postId]
  );

  return { post, postId, comments, isLoading, addComment, deleteComment };
}
