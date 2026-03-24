"use client";

import { cn } from "@/lib/utils";
import type { DiscussionTab } from "@/types/forum";

interface DiscussionTabsProps {
  value: DiscussionTab;
  onChange: (tab: DiscussionTab) => void;
}

export function DiscussionTabs({ value, onChange }: DiscussionTabsProps) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg bg-accent/40 w-fit">
      <button
        onClick={() => onChange("recent")}
        className={cn(
          "px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
          value === "recent"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Recent Activity
      </button>
      <button
        onClick={() => onChange("general")}
        className={cn(
          "px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
          value === "general"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        General Posts
      </button>
    </div>
  );
}
