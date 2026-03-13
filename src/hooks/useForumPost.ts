"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { ForumPost, ForumComment } from "@/types/forum";

export function useForumPost(postId: string | null) {
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    async function fetchPostAndComments() {
      setIsLoading(true);
      setError(null);

      const [postResult, commentsResult] = await Promise.all([
        supabase.from("forum_posts").select("*").eq("id", postId).single(),
        supabase
          .from("forum_comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);

      if (postResult.error) {
        setError("Post not found");
        setIsLoading(false);
        return;
      }

      setPost(postResult.data);
      setComments(commentsResult.data || []);
      setIsLoading(false);
    }

    fetchPostAndComments();
  }, [postId]);

  const addComment = useCallback(
    async (body: string, parentId?: string | null, profile?: { display_name: string; avatar_url: string | null } | null): Promise<ForumComment | null> => {
      if (!user || !postId) return null;

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
          post_id: postId,
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
    [user, postId]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!user) return false;

      // Optimistic removal
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const { error } = await supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) {
        // Refetch comments
        const { data } = await supabase
          .from("forum_comments")
          .select("*")
          .eq("post_id", postId!)
          .order("created_at", { ascending: true });
        if (data) setComments(data);
        return false;
      }
      return true;
    },
    [user, postId]
  );

  return { post, comments, isLoading, error, addComment, deleteComment };
}
