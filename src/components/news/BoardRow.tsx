"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { NewsStory } from "@/types/news";
import { relativeTime, absoluteTime, hostName } from "@/lib/newsTime";
import { rankedSourcesFor, headlineCase, cleanSummary, summaryParagraphs } from "./terminalData";
import { CategoryPill } from "./CategoryPill";
import { SourceList } from "./SourceList";
import { cn } from "@/lib/utils";

const MAX_OUTLETS = 3;

interface Props {
  story: NewsStory;
  now: number;
  /** Desktop: this row drives the Stage panel. */
  selected: boolean;
  /** Mobile: this row's inline detail is folded open (accordion). */
  expanded: boolean;
  onSelect: () => void;
}

export function BoardRow({ story, now, selected, expanded, onSelect }: Props) {
  // Count the SAME credible-source set the detail panel's Coverage list renders
  // (rankedSourcesFor), so the board's "+N more" always matches what opens.
  const sources = rankedSourcesFor(story);
  const shown = sources.slice(0, MAX_OUTLETS).map((s) => s.outlet || hostName(s.url));
  const extra = Math.max(0, sources.length - shown.length);
  const summary = cleanSummary(story.summary);

  return (
    <div
      className={cn(
        "transition-colors",
        // Mobile: tint the row that's folded open. Desktop: tint the selected row.
        expanded && "bg-[hsl(var(--nt-ember)/0.045)]",
        selected && "lg:bg-[hsl(var(--nt-ember)/0.045)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        aria-expanded={expanded}
        className={cn(
          "block w-full px-4 py-3.5 text-left transition-colors",
          !expanded && !selected && "hover:bg-[hsl(var(--nt-ink)/0.035)]"
        )}
      >
        <h3
          className={cn(
            "text-[16px] leading-[1.34] tracking-[-0.005em] line-clamp-2",
            selected || expanded ? "font-semibold text-[hsl(var(--nt-ink))]" : "font-medium text-[hsl(var(--nt-ink)/0.92)]"
          )}
        >
          {headlineCase(story.headline)}
        </h3>

        <div className="mt-1.5 flex items-center gap-2">
          <CategoryPill category={story.primary_category} />
          {shown.length > 0 && (
            <p className="min-w-0 truncate text-[12.5px] text-[hsl(var(--nt-ink-dim))]">
              {shown.join(", ")}
              {extra > 0 && <span className="text-[hsl(var(--nt-ink-faint))]"> +{extra} more</span>}
            </p>
          )}
          {now > 0 && (
            <time
              dateTime={story.published_at}
              title={absoluteTime(story.published_at)}
              className="nt-num ml-auto shrink-0 pl-2 text-[11.5px] font-medium text-[hsl(var(--nt-ink-faint))]"
            >
              {relativeTime(story.published_at, now)}
            </time>
          )}
          {/* Fold affordance — mobile only (desktop uses the Stage panel). */}
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[hsl(var(--nt-ink-faint))] transition-transform duration-200 lg:hidden",
              expanded && "rotate-90"
            )}
            aria-hidden
          />
        </div>
      </button>

      {/* Mobile accordion detail — the same content the desktop Stage shows,
          folded inline so a tap never leaves the list. Hidden at lg (Stage takes over). */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <motion.div
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="px-4 pb-5"
            >
              {summary && (
                <div className="space-y-3 text-[15px] leading-[1.6] text-[hsl(var(--nt-ink)/0.82)]">
                  {summaryParagraphs(summary).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
              <SourceList story={story} now={now} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
