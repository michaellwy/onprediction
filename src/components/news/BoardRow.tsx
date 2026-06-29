"use client";

import type { NewsStory } from "@/types/news";
import { relativeTime, absoluteTime, hostName } from "@/lib/newsTime";
import { rankedSourcesFor, headlineCase } from "./terminalData";
import { CategoryPill } from "./CategoryPill";
import { cn } from "@/lib/utils";

const MAX_OUTLETS = 3;

interface Props {
  story: NewsStory;
  now: number;
  selected: boolean;
  onSelect: () => void;
}

export function BoardRow({ story, now, selected, onSelect }: Props) {
  // Count the SAME credible-source set the detail panel's Coverage list renders
  // (rankedSourcesFor), so the board's "+N more" always matches what opens.
  const sources = rankedSourcesFor(story);
  const shown = sources.slice(0, MAX_OUTLETS).map((s) => s.outlet || hostName(s.url));
  const extra = Math.max(0, sources.length - shown.length);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "block w-full px-4 py-3.5 text-left transition-colors",
        selected ? "bg-[hsl(var(--nt-ember)/0.07)]" : "hover:bg-[hsl(var(--nt-ink)/0.035)]"
      )}
    >
      <h3
        className={cn(
          "text-[16px] leading-[1.34] tracking-[-0.005em] line-clamp-2",
          selected ? "font-semibold text-[hsl(var(--nt-ink))]" : "font-medium text-[hsl(var(--nt-ink)/0.92)]"
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
      </div>
    </button>
  );
}
