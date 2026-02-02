"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ExternalLink, Star } from "lucide-react";
import { Article, Category, Difficulty } from "@/types/article";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
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
        {/* Category indicator line */}
        <motion.div
          className={cn(
            "absolute left-0 top-0 w-[3px] origin-top",
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
          className="flex items-center gap-4 py-3 px-4 cursor-pointer"
          onClick={toggleExpand}
        >
          {/* Bookmark star */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className="shrink-0 p-0.5 -m-0.5 rounded transition-colors"
            aria-label={isBookmarked ? "Remove from saved" : "Save article"}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-all duration-150",
                isBookmarked
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
              )}
            />
          </button>

          {/* Category dot */}
          <span
            className={cn("w-2 h-2 rounded-full shrink-0", categoryColor)}
            title={article.primary_category || ""}
          />

          {/* Title */}
          <h3
            className={cn(
              "flex-1 min-w-0 font-serif text-base leading-snug transition-colors duration-150",
              isExpanded ? "text-foreground" : "text-foreground/90",
              "group-hover:text-foreground"
            )}
          >
            <span className="line-clamp-1">{article.title}</span>
          </h3>

          {/* Difficulty indicator */}
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

          {/* Author */}
          <span className="hidden md:block text-[14px] text-foreground/55 truncate max-w-[180px] shrink-0">
            {article.author}
          </span>

          {/* Date */}
          <span className="text-[13px] text-foreground/45 w-16 text-right shrink-0 tabular-nums">
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
              <div className="px-4 pb-4 pl-14">
                {/* Date + source + read link */}
                <div className="flex items-center gap-2 text-[13px] text-foreground/50 mb-2">
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
                    {article.concepts.slice(0, 5).map((concept, idx) => (
                      <span
                        key={`${concept}-${idx}`}
                        className="px-2 py-0.5 text-[12px] font-medium text-foreground/60 bg-foreground/[0.06] rounded"
                      >
                        {concept.replace("NEW: ", "")}
                      </span>
                    ))}
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
