"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useForumCommentUpvotes(postId: string | null) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!postId) return;

    async function fetchCounts() {
      const { data, error } = await supabase.rpc("get_forum_comment_upvote_counts", {
        target_post_id: postId,
      });
      if (!error && data) {
        const map = new Map<string, number>();
        for (const row of data) {
          map.set(row.comment_id, Number(row.count));
        }
        setCounts(map);
      }
    }
    fetchCounts();
  }, [postId]);

  useEffect(() => {
    if (!user || !postId) {
      setUserUpvotes(new Set());
      return;
    }

    async function fetchUserUpvotes() {
      // Get comment IDs for this post, then check upvotes
      const { data: comments } = await supabase
        .from("forum_comments")
        .select("id")
        .eq("post_id", postId);

      if (!comments || comments.length === 0) return;

      const commentIds = comments.map((c) => c.id);
      const { data, error } = await supabase
        .from("forum_comment_upvotes")
        .select("comment_id")
        .eq("user_id", user!.id)
        .in("comment_id", commentIds);

      if (!error && data) {
        setUserUpvotes(new Set(data.map((row) => row.comment_id)));
      }
    }
    fetchUserUpvotes();
  }, [user, postId]);

  const toggleUpvote = useCallback(
    async (commentId: string) => {
      if (!user) return;

      const isUpvoted = userUpvotes.has(commentId);

      setUserUpvotes((prev) => {
        const next = new Set(prev);
        if (isUpvoted) {
          next.delete(commentId);
        } else {
          next.add(commentId);
        }
        return next;
      });
      setCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(commentId) || 0;
        next.set(commentId, isUpvoted ? Math.max(0, current - 1) : current + 1);
        return next;
      });

      if (isUpvoted) {
        const { error } = await supabase
          .from("forum_comment_upvotes")
          .delete()
          .eq("user_id", user.id)
          .eq("comment_id", commentId);
        if (error) {
          setUserUpvotes((prev) => new Set([...prev, commentId]));
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(commentId, (next.get(commentId) || 0) + 1);
            return next;
          });
        }
      } else {
        const { error } = await supabase
          .from("forum_comment_upvotes")
          .insert({ user_id: user.id, comment_id: commentId });
        if (error) {
          setUserUpvotes((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(commentId, Math.max(0, (next.get(commentId) || 0) - 1));
            return next;
          });
        }
      }
    },
    [user, userUpvotes]
  );

  return { counts, userUpvotes, toggleUpvote };
}
