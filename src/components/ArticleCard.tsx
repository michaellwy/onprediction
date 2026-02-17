"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Bookmark, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Article, Category, Difficulty } from "@/types/article";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  upvoteCount: number;
  isUpvoted: boolean;
  onToggleUpvote: () => void;
  index?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const categoryColors: Record<Category, string> = {
  Fundamentals: "bg-[hsl(var(--cat-fundamentals))]",
  Design: "bg-[hsl(var(--cat-design))]",
  Microstructure: "bg-[hsl(var(--cat-microstructure))]",
  Platforms: "bg-[hsl(var(--cat-platforms))]",
  Applications: "bg-[hsl(var(--cat-applications))]",
  Business: "bg-[hsl(var(--cat-business))]",
  Commentary: "bg-[hsl(var(--cat-commentary))]",
};

const difficultyLabels: Record<Difficulty, { label: string; color: string }> = {
  None: { label: "I", color: "text-[hsl(var(--diff-beginner))]" },
  Some: { label: "II", color: "text-[hsl(var(--diff-intermediate))]" },
  Extensive: { label: "III", color: "text-[hsl(var(--diff-advanced))]" },
};

function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays < 30) return `in ${absDays}d`;
    if (absDays < 365) return `${Math.floor(absDays / 30)}mo`;
    return `${Math.floor(absDays / 365)}y`;
  }

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function isNewArticle(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function formatFullDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticleCard({
  article,
  isBookmarked,
  onToggleBookmark,
  upvoteCount,
  isUpvoted,
  onToggleUpvote,
  index = 0,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: ArticleCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded(!internalExpanded));

  const categoryColor = article.primary_category
    ? categoryColors[article.primary_category]
    : "bg-muted-foreground";

  const difficulty = article.difficulty
    ? difficultyLabels[article.difficulty]
    : null;

  return (
    <article
      className="animate-list-item group"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div
        className={cn(
          "relative transition-colors duration-150",
          "hover:bg-accent/30",
          isExpanded && "bg-accent/20"
        )}
      >
        {/* Category bar — always visible on mobile */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] sm:hidden", categoryColor)} />

        {/* Category bar — animated on desktop */}
        <motion.div
          className={cn(
            "absolute left-0 top-0 w-[3px] origin-top hidden sm:block",
            categoryColor
          )}
          initial={false}
          animate={{
            height: isExpanded ? "100%" : "0%",
            opacity: isExpanded ? 1 : 0,
          }}
          whileHover={!isExpanded ? { height: "50%", opacity: 0.5 } : undefined}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Main row */}
        <div
          className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3 px-4 cursor-pointer"
          onClick={toggleExpand}
        >
          {/* Upvote button — desktop only */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleUpvote();
            }}
            className={cn(
              "shrink-0 hidden sm:flex items-center gap-0.5 p-0.5 -m-0.5 rounded transition-colors",
              isUpvoted
                ? "text-emerald-600"
                : upvoteCount > 0
                  ? "text-emerald-600/60 hover:text-emerald-600/80"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote article"}
          >
            <ArrowUp
              className={cn(
                "h-4 w-4 transition-all duration-150",
                isUpvoted && "text-emerald-600"
              )}
            />
            {upvoteCount > 0 && (
              <span className="text-xs tabular-nums min-w-[1ch]">
                {upvoteCount}
              </span>
            )}
          </button>

          {/* Bookmark — desktop only */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className="shrink-0 hidden sm:flex p-0.5 -m-0.5 rounded transition-colors"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
          >
            <Bookmark
              className={cn(
                "h-4 w-4 transition-all duration-150",
                isBookmarked
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
              )}
            />
          </button>

          {/* Category dot — desktop only */}
          <span
            className={cn("hidden sm:block w-2 h-2 rounded-full shrink-0", categoryColor)}
            title={article.primary_category || ""}
          />

          {/* Title + mobile metadata */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-serif text-[15px] sm:text-base leading-snug transition-colors duration-150",
                isExpanded ? "text-foreground" : "text-foreground/90",
                "group-hover:text-foreground"
              )}
            >
              <span className="line-clamp-2 sm:line-clamp-1">
                {article.title}
                {isNewArticle(article.publish_date) && (
                  <>
                    {" "}
                    <span className="inline-block align-middle px-1.5 py-0.5 text-[10px] font-sans font-semibold leading-none rounded-full bg-primary/10 text-primary translate-y-[-1px]">
                      New
                    </span>
                  </>
                )}
              </span>
            </h3>
            {/* Mobile-only: author + date subtitle */}
            <div className="sm:hidden flex items-center gap-1.5 mt-0.5">
              {article.author && (
                <span className="text-[11px] text-foreground/40 truncate">
                  {article.author}
                </span>
              )}
              {article.author && article.publish_date && (
                <span className="text-[11px] text-foreground/25 shrink-0">·</span>
              )}
              {article.publish_date && (
                <span className="text-[11px] text-foreground/40 shrink-0">
                  {formatRelativeDate(article.publish_date)}
                </span>
              )}
              {upvoteCount > 0 && (
                <>
                  <span className="text-[11px] text-foreground/25 shrink-0">·</span>
                  <span className="text-[11px] text-emerald-600/50 shrink-0">
                    {upvoteCount} {upvoteCount === 1 ? "upvote" : "upvotes"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Difficulty indicator — desktop only */}
          {difficulty && (
            <span
              className={cn(
                "hidden sm:block text-xs font-semibold shrink-0",
                difficulty.color
              )}
              title={article.difficulty || ""}
            >
              {difficulty.label}
            </span>
          )}

          {/* Author — desktop only */}
          <span className="hidden md:block text-[14px] text-foreground/55 truncate max-w-[180px] shrink-0">
            {article.author}
          </span>

          {/* Date — desktop only */}
          <span className="hidden sm:block text-[13px] text-foreground/45 w-16 text-right shrink-0 tabular-nums">
            {formatRelativeDate(article.publish_date)}
          </span>

          {/* Expand indicator */}
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground/40 transition-transform duration-150 shrink-0",
              isExpanded && "rotate-90"
            )}
          />
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                exit={{ clipPath: "inset(0 0 100% 0)" }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              >
              <div className="px-4 pb-4 pl-4 sm:pl-14">
                {/* Mobile actions — upvote + bookmark */}
                <div className="flex sm:hidden items-center gap-3 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleUpvote();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors",
                      isUpvoted
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-foreground/[0.05] text-foreground/60 active:bg-foreground/[0.1]"
                    )}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    {isUpvoted ? "Upvoted" : "Upvote"}
                    {upvoteCount > 0 && (
                      <span className="tabular-nums">({upvoteCount})</span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors",
                      isBookmarked
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-foreground/[0.05] text-foreground/60 active:bg-foreground/[0.1]"
                    )}
                  >
                    <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-amber-500")} />
                    {isBookmarked ? "Saved" : "Save"}
                  </button>
                </div>

                {/* Date + source + read link */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground/50 mb-2">
                  {article.publish_date && (
                    <span>{formatFullDate(article.publish_date)}</span>
                  )}
                  {article.publish_date && article.source_type && (
                    <span>·</span>
                  )}
                  {article.source_type && (
                    <span>{article.source_type}</span>
                  )}
                  {article.url && (
                    <>
                      <span>·</span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Read
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </div>

                {/* Blurb - the hero content */}
                {article.editorial_blurb && (
                  <p className="text-[15px] text-foreground/75 leading-relaxed mb-4 max-w-2xl">
                    {article.editorial_blurb}
                  </p>
                )}

                {/* Concepts as compact tags */}
                {article.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {article.concepts.slice(0, 5).map((concept, idx) => {
                      const displayName = concept.replace("NEW: ", "");
                      return (
                        <Link
                          key={`${concept}-${idx}`}
                          href={`/concepts?c=${encodeURIComponent(displayName)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0.5 text-[12px] font-medium text-foreground/60 bg-foreground/[0.06] rounded hover:bg-foreground/[0.12] hover:text-foreground/80 transition-colors"
                        >
                          {displayName}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle divider */}
      <div className="h-px bg-border/40 mx-4" />
    </article>
  );
}
