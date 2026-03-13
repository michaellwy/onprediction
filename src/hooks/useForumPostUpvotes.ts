"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useForumPostUpvotes() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.rpc("get_forum_post_upvote_counts");
      if (!error && data) {
        const map = new Map<string, number>();
        for (const row of data) {
          map.set(row.post_id, Number(row.count));
        }
        setCounts(map);
      }
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserUpvotes(new Set());
      return;
    }

    async function fetchUserUpvotes() {
      const { data, error } = await supabase
        .from("forum_post_upvotes")
        .select("post_id")
        .eq("user_id", user!.id);
      if (!error && data) {
        setUserUpvotes(new Set(data.map((row) => row.post_id)));
      }
    }
    fetchUserUpvotes();
  }, [user]);

  const toggleUpvote = useCallback(
    async (postId: string) => {
      if (!user) return;

      const isUpvoted = userUpvotes.has(postId);

      // Optimistic update
      setUserUpvotes((prev) => {
        const next = new Set(prev);
        if (isUpvoted) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });
      setCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(postId) || 0;
        next.set(postId, isUpvoted ? Math.max(0, current - 1) : current + 1);
        return next;
      });

      if (isUpvoted) {
        const { error } = await supabase
          .from("forum_post_upvotes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) {
          setUserUpvotes((prev) => new Set([...prev, postId]));
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(postId, (next.get(postId) || 0) + 1);
            return next;
          });
        }
      } else {
        const { error } = await supabase
          .from("forum_post_upvotes")
          .insert({ user_id: user.id, post_id: postId });
        if (error) {
          setUserUpvotes((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(postId, Math.max(0, (next.get(postId) || 0) - 1));
            return next;
          });
        }
      }
    },
    [user, userUpvotes]
  );

  return { counts, userUpvotes, toggleUpvote };
}
