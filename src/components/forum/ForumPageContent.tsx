"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PenLine, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumPosts } from "@/hooks/useForumPosts";
import { useForumPostUpvotes } from "@/hooks/useForumPostUpvotes";
import { useRecentDiscussions } from "@/hooks/useRecentDiscussions";
import { ForumPostCard } from "@/components/forum/ForumPostCard";
import { DiscussionFeedCard } from "@/components/forum/DiscussionFeedCard";
import { DiscussionTabs } from "@/components/forum/DiscussionTabs";
import { ForumSortDropdown } from "@/components/forum/ForumSortDropdown";
import { ForumEmptyState } from "@/components/forum/ForumEmptyState";
import type { ForumSortOption, DiscussionTab } from "@/types/forum";

export function ForumPageContent() {
  const { user, openSignInModal } = useAuth();
  const [tab, setTab] = useState<DiscussionTab>("recent");
  const [sort, setSort] = useState<ForumSortOption>("newest");

  // Recent Activity tab data
  const {
    items: recentItems,
    isLoading: recentLoading,
    hasMore: recentHasMore,
    loadMore: recentLoadMore,
  } = useRecentDiscussions();

  // General Posts tab data (only standalone posts)
  const { posts, isLoading: postsLoading, hasMore: postsHasMore, loadMore: postsLoadMore, commentCounts } =
    useForumPosts(sort, true);
  const { counts: upvoteCounts, userUpvotes, toggleUpvote } = useForumPostUpvotes();

  const sortedPosts = sort === "most_upvoted"
    ? [...posts].sort((a, b) => (upvoteCounts.get(b.id) || 0) - (upvoteCounts.get(a.id) || 0))
    : posts;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-foreground">
            Discussions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Talk about prediction market articles and ideas
          </p>
        </div>
        {tab === "general" && (
          user ? (
            <Link
              href="/forum/new"
              className="shrink-0 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          ) : (
            <button
              onClick={openSignInModal}
              className="shrink-0 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">New Post</span>
            </button>
          )
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-3">
        <DiscussionTabs value={tab} onChange={setTab} />
        {tab === "general" && posts.length > 0 && (
          <ForumSortDropdown value={sort} onChange={setSort} />
        )}
      </div>

      {/* Recent Activity Tab */}
      {tab === "recent" && (
        <>
          {recentLoading && recentItems.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <p className="text-sm text-muted-foreground max-w-sm">
                No discussions yet. Open any article and click &ldquo;Discuss&rdquo; to start a conversation.
              </p>
            </div>
          ) : (
            <div>
              {recentItems.map((item, index) => (
                <DiscussionFeedCard key={item.post_id} item={item} index={index} />
              ))}
              {recentHasMore && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={recentLoadMore}
                    disabled={recentLoading}
                    className="h-9 px-6 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {recentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* General Posts Tab */}
      {tab === "general" && (
        <>
          {postsLoading && posts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <ForumEmptyState />
          ) : (
            <div>
              {sortedPosts.map((post, index) => (
                <ForumPostCard
                  key={post.id}
                  post={post}
                  upvoteCount={upvoteCounts.get(post.id) || 0}
                  isUpvoted={userUpvotes.has(post.id)}
                  onToggleUpvote={() => { if (!user) { openSignInModal(); return; } toggleUpvote(post.id); }}
                  commentCount={commentCounts.get(post.id) || 0}
                  index={index}
                />
              ))}
              {postsHasMore && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={postsLoadMore}
                    disabled={postsLoading}
                    className="h-9 px-6 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {postsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
