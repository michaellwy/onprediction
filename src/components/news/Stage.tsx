"use client";

import { ChevronLeft } from "lucide-react";
import type { NewsStory } from "@/types/news";
import { relativeTime, absoluteTime } from "@/lib/newsTime";
import { cleanSummary, summaryParagraphs, headlineCase } from "./terminalData";
import { CategoryPill } from "./CategoryPill";
import { SourceList } from "./SourceList";

interface Props {
  story: NewsStory | undefined;
  now: number;
  onBack: () => void;
}

export function Stage({ story, now, onBack }: Props) {
  if (!story) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-[hsl(var(--nt-ink-faint))]">
          Select a story from the board to read it here.
        </p>
      </div>
    );
  }

  const summary = cleanSummary(story.summary);

  return (
    <article className="mx-auto max-w-[680px] px-6 py-8 sm:px-10 sm:py-12">
      {/* mobile-only return to the board */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 -ml-1 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--nt-ink-dim))] transition-colors hover:text-[hsl(var(--nt-ink))] lg:hidden"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Board
      </button>

      {/* kicker: category pill · time */}
      <div className="flex items-center gap-3">
        <CategoryPill category={story.primary_category} />
        {now > 0 && (
          <time className="nt-num text-[12px] font-medium text-[hsl(var(--nt-ink-faint))]" title={absoluteTime(story.published_at)}>
            {relativeTime(story.published_at, now)} ago
          </time>
        )}
      </div>

      {/* hero headline — the one serif moment, kept restrained */}
      <h1 className="mt-4 font-serif text-[clamp(22px,2.4vw,29px)] font-bold leading-[1.14] tracking-[-0.015em] text-[hsl(var(--nt-ink))]">
        {headlineCase(story.headline)}
      </h1>

      {summary && (
        <div className="mt-4 max-w-[600px] space-y-4 text-[17px] leading-[1.62] text-[hsl(var(--nt-ink)/0.82)]">
          {summaryParagraphs(summary).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <SourceList story={story} now={now} />
    </article>
  );
}
