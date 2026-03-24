"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DiscussionFeedItem } from "@/types/forum";

const PAGE_SIZE = 30;

export function useRecentDiscussions() {
  const [items, setItems] = useState<DiscussionFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchDiscussions = useCallback(async (off: number, append: boolean = false) => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_recent_discussions", {
      lim: PAGE_SIZE,
      off,
    });

    if (!error && data) {
      const mapped: DiscussionFeedItem[] = data.map((row: Record<string, unknown>) => ({
        post_id: row.post_id as string,
        article_id: row.article_id as number | null,
        title: row.title as string,
        comment_count: Number(row.comment_count),
        last_activity: row.last_activity as string,
        last_commenter_name: row.last_commenter_name as string | null,
      }));

      if (append) {
        setItems((prev) => [...prev, ...mapped]);
      } else {
        setItems(mapped);
      }
      setHasMore(mapped.length === PAGE_SIZE);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscussions(0);
  }, [fetchDiscussions]);

  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchDiscussions(nextOffset, true);
  }, [offset, fetchDiscussions]);

  return { items, isLoading, hasMore, loadMore };
}
