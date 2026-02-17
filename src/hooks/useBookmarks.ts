"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBookmarks,
  saveBookmarks,
  toggleBookmark as toggleBookmarkUtil,
} from "@/lib/bookmarks";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const MIGRATION_KEY = "frontier-market-bookmarks-migrated";

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const migrationDone = useRef(false);

  // Load bookmarks: Supabase if authenticated, localStorage otherwise
  useEffect(() => {
    if (user) {
      // Fetch from Supabase
      async function fetchAndMigrate() {
        const { data, error } = await supabase
          .from("bookmarks")
          .select("article_id")
          .eq("user_id", user!.id);

        const supabaseIds = new Set<number>(
          error ? [] : data.map((row) => row.article_id)
        );

        // One-time migration of localStorage bookmarks
        if (!migrationDone.current && !localStorage.getItem(MIGRATION_KEY)) {
          migrationDone.current = true;
          const localBookmarks = getBookmarks();
          const toMigrate = [...localBookmarks].filter(
            (id) => !supabaseIds.has(id)
          );

          if (toMigrate.length > 0) {
            const rows = toMigrate.map((article_id) => ({
              user_id: user!.id,
              article_id,
            }));
            await supabase.from("bookmarks").insert(rows);
            for (const id of toMigrate) {
              supabaseIds.add(id);
            }
          }
          localStorage.setItem(MIGRATION_KEY, "true");
        }

        setBookmarks(supabaseIds);
        setIsLoaded(true);
      }
      fetchAndMigrate();
    } else {
      // Fallback to localStorage
      setBookmarks(getBookmarks());
      setIsLoaded(true);
    }
  }, [user]);

  const toggleBookmark = useCallback(
    async (articleId: number) => {
      if (user) {
        const isCurrentlyBookmarked = bookmarks.has(articleId);

        // Optimistic update
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (isCurrentlyBookmarked) {
            next.delete(articleId);
          } else {
            next.add(articleId);
          }
          return next;
        });

        if (isCurrentlyBookmarked) {
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("article_id", articleId);
          if (error) {
            // Revert
            setBookmarks((prev) => new Set([...prev, articleId]));
          }
        } else {
          const { error } = await supabase
            .from("bookmarks")
            .insert({ user_id: user.id, article_id: articleId });
          if (error) {
            // Revert
            setBookmarks((prev) => {
              const next = new Set(prev);
              next.delete(articleId);
              return next;
            });
          }
        }
      } else {
        // localStorage mode
        setBookmarks((prev) => {
          const newBookmarks = toggleBookmarkUtil(prev, articleId);
          saveBookmarks(newBookmarks);
          return newBookmarks;
        });
      }
    },
    [user, bookmarks]
  );

  const isBookmarked = useCallback(
    (articleId: number) => {
      return bookmarks.has(articleId);
    },
    [bookmarks]
  );

  return {
    bookmarks,
    isLoaded,
    toggleBookmark,
    isBookmarked,
  };
}
