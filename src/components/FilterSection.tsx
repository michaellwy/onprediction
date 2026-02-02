"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}

export function FilterSection({
  title,
  children,
  defaultOpen = true,
  count = 0,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60 group-hover:text-foreground transition-colors">
          {title}
          <span className={cn(
            "ml-2 text-[10px] font-semibold text-primary transition-opacity",
            count > 0 ? "opacity-100" : "opacity-0"
          )}>
            ({count || 0})
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-foreground/40 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div className={cn("collapse-content", isOpen && "open")}>
        <div>
          <div className="pb-4 space-y-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}
