"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
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
  sharedArticleId?: number | null;
  onShareCopied?: () => void;
  articleCommentCounts?: Map<number, number>;
  onOpenDiscussion?: (articleId: number) => void;
  viewCounts?: Map<number, number>;
  onRecordView?: (articleId: number) => void;
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
  sharedArticleId,
  onShareCopied,
  articleCommentCounts,
  onOpenDiscussion,
  viewCounts,
  onRecordView,
}: ArticleListProps) {
  // Track IDs that override the allExpanded state, keyed by reset
  const [overrideState, setOverrideState] = useState<{ key: number; ids: Set<number> }>(() => ({
    key: expandResetKey,
    ids: new Set(sharedArticleId != null ? [sharedArticleId] : [])
  }));

  // Get current overrides, clearing if reset key changed
  const overrideIds = overrideState.key === expandResetKey ? overrideState.ids : new Set<number>();

  const toggleExpand = useCallback((id: number) => {
    // Record view when expanding (not collapsing)
    const wasExpanded = allExpanded
      ? !overrideIds.has(id)
      : overrideIds.has(id);
    if (!wasExpanded) {
      onRecordView?.(id);
    }

    setOverrideState((prev) => {
      const ids = prev.key === expandResetKey ? new Set(prev.ids) : new Set<number>();
      if (ids.has(id)) {
        ids.delete(id);
      } else {
        ids.add(id);
      }
      return { key: expandResetKey, ids };
    });
  }, [expandResetKey, allExpanded, overrideIds, onRecordView]);

  // Card is expanded if: (allExpanded AND not overridden) OR (not allExpanded AND overridden)
  const isCardExpanded = useCallback((id: number) => {
    const isOverridden = overrideIds.has(id);
    return allExpanded ? !isOverridden : isOverridden;
  }, [allExpanded, overrideIds]);

  // Scroll to shared article on mount
  useEffect(() => {
    if (sharedArticleId == null) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-article-id="${sharedArticleId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [sharedArticleId]);

  const filteredAndSortedArticles = useMemo(() => {
    const filtered = filterArticles(articles, filters, bookmarks);
    return sortArticles(filtered, sortOption, upvoteCounts, viewCounts);
  }, [articles, filters, sortOption, bookmarks, upvoteCounts, viewCounts]);

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
          onShareCopied={onShareCopied}
          commentCount={articleCommentCounts?.get(article.id) || 0}
          onOpenDiscussion={onOpenDiscussion ? () => onOpenDiscussion(article.id) : undefined}
          viewCount={viewCounts?.get(article.id) || 0}
        />
      ))}
    </div>
  );
}
