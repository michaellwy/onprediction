"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

// Animated checkmark that draws itself
function AnimatedCheck({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        exit={{ pathLength: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
import {
  FilterState,
  Category,
  Difficulty,
  SourceType,
  DateRange,
} from "@/types/article";
import { FilterSection } from "@/components/FilterSection";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
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
  className?: string;
}

const difficulties: Difficulty[] = ["None", "Some", "Extensive"];
const dateRanges: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "year", label: "Past year" },
  { value: "6months", label: "Past 6 months" },
  { value: "month", label: "Past month" },
];

const categoryColors: Record<string, string> = {
  Fundamentals: "bg-[hsl(var(--cat-fundamentals))]",
  Design: "bg-[hsl(var(--cat-design))]",
  Microstructure: "bg-[hsl(var(--cat-microstructure))]",
  Platforms: "bg-[hsl(var(--cat-platforms))]",
  Applications: "bg-[hsl(var(--cat-applications))]",
  Business: "bg-[hsl(var(--cat-business))]",
  Commentary: "bg-[hsl(var(--cat-commentary))]",
};

const categoryDescriptions: Record<string, string> = {
  Fundamentals: "Theory, introductions, game theory, epistemics, forecasting methodology, wisdom of crowds",
  Design: "Mechanisms, oracles, scoring rules, resolution systems, primitives, infrastructure",
  Microstructure: "Liquidity, market making, adverse selection, arbitrage, pricing, order flow",
  Platforms: "Specific platforms, comparisons, case studies, platform disputes, implementation details",
  Applications: "Use cases, verticals, futarchy, info finance, decision markets, social integration",
  Business: "Business models, funding, adoption, GTM, competition, trends, market sizing",
  Commentary: "Opinion, critique, ethics, societal impact, speculation, philosophy",
};

const difficultyConfig: Record<Difficulty, { color: string; bgColor: string; numeral: string; description: string }> = {
  None: { color: "text-[hsl(var(--diff-beginner))]", bgColor: "bg-[hsl(var(--diff-beginner))]", numeral: "I", description: "No prior knowledge needed" },
  Some: { color: "text-[hsl(var(--diff-intermediate))]", bgColor: "bg-[hsl(var(--diff-intermediate))]", numeral: "II", description: "Basic familiarity helpful" },
  Extensive: { color: "text-[hsl(var(--diff-advanced))]", bgColor: "bg-[hsl(var(--diff-advanced))]", numeral: "III", description: "Background in topic assumed" },
};

export function FilterSidebar({
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
  className,
}: FilterSidebarProps) {
  return (
    <aside className={cn("space-y-1", className)}>
      {/* Bookmarks Toggle */}
      <div className="py-3 border-b border-border/50">
        <button
          type="button"
          onClick={onToggleBookmarksOnly}
          className="w-full flex items-center gap-3 cursor-pointer group text-left"
        >
          <div
            className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150",
              filters.bookmarksOnly
                ? "bg-amber-500"
                : "bg-amber-500/40 group-hover:bg-amber-500/60"
            )}
          >
            <AnimatePresence>
              {filters.bookmarksOnly && (
                <AnimatedCheck className="w-2.5 h-2.5 text-white" />
              )}
            </AnimatePresence>
          </div>
          <span className={cn(
            "text-[15px] transition-colors",
            filters.bookmarksOnly ? "text-foreground font-medium" : "text-foreground/70 group-hover:text-foreground"
          )}>
            Saved only
          </span>
        </button>
      </div>

      {/* Clear Filters */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border/50 overflow-hidden"
          >
            <button
              type="button"
              onClick={onClearAll}
              className="w-full flex items-center gap-2 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear all filters ({activeFilterCount})</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter */}
      <FilterSection
        title="Category"
        count={filters.categories.length}
        defaultOpen={true}
      >
        {categories.map((category) => (
          <FilterCheckbox
            key={category}
            label={category}
            checked={filters.categories.includes(category as Category)}
            onChange={() => onToggleCategory(category as Category)}
            colorIndicator={categoryColors[category]}
            tooltip={categoryDescriptions[category]}
          />
        ))}
      </FilterSection>

      {/* Prerequisites Filter */}
      <FilterSection
        title="Prerequisites"
        count={filters.difficulties.length}
        defaultOpen={true}
      >
        {difficulties.map((difficulty) => (
          <DifficultyCheckbox
            key={difficulty}
            difficulty={difficulty}
            checked={filters.difficulties.includes(difficulty)}
            onChange={() => onToggleDifficulty(difficulty)}
          />
        ))}
      </FilterSection>

      {/* Source Type Filter */}
      <FilterSection
        title="Source"
        count={filters.sourceTypes.length}
        defaultOpen={false}
      >
        {sourceTypes.map((sourceType) => (
          <FilterCheckbox
            key={sourceType}
            label={sourceType}
            checked={filters.sourceTypes.includes(sourceType as SourceType)}
            onChange={() => onToggleSourceType(sourceType as SourceType)}
          />
        ))}
      </FilterSection>

      {/* Date Range Filter */}
      <FilterSection
        title="Published"
        count={filters.dateRange !== "all" ? 1 : 0}
        defaultOpen={false}
      >
        <div className="space-y-0.5">
          {dateRanges.map((range) => (
            <button
              type="button"
              key={range.value}
              onClick={() => onSetDateRange(range.value)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded text-[15px] transition-colors",
                filters.dateRange === range.value
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>
    </aside>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  colorIndicator,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  colorIndicator?: string;
  tooltip?: string;
}) {
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const showTooltip = () => {
    if (buttonRef.current && tooltip) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  };

  const hideTooltip = () => {
    setTooltipPos(null);
  };

  return (
    <div
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onChange}
        className="w-full flex items-center gap-3 cursor-pointer group py-1.5 px-1 -mx-1 rounded hover:bg-muted/50 transition-colors text-left"
      >
        {colorIndicator ? (
          <div
            className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-opacity duration-150",
              colorIndicator,
              !checked && "opacity-50 group-hover:opacity-70"
            )}
          >
            <AnimatePresence>
              {checked && (
                <AnimatedCheck className="w-2.5 h-2.5 text-white" />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div
            className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150",
              checked
                ? "bg-primary"
                : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
            )}
          >
            <AnimatePresence>
              {checked && (
                <AnimatedCheck className="w-2.5 h-2.5 text-white" />
              )}
            </AnimatePresence>
          </div>
        )}
        <span
          className={cn(
            "text-[15px] transition-colors",
            checked ? "text-foreground font-medium" : "text-foreground/70 group-hover:text-foreground"
          )}
        >
          {label}
        </span>
      </button>
      {tooltip && tooltipPos && createPortal(
        <div
          className="fixed px-3 py-2 bg-foreground text-background text-xs rounded-lg shadow-xl z-[9999] w-56 leading-relaxed pointer-events-none"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-foreground" />
          {tooltip}
        </div>,
        document.body
      )}
    </div>
  );
}

function DifficultyCheckbox({
  difficulty,
  checked,
  onChange,
}: {
  difficulty: Difficulty;
  checked: boolean;
  onChange: () => void;
}) {
  const config = difficultyConfig[difficulty];

  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-3 cursor-pointer group py-1.5 px-1 -mx-1 rounded hover:bg-muted/50 transition-colors text-left"
    >
      <div
        className={cn(
          "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-opacity duration-150",
          config.bgColor,
          !checked && "opacity-50 group-hover:opacity-70"
        )}
      >
        <AnimatePresence mode="wait">
          {checked ? (
            <AnimatedCheck className="w-2.5 h-2.5 text-white" />
          ) : (
            <motion.span
              key="numeral"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[8px] font-bold text-white"
            >
              {config.numeral}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span
        className={cn(
          "text-[15px] transition-colors",
          checked ? "text-foreground font-medium" : "text-foreground/70 group-hover:text-foreground"
        )}
      >
        {difficulty}
      </span>
    </button>
  );
}
