"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useArticleCommentCounts() {
  const [counts, setCounts] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase.rpc("get_article_comment_counts");
      if (!error && data) {
        const map = new Map<number, number>();
        for (const row of data) {
          map.set(row.article_id, Number(row.count));
        }
        setCounts(map);
      }
    }
    fetch();
  }, []);

  return counts;
}
