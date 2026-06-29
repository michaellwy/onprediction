"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getNewsSeed } from "@/lib/news";
import type { NewsStory, NewsStorySource } from "@/types/news";

const PAGE_SIZE = 20;
// The terminal loads the whole published feed in one sync so the timeline spine
// spans every day up front (jumping back must not depend on "Load earlier").
// Generous ceiling for a curated digest; revisit with a day-index if it's hit.
const FULL_LIMIT = 1000;

function mapRow(row: Record<string, unknown>): NewsStory {
  const rawSources = (row.sources as Array<Record<string, unknown>> | null) ?? [];
  return {
    id: row.id as string,
    slug: row.slug as string,
    headline: row.headline as string,
    summary: row.summary as string,
    why_it_matters: (row.why_it_matters as string) ?? null,
    primary_category: (row.primary_category as NewsStory["primary_category"]) ?? null,
    tags: (row.tags as string[]) ?? [],
    platforms: (row.platforms as string[]) ?? [],
    lead_url: row.lead_url as string,
    lead_source: (row.lead_source as string) ?? null,
    score: Number(row.score),
    outlet_count: Number(row.outlet_count),
    importance: Number(row.importance),
    published_at: row.published_at as string,
    broke_on: row.broke_on as string,
    sources: rawSources.map((s): NewsStorySource => ({
      outlet: (s.outlet as string) ?? null,
      url: s.url as string,
      title: (s.title as string) ?? null,
    })),
  };
}

/**
 * Paginated live news feed from Supabase, seeded with the build-time snapshot
 * for instant first paint. Optional category/platform filters re-query from offset 0.
 */
export function useNews(category: string | null, platform: string | null) {
  const seed = getNewsSeed();
  const unfiltered = !category && !platform;
  const [items, setItems] = useState<NewsStory[]>(unfiltered ? seed : []);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(unfiltered ? seed.length : 0);
  const [fetchedAt, setFetchedAt] = useState(0); // ms of last successful sync (0 = none yet)

  const fetchFeed = useCallback(
    async (off: number, append: boolean) => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc("get_news_feed", {
        lim: PAGE_SIZE,
        off,
        p_category: category,
        p_tag: null,
        p_platform: platform,
      });
      if (!error && data) {
        const mapped = (data as Record<string, unknown>[]).map(mapRow);
        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore(mapped.length === PAGE_SIZE);
        setFetchedAt(Date.now());
      }
      setIsLoading(false);
    },
    [category, platform]
  );

  // Background sync: pull the whole published feed so the feed stays live, "last
  // fetch" is honest, AND the timeline has every day available without paging.
  const syncHead = useCallback(async () => {
    const lim = FULL_LIMIT;
    const { data, error } = await supabase.rpc("get_news_feed", {
      lim, off: 0, p_category: category, p_tag: null, p_platform: platform,
    });
    if (!error && data) {
      const mapped = (data as Record<string, unknown>[]).map(mapRow);
      setItems(mapped);
      setHasMore(mapped.length === lim);
      setOffset(mapped.length);
      setFetchedAt(Date.now());
    }
  }, [category, platform]);

  // Unfiltered: render the cached seed instantly (no network), then sync the
  // live head and keep it fresh on an interval. Filters/search: query Supabase.
  useEffect(() => {
    if (unfiltered) {
      setItems(seed);
      setOffset(seed.length);
      setHasMore(true);
      setIsLoading(false);
      setFetchedAt(Date.now());
      syncHead();
      const id = setInterval(syncHead, 120_000);
      return () => clearInterval(id);
    }
    setOffset(0);
    fetchFeed(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFeed, syncHead, unfiltered]);

  const loadMore = useCallback(() => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchFeed(next, true);
  }, [offset, fetchFeed]);

  return { items, isLoading, hasMore, loadMore, fetchedAt };
}

export interface NewsFacet { value: string; count: number }

/** Category + platform facets (auto-populated) + total story count. */
export function useNewsFacets() {
  const [categories, setCategories] = useState<NewsFacet[]>([]);
  const [platforms, setPlatforms] = useState<NewsFacet[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_news_facets");
      if (!error && data) {
        const rows = data as Record<string, unknown>[];
        const cats = rows.filter((r) => r.kind === "category").map((r) => ({ value: r.value as string, count: Number(r.count) }));
        setCategories(cats);
        setPlatforms(rows.filter((r) => r.kind === "platform").map((r) => ({ value: r.value as string, count: Number(r.count) })));
        setTotal(cats.reduce((s, c) => s + c.count, 0));
      }
    })();
  }, []);
  return { categories, platforms, total };
}

/** Full-text search over published news via the search_news RPC. */
export function useNewsSearch(query: string) {
  const [results, setResults] = useState<NewsStory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_news", { q, lim: 30, off: 0 });
      if (!cancelled) {
        setResults(!error && data ? (data as Record<string, unknown>[]).map(mapRow) : []);
        setIsSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  return { results, isSearching };
}
