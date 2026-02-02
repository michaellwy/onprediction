"use client";

import { useState } from "react";
import { Search, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import {
  getArticles,
  getUniqueCategories,
  getUniqueSourceTypes,
} from "@/lib/articles";
import { getActiveFilterCount, filterArticles } from "@/lib/filters";
import { useFilters } from "@/hooks/useFilters";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ArticleList } from "@/components/ArticleList";
import { FilterSidebar } from "@/components/FilterSidebar";
import { FilterDrawer } from "@/components/FilterDrawer";
import { SortDropdown } from "@/components/SortDropdown";
import { cn } from "@/lib/utils";

const articles = getArticles();
const categories = getUniqueCategories();
const sourceTypes = getUniqueSourceTypes();

export default function Home() {
  const {
    filters,
    sortOption,
    setSortOption,
    toggleCategory,
    toggleDifficulty,
    toggleSourceType,
    setDateRange,
    toggleBookmarksOnly,
    setSearchQuery,
    clearAllFilters,
  } = useFilters();

  const { bookmarks, isLoaded, toggleBookmark } = useBookmarks();
  const activeFilterCount = getActiveFilterCount(filters);
  const filteredCount = isLoaded
    ? filterArticles(articles, filters, bookmarks).length
    : articles.length;
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandResetKey, setExpandResetKey] = useState(0);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-background overflow-hidden">
      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-56 shrink-0 py-6 overflow-y-auto pr-2 scrollbar-subtle">
              <FilterSidebar
                filters={filters}
                categories={categories}
                sourceTypes={sourceTypes}
                onToggleCategory={toggleCategory}
                onToggleDifficulty={toggleDifficulty}
                onToggleSourceType={toggleSourceType}
                onSetDateRange={setDateRange}
                onToggleBookmarksOnly={toggleBookmarksOnly}
                onClearAll={clearAllFilters}
                activeFilterCount={activeFilterCount}
              />
          </aside>

          {/* Article list */}
          <div className="flex-1 min-w-0 flex flex-col py-6 overflow-hidden">
            {/* Controls */}
            <div className="shrink-0 flex items-center gap-3 pb-4 border-b border-border/50">
              {/* Mobile filter button */}
              <div className="lg:hidden">
                <FilterDrawer
                  filters={filters}
                  categories={categories}
                  sourceTypes={sourceTypes}
                  onToggleCategory={toggleCategory}
                  onToggleDifficulty={toggleDifficulty}
                  onToggleSourceType={toggleSourceType}
                  onSetDateRange={setDateRange}
                  onToggleBookmarksOnly={toggleBookmarksOnly}
                  onClearAll={clearAllFilters}
                  activeFilterCount={activeFilterCount}
                />
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search titles, authors, concepts..."
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full h-9 pl-9 pr-4 rounded-md text-sm",
                    "bg-transparent border border-border/50",
                    "placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:border-border focus:ring-1 focus:ring-border/50",
                    "transition-colors"
                  )}
                />
              </div>

              {/* Count, Expand/Collapse, and Sort */}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {filteredCount} {filteredCount === 1 ? "reading" : "readings"}
                </span>
                <button
                  onClick={() => {
                    setAllExpanded(!allExpanded);
                    setExpandResetKey((k) => k + 1);
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title={allExpanded ? "Collapse all" : "Expand all"}
                >
                  {allExpanded ? (
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{allExpanded ? "Collapse" : "Expand"}</span>
                </button>
                <SortDropdown value={sortOption} onChange={setSortOption} />
              </div>
            </div>

            {/* Articles */}
            <div className="flex-1 overflow-y-auto mt-4">
              {isLoaded && (
                <ArticleList
                  articles={articles}
                  filters={filters}
                  sortOption={sortOption}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                  allExpanded={allExpanded}
                  expandResetKey={expandResetKey}
                />
              )}

              {/* Footer */}
              <footer className="border-t border-border/30 mt-16">
                <div className="py-8">
                  <p className="text-xs text-muted-foreground/60 text-center">
                    The best content for prediction market builders and researchers.
                  </p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
