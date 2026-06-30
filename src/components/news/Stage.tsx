"use client";

import { useState } from "react";
import { ChevronLeft, Link2, Check } from "lucide-react";
import type { NewsStory } from "@/types/news";
import { relativeAgo, fullTimestamp, absoluteTime } from "@/lib/newsTime";
import { cleanSummary, summaryParagraphs, headlineCase } from "./terminalData";
import { CategoryPill } from "./CategoryPill";
import { SourceList } from "./SourceList";

interface Props {
  story: NewsStory | undefined;
  now: number;
  onBack?: () => void;
}

// Direct, shareable URL that deep-links the news terminal to a single story.
export function storyShareUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://onprediction.xyz";
  return `${origin}/news?story=${encodeURIComponent(slug)}`;
}

export function Stage({ story, now, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (!story) return;
    const url = storyShareUrl(story.slug);
    const title = headlineCase(story.headline);
    // Native share sheet on mobile; clipboard copy everywhere else.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — no-op
    }
  }

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

      {/* kicker: category pill · time · share */}
      <div className="flex items-center gap-3">
        <CategoryPill category={story.primary_category} />
        {now > 0 && (
          <time className="nt-num text-[12px] font-medium text-[hsl(var(--nt-ink-faint))]" title={absoluteTime(story.published_at)}>
            <span className="text-[hsl(var(--nt-ink-dim))]">{relativeAgo(story.published_at, now)}</span>
            <span className="px-1.5 text-[hsl(var(--nt-ink-faint))]">·</span>
            {fullTimestamp(story.published_at)}
          </time>
        )}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Copy a direct link to this story"
          title="Copy link to this story"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[hsl(var(--nt-hairline))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--nt-ink-dim))] transition-colors hover:border-[hsl(var(--nt-ember)/0.5)] hover:text-[hsl(var(--nt-ember))]"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Share"}
        </button>
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

      <SourceList story={story} />
    </article>
  );
}
