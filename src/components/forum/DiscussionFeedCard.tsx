"use client";

import Link from "next/link";
import { MessageSquare, FileText } from "lucide-react";
import type { DiscussionFeedItem } from "@/types/forum";

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

interface DiscussionFeedCardProps {
  item: DiscussionFeedItem;
  index?: number;
}

export function DiscussionFeedCard({ item, index = 0 }: DiscussionFeedCardProps) {
  return (
    <article
      className="animate-list-item"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <Link
        href={`/forum/post?id=${item.post_id}`}
        className="flex gap-2.5 sm:gap-3 py-3 px-3 sm:px-4 hover:bg-accent/30 transition-colors duration-150 group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {item.article_id !== null && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                <FileText className="h-2.5 w-2.5" />
                Article
              </span>
            )}
            <h3 className="font-sans text-[15px] sm:text-base font-semibold text-foreground leading-tight group-hover:text-primary/90 transition-colors truncate">
              {item.title}
            </h3>
          </div>
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0 text-[11px] sm:text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {item.comment_count} {item.comment_count === 1 ? "response" : "responses"}
            </span>
            <span className="text-foreground/25">·</span>
            <span>
              last by {item.last_commenter_name || "someone"}
            </span>
            <span className="text-foreground/25">·</span>
            <span>{formatRelativeDate(item.last_activity)}</span>
          </div>
        </div>
      </Link>
      <div className="h-px bg-border/40 mx-3 sm:mx-4" />
    </article>
  );
}
