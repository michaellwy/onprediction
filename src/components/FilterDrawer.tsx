"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  FilterState,
  Category,
  Difficulty,
  SourceType,
  DateRange,
} from "@/types/article";
import { FilterSidebar } from "@/components/FilterSidebar";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  filters: FilterState;
  categories: string[];
  sourceTypes: string[];
  onToggleCategory: (category: Category) => void;
  onToggleDifficulty: (difficulty: Difficulty) => void;
  onToggleSourceType: (sourceType: SourceType) => void;
  onSetDateRange: (dateRange: DateRange) => void;
  onToggleBookmarksOnly: () => void;
  onClearAll: () => void;
  activeFilterCount: number;
  isAuthenticated?: boolean;
  onSignInPrompt?: () => void;
}

export function FilterDrawer({
  filters,
  categories,
  sourceTypes,
  onToggleCategory,
  onToggleDifficulty,
  onToggleSourceType,
  onSetDateRange,
  onToggleBookmarksOnly,
  onClearAll,
  activeFilterCount,
  isAuthenticated,
  onSignInPrompt,
}: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-md text-sm transition-colors",
          "text-muted-foreground hover:text-foreground",
          "border border-transparent hover:border-border hover:bg-accent/30",
          activeFilterCount > 0 && "border-border/50"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-[min(280px,calc(100vw-60px))] bg-background border-r border-border z-50 lg:hidden",
          "transform transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-serif text-lg font-medium">Filters</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center w-11 h-11 -mr-2 rounded hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          <FilterSidebar
            filters={filters}
            categories={categories}
            sourceTypes={sourceTypes}
            onToggleCategory={onToggleCategory}
            onToggleDifficulty={onToggleDifficulty}
            onToggleSourceType={onToggleSourceType}
            onSetDateRange={onSetDateRange}
            onToggleBookmarksOnly={onToggleBookmarksOnly}
            onClearAll={onClearAll}
            activeFilterCount={activeFilterCount}
            isAuthenticated={isAuthenticated}
            onSignInPrompt={onSignInPrompt}
          />
        </div>
      </div>
    </>
  );
}
