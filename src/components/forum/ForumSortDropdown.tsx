"use client";

import { cn } from "@/lib/utils";
import type { ForumSortOption } from "@/types/forum";

interface ForumSortDropdownProps {
  value: ForumSortOption;
  onChange: (value: ForumSortOption) => void;
}

export function ForumSortDropdown({ value, onChange }: ForumSortDropdownProps) {
  return (
    <div className="flex items-center gap-0.5 text-xs sm:text-sm">
      <button
        onClick={() => onChange("newest")}
        className={cn(
          "px-2.5 py-1 rounded-md font-medium transition-colors",
          value === "newest"
            ? "text-foreground bg-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        )}
      >
        Newest
      </button>
      <button
        onClick={() => onChange("most_upvoted")}
        className={cn(
          "px-2.5 py-1 rounded-md font-medium transition-colors",
          value === "most_upvoted"
            ? "text-foreground bg-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        )}
      >
        Top
      </button>
    </div>
  );
}
