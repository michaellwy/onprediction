"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  className?: string;
  compact?: boolean;
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  className,
  compact = false,
}: BookmarkButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "rounded transition-colors hover:bg-muted",
        compact ? "p-1" : "p-2",
        className
      )}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Star
        className={cn(
          "transition-colors",
          compact ? "h-4 w-4" : "h-5 w-5",
          isBookmarked
            ? "fill-amber-500 text-amber-500"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      />
    </button>
  );
}
