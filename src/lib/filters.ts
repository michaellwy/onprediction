import { Article, FilterState, SortOption, DateRange } from "@/types/article";

export function filterArticles(
  articles: Article[],
  filters: FilterState,
  bookmarks: Set<number>
): Article[] {
  return articles.filter((article) => {
    // Category filter
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(article.primary_category as any)
    ) {
      return false;
    }

    // Difficulty filter
    if (
      filters.difficulties.length > 0 &&
      !filters.difficulties.includes(article.difficulty as any)
    ) {
      return false;
    }

    // Source type filter
    if (
      filters.sourceTypes.length > 0 &&
      !filters.sourceTypes.includes(article.source_type as any)
    ) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== "all" && article.publish_date) {
      const articleDate = new Date(article.publish_date);
      const now = new Date();
      const cutoffDate = getDateRangeCutoff(filters.dateRange);
      if (articleDate < cutoffDate) {
        return false;
      }
    }

    // Bookmarks only filter
    if (filters.bookmarksOnly && !bookmarks.has(article.id)) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = article.title?.toLowerCase().includes(query);
      const matchesAuthor = article.author?.toLowerCase().includes(query);
      const matchesBlurb = article.editorial_blurb?.toLowerCase().includes(query);
      const matchesConcepts = article.concepts.some((c) =>
        c.toLowerCase().includes(query)
      );
      const matchesPlatforms = article.platforms_mentioned.some((p) =>
        p.toLowerCase().includes(query)
      );
      if (
        !matchesTitle &&
        !matchesAuthor &&
        !matchesBlurb &&
        !matchesConcepts &&
        !matchesPlatforms
      ) {
        return false;
      }
    }

    return true;
  });
}

export function sortArticles(
  articles: Article[],
  sortOption: SortOption,
  upvoteCounts?: Map<number, number>,
  viewCounts?: Map<number, number>
): Article[] {
  const sorted = [...articles];

  switch (sortOption) {
    case "date-desc":
      return sorted.sort((a, b) => {
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return (
          new Date(b.publish_date).getTime() -
          new Date(a.publish_date).getTime()
        );
      });
    case "date-asc":
      return sorted.sort((a, b) => {
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return (
          new Date(a.publish_date).getTime() -
          new Date(b.publish_date).getTime()
        );
      });
    case "upvotes-desc":
      return sorted.sort((a, b) => {
        const countA = upvoteCounts?.get(a.id) ?? 0;
        const countB = upvoteCounts?.get(b.id) ?? 0;
        if (countB !== countA) return countB - countA;
        // Secondary sort: newer first
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return (
          new Date(b.publish_date).getTime() -
          new Date(a.publish_date).getTime()
        );
      });
    case "views-desc":
      return sorted.sort((a, b) => {
        const countA = viewCounts?.get(a.id) ?? 0;
        const countB = viewCounts?.get(b.id) ?? 0;
        if (countB !== countA) return countB - countA;
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return (
          new Date(b.publish_date).getTime() -
          new Date(a.publish_date).getTime()
        );
      });
    case "title-asc":
      return sorted.sort((a, b) => {
        if (!a.title) return 1;
        if (!b.title) return -1;
        return a.title.localeCompare(b.title);
      });
    case "title-desc":
      return sorted.sort((a, b) => {
        if (!a.title) return 1;
        if (!b.title) return -1;
        return b.title.localeCompare(a.title);
      });
    default:
      return sorted;
  }
}

function getDateRangeCutoff(dateRange: DateRange): Date {
  const now = new Date();
  switch (dateRange) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "6months":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "year":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(0);
  }
}

export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.categories.length > 0) count += filters.categories.length;
  if (filters.difficulties.length > 0) count += filters.difficulties.length;
  if (filters.sourceTypes.length > 0) count += filters.sourceTypes.length;
  if (filters.dateRange !== "all") count += 1;
  if (filters.bookmarksOnly) count += 1;
  return count;
}
