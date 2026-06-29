"use client";

import type { NewsCategory } from "@/types/news";
import { NEWS_BEAT_HSL } from "@/types/news";
import { cn } from "@/lib/utils";

// Category as a filled pill in its beat hue (constant across themes).
export function CategoryPill({ category, className }: { category: NewsCategory | null; className?: string }) {
  if (!category) return null;
  const hue = NEWS_BEAT_HSL[category]; // e.g. "var(--news-regulation)"
  return (
    <span
      style={{ color: `hsl(${hue})`, backgroundColor: `hsl(${hue} / 0.13)` }}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.07em]",
        className
      )}
    >
      {category}
    </span>
  );
}
