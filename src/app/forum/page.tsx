"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PenLine, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumPosts } from "@/hooks/useForumPosts";
import { useForumPostUpvotes } from "@/hooks/useForumPostUpvotes";
import { ForumPostCard } from "@/components/forum/ForumPostCard";
import { ForumSortDropdown } from "@/components/forum/ForumSortDropdown";
import { ForumEmptyState } from "@/components/forum/ForumEmptyState";
import type { ForumSortOption } from "@/types/forum";

export default function ForumPage() {
  const { user, openSignInModal } = useAuth();
  const [sort, setSort] = useState<ForumSortOption>("newest");
  const { posts, isLoading, hasMore, loadMore, commentCounts } = useForumPosts(sort);
  const { counts: upvoteCounts, userUpvotes, toggleUpvote } = useForumPostUpvotes();

  // Sort posts client-side for "most_upvoted"
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
            Forum
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            A space for prediction market practitioners
          </p>
        </div>
        {user ? (
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
        )}
      </motion.div>

      {/* Sort controls */}
      {posts.length > 0 && (
        <div className="mb-3">
          <ForumSortDropdown value={sort} onChange={setSort} />
        </div>
      )}

      {/* Post list */}
      {isLoading && posts.length === 0 ? (
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
              onToggleUpvote={() => toggleUpvote(post.id)}
              commentCount={commentCounts.get(post.id) || 0}
              index={index}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-8">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="h-9 px-6 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
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
    </div>
  );
}
