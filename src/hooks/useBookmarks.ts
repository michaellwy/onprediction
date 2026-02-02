"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getBookmarks,
  saveBookmarks,
  toggleBookmark as toggleBookmarkUtil,
} from "@/lib/bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setIsLoaded(true);
  }, []);

  const toggleBookmark = useCallback((articleId: number) => {
    setBookmarks((prev) => {
      const newBookmarks = toggleBookmarkUtil(prev, articleId);
      saveBookmarks(newBookmarks);
      return newBookmarks;
    });
  }, []);

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
