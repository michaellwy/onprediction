"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const VIEWER_ID_KEY = "onprediction-viewer-id";
const VIEWED_SESSION_KEY = "onprediction-viewed-articles";

function getOrCreateViewerId(): string {
  let id = localStorage.getItem(VIEWER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VIEWER_ID_KEY, id);
  }
  return id;
}

function getSessionViewedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VIEWED_SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSessionViewed(articleId: number): void {
  const set = getSessionViewedSet();
  set.add(String(articleId));
  sessionStorage.setItem(VIEWED_SESSION_KEY, JSON.stringify([...set]));
}

function hasSessionViewed(articleId: number): boolean {
  return getSessionViewedSet().has(String(articleId));
}

export function useArticleViews() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const pendingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.rpc("get_article_view_counts");
      if (!error && data) {
        const map = new Map<number, number>();
        for (const row of data as { article_id: number; count: number }[]) {
          map.set(row.article_id, Number(row.count));
        }
        setCounts(map);
      }
    }
    fetchCounts();
  }, []);

  const recordView = useCallback(
    (articleId: number) => {
      if (hasSessionViewed(articleId)) return;
      if (pendingRef.current.has(articleId)) return;
      pendingRef.current.add(articleId);

      const viewerId = user?.id ?? getOrCreateViewerId();

      // Optimistic count bump
      setCounts((prev) => {
        const next = new Map(prev);
        next.set(articleId, (next.get(articleId) || 0) + 1);
        return next;
      });

      markSessionViewed(articleId);

      supabase
        .rpc("record_article_view", {
          p_article_id: articleId,
          p_viewer_id: viewerId,
        })
        .then(({ error }) => {
          if (error) {
            setCounts((prev) => {
              const next = new Map(prev);
              next.set(articleId, Math.max(0, (next.get(articleId) || 0) - 1));
              return next;
            });
          }
          pendingRef.current.delete(articleId);
        });
    },
    [user]
  );

  return { viewCounts: counts, recordView };
}
