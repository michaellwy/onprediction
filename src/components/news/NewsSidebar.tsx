"use client";

import { Search, X } from "lucide-react";
import { NEWS_CATEGORIES, NEWS_BEAT_HSL } from "@/types/news";
import type { NewsCategory } from "@/types/news";
import type { NewsFacet } from "@/hooks/useNews";
import { cn } from "@/lib/utils";

// Deterministic muted square color for any platform name (auto-grows cleanly).
const PLATFORM_HUES = [212, 150, 35, 268, 350, 25, 190, 120, 300, 50];
function platformHsl(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `${PLATFORM_HUES[h % PLATFORM_HUES.length]} 45% 48%`;
}

interface Props {
  query: string;
  onQuery: (v: string) => void;
  category: NewsCategory | null;
  onCategory: (c: NewsCategory | null) => void;
  categories: NewsFacet[];
  platform: string | null;
  onPlatform: (p: string | null) => void;
  platforms: NewsFacet[];
  total: number;
  className?: string;
}

function Row({
  active, onClick, dot, label, count, dim, square,
}: {
  active: boolean; onClick: () => void; dot?: string; label: string; count?: number; dim?: boolean; square?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60"
      )}
    >
      {dot ? (
        <span
          className={cn("h-2.5 w-2.5 shrink-0", square ? "rounded-[3px]" : "rounded-full")}
          style={{ backgroundColor: `hsl(${dot})` }}
        />
      ) : (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground/40" />
      )}
      <span
        className={cn(
          "flex-1 truncate text-[14px] transition-colors",
          active ? "font-medium text-foreground" : dim ? "text-muted-foreground/55" : "text-foreground/75 group-hover:text-foreground"
        )}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className={cn("text-[12px] tabular-nums", active ? "text-foreground/70" : "text-muted-foreground/50")}>{count}</span>
      )}
    </button>
  );
}

export function NewsSidebar({
  query, onQuery, category, onCategory, categories, platform, onPlatform, platforms, total, className,
}: Props) {
  const catCount = (c: string) => categories.find((x) => x.value === c)?.count ?? 0;

  return (
    <aside className={cn("flex flex-col gap-7", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search headlines, platforms…"
          className="w-full rounded-lg border border-border/70 bg-card/60 py-2.5 pl-9 pr-8 text-[14px] text-foreground placeholder:text-muted-foreground/50 transition-shadow focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        {query && (
          <button onClick={() => onQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground" aria-label="Clear">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Category</h3>
        <div className="space-y-0.5">
          <Row active={category === null} onClick={() => onCategory(null)} label="All stories" count={total} />
          {NEWS_CATEGORIES.map((c) => {
            const n = catCount(c);
            return (
              <Row
                key={c}
                active={category === c}
                onClick={() => onCategory(category === c ? null : c)}
                dot={NEWS_BEAT_HSL[c]}
                label={c}
                count={n}
                dim={n === 0}
              />
            );
          })}
        </div>
      </div>

      {/* Platform */}
      {platforms.length > 0 && (
        <div>
          <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Platform</h3>
          <div className="space-y-0.5">
            <Row active={platform === null} onClick={() => onPlatform(null)} label="All platforms" />
            {platforms.slice(0, 14).map((p) => (
              <Row
                key={p.value}
                active={platform === p.value}
                onClick={() => onPlatform(platform === p.value ? null : p.value)}
                dot={platformHsl(p.value)}
                square
                label={p.value}
                count={p.count}
              />
            ))}
          </div>
        </div>
      )}

      {/* Feed status */}
      <div className="mt-auto px-2 pt-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <span className="text-[13px] font-medium text-foreground/80">Live feed</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/60">
          AI-scraped, scored and clustered from across the press, updated daily.
        </p>
      </div>
    </aside>
  );
}
