export interface NewsStorySource {
  outlet: string | null;
  url: string;
  // Per-source article headline. Exists upstream in news_raw_items.title but is
  // not yet propagated into the feed; optional until the pipeline carries it.
  title?: string | null;
  // The source article's own byline date (ISO). Drives the Coverage list's
  // per-outlet timestamp and chronological order. Null when the ingest could
  // not read a date for that outlet.
  published_at?: string | null;
}

// News-native beats (distinct from the article taxonomy in types/article.ts).
export type NewsCategory =
  | "Regulation"
  | "Funding"
  | "Platforms"
  | "Markets"
  | "Security"
  | "Adoption"
  | "Opinion";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "Regulation", "Funding", "Platforms", "Markets", "Security", "Adoption", "Opinion",
];

// HSL values (from globals.css tokens) used for inline-styled dots + labels.
export const NEWS_BEAT_HSL: Record<NewsCategory, string> = {
  Regulation: "var(--news-regulation)",
  Funding: "var(--news-funding)",
  Platforms: "var(--news-platforms)",
  Markets: "var(--news-markets)",
  Security: "var(--news-security)",
  Adoption: "var(--news-adoption)",
  Opinion: "var(--news-opinion)",
};

export interface NewsStory {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  why_it_matters: string | null;
  primary_category: NewsCategory | null;
  tags: string[];
  platforms: string[];
  lead_url: string;
  lead_source: string | null;
  score: number;
  outlet_count: number;
  importance: number;
  published_at: string;
  broke_on: string;
  sources: NewsStorySource[];
}

export type NewsSortOption = "recent" | "importance";
