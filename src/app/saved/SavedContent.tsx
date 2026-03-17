"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { getArticles } from "@/lib/articles";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useUpvotes } from "@/hooks/useUpvotes";
import { ArticleCard } from "@/components/ArticleCard";

const allArticles = getArticles();

export function SavedContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { bookmarks, isLoaded, toggleBookmark } = useBookmarks();
  const { counts: upvoteCounts, userUpvotes, toggleUpvote } = useUpvotes();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const handleToggleUpvote = useCallback(
    (articleId: number) => {
      if (!user) return;
      toggleUpvote(articleId);
    },
    [user, toggleUpvote]
  );

  if (isLoading || !user) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      </div>
    );
  }

  const bookmarkedArticles = allArticles.filter((a) => bookmarks.has(a.id));

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-background overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col py-6 overflow-hidden">
          <div className="shrink-0 pb-4 border-b border-border/50">
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Bookmarks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {bookmarkedArticles.length}{" "}
              {bookmarkedArticles.length === 1 ? "article" : "articles"} bookmarked
            </p>
          </div>

          <div className="flex-1 overflow-y-auto mt-4">
            {isLoaded && bookmarkedArticles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bookmark className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <h3 className="font-serif text-lg text-foreground mb-2">
                  No bookmarks yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click the bookmark icon on any article to save it here for later.
                </p>
              </div>
            )}

            {isLoaded && bookmarkedArticles.length > 0 && (
              <div className="divide-y-0">
                {bookmarkedArticles.map((article, index) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isBookmarked={true}
                    onToggleBookmark={() => toggleBookmark(article.id)}
                    upvoteCount={upvoteCounts.get(article.id) || 0}
                    isUpvoted={userUpvotes.has(article.id)}
                    onToggleUpvote={() => handleToggleUpvote(article.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
