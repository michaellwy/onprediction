"use client";

import { Search, X, BarChart3 } from "lucide-react";
import type { NewsCategory } from "@/types/news";
import { CategoryDropdown } from "./CategoryDropdown";
import { FeedPopover } from "./FeedPopover";
import { cn } from "@/lib/utils";

interface Props {
  commandText: string;
  onCommandText: (v: string) => void;
  activeLens: NewsCategory | null;
  onLens: (c: NewsCategory | null) => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
}

export function BoardControls({
  commandText, onCommandText, activeLens, onLens, timelineOpen, onToggleTimeline,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
      {/* search (compact) */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={commandText}
          onChange={(e) => onCommandText(e.target.value)}
          placeholder="Search stories"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        {commandText && (
          <button
            onClick={() => onCommandText("")}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <CategoryDropdown activeLens={activeLens} onLens={onLens} />
      <button
        onClick={onToggleTimeline}
        aria-label="Toggle date timeline"
        aria-pressed={timelineOpen}
        title="Jump to a date"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
          timelineOpen
            ? "border-border bg-accent/50 text-foreground"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <BarChart3 className="h-4 w-4" strokeWidth={2} />
      </button>
      <FeedPopover />
    </div>
  );
}
