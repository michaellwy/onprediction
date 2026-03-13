"use client";

import Link from "next/link";
import { ArrowUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForumPost } from "@/types/forum";

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

interface ForumPostCardProps {
  post: ForumPost;
  upvoteCount: number;
  isUpvoted: boolean;
  onToggleUpvote: () => void;
  commentCount: number;
  index?: number;
}

export function ForumPostCard({
  post,
  upvoteCount,
  isUpvoted,
  onToggleUpvote,
  commentCount,
  index = 0,
}: ForumPostCardProps) {
  return (
    <article
      className="animate-list-item"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div className="flex gap-2.5 sm:gap-3 py-3 px-3 sm:px-4 hover:bg-accent/30 transition-colors duration-150 group">
        {/* Upvote column */}
        <div className="shrink-0 flex flex-col items-center pt-0.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleUpvote();
            }}
            className={cn(
              "flex flex-col items-center gap-0 p-1 -m-1 rounded transition-colors",
              isUpvoted
                ? "text-emerald-600"
                : upvoteCount > 0
                  ? "text-emerald-600/60 hover:text-emerald-600/80"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote post"}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            {upvoteCount > 0 && (
              <span className="text-[11px] tabular-nums leading-none">{upvoteCount}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/forum/post?id=${post.id}`} className="block">
            <h3 className="font-sans text-[15px] sm:text-base font-semibold text-foreground leading-tight group-hover:text-primary/90 transition-colors">
              {post.title}
            </h3>
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0 mt-0.5 text-[11px] sm:text-[12px] text-muted-foreground">
              <span>{post.author_name}</span>
              <span className="text-foreground/25">·</span>
              <span>{formatRelativeDate(post.created_at)}</span>
              {commentCount > 0 && (
                <>
                  <span className="text-foreground/25">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {commentCount}
                  </span>
                </>
              )}
            </div>
            <p className="font-sans text-foreground/60 text-[13px] sm:text-[14px] leading-snug mt-1 line-clamp-2">
              {post.body.replace(/[#*_`~\[\]()>]/g, "").slice(0, 200)}
            </p>
          </Link>
        </div>

      </div>
      <div className="h-px bg-border/40 mx-3 sm:mx-4" />
    </article>
  );
}
