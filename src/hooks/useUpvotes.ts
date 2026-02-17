"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useUpvotes() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [userUpvotes, setUserUpvotes] = useState<Set<number>>(new Set());

  // Fetch all upvote counts
  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.rpc("get_upvote_counts");
      if (!error && data) {
        const map = new Map<number, number>();
        for (const row of data) {
          map.set(row.article_id, Number(row.count));
        }
        setCounts(map);
      }
    }
    fetchCounts();
  }, []);

  // Fetch user's upvotes when authenticated
  useEffect(() => {
    if (!user) {
      setUserUpvotes(new Set());
      return;
    }

    async function fetchUserUpvotes() {
      const { data, error } = await supabase
        .from("upvotes")
        .select("article_id")
        .eq("user_id", user!.id);
      if (!error && data) {
        setUserUpvotes(new Set(data.map((row) => row.article_id)));
      }
    }
    fetchUserUpvotes();
  }, [user]);

  const toggleUpvote = useCallback(
    async (articleId: number) => {
      if (!user) return;

      const isUpvoted = userUpvotes.has(articleId);

      // Optimistic update
      setUserUpvotes((prev) => {
        const next = new Set(prev);
        if (isUpvoted) {
          next.delete(articleId);
        } else {
          next.add(articleId);
        }
        return next;
      });
      setCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(articleId) || 0;
        next.set(articleId, isUpvoted ? Math.max(0, current - 1) : current + 1);
        return next;
      });

      if (isUpvoted) {
        const { error } = await supabase
          .from("upvotes")
          .delete()
          .eq("user_id", user.id)
          .eq("article_id", articleId);
        if (error) {
          // Revert
          setUserUpvotes((prev) => new Set([...prev, articleId]));
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(articleId, (next.get(articleId) || 0) + 1);
            return next;
          });
        }
      } else {
        const { error } = await supabase
          .from("upvotes")
          .insert({ user_id: user.id, article_id: articleId });
        if (error) {
          // Revert
          setUserUpvotes((prev) => {
            const next = new Set(prev);
            next.delete(articleId);
            return next;
          });
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(articleId, Math.max(0, (next.get(articleId) || 0) - 1));
            return next;
          });
        }
      }
    },
    [user, userUpvotes]
  );

  return { counts, userUpvotes, toggleUpvote };
}
