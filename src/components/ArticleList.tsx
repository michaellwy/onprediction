"use client";

import { useMemo, useState, useCallback } from "react";
import { FileQuestion } from "lucide-react";
import { Article, FilterState, SortOption } from "@/types/article";
import { filterArticles, sortArticles } from "@/lib/filters";
import { ArticleCard } from "@/components/ArticleCard";

interface ArticleListProps {
  articles: Article[];
  filters: FilterState;
  sortOption: SortOption;
  bookmarks: Set<number>;
  onToggleBookmark: (articleId: number) => void;
  upvoteCounts: Map<number, number>;
  userUpvotes: Set<number>;
  onToggleUpvote: (articleId: number) => void;
  allExpanded: boolean;
  expandResetKey: number;
}

export function ArticleList({
  articles,
  filters,
  sortOption,
  bookmarks,
  onToggleBookmark,
  upvoteCounts,
  userUpvotes,
  onToggleUpvote,
  allExpanded,
  expandResetKey,
}: ArticleListProps) {
  // Track IDs that override the allExpanded state, keyed by reset
  const [overrideState, setOverrideState] = useState<{ key: number; ids: Set<number> }>({
    key: expandResetKey,
    ids: new Set()
  });

  // Get current overrides, clearing if reset key changed
  const overrideIds = overrideState.key === expandResetKey ? overrideState.ids : new Set<number>();

  const toggleExpand = useCallback((id: number) => {
    setOverrideState((prev) => {
      const ids = prev.key === expandResetKey ? new Set(prev.ids) : new Set<number>();
      if (ids.has(id)) {
        ids.delete(id);
      } else {
        ids.add(id);
      }
      return { key: expandResetKey, ids };
    });
  }, [expandResetKey]);

  // Card is expanded if: (allExpanded AND not overridden) OR (not allExpanded AND overridden)
  const isCardExpanded = useCallback((id: number) => {
    const isOverridden = overrideIds.has(id);
    return allExpanded ? !isOverridden : isOverridden;
  }, [allExpanded, overrideIds]);
  const filteredAndSortedArticles = useMemo(() => {
    const filtered = filterArticles(articles, filters, bookmarks);
    return sortArticles(filtered, sortOption, upvoteCounts);
  }, [articles, filters, sortOption, bookmarks, upvoteCounts]);

  if (filteredAndSortedArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileQuestion className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h3 className="font-serif text-lg text-foreground mb-2">
          No articles found
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {filters.bookmarksOnly
            ? "You haven't bookmarked any articles yet. Click the bookmark icon to save articles for later."
            : "Try adjusting your filters to discover more readings."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y-0">
      {filteredAndSortedArticles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          isBookmarked={bookmarks.has(article.id)}
          onToggleBookmark={() => onToggleBookmark(article.id)}
          upvoteCount={upvoteCounts.get(article.id) || 0}
          isUpvoted={userUpvotes.has(article.id)}
          onToggleUpvote={() => onToggleUpvote(article.id)}
          index={index}
          isExpanded={isCardExpanded(article.id)}
          onToggleExpand={() => toggleExpand(article.id)}
        />
      ))}
    </div>
  );
}
