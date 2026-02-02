"use client";

import { useState, useCallback } from "react";
import {
  FilterState,
  SortOption,
  Category,
  Difficulty,
  SourceType,
  DateRange,
} from "@/types/article";

const initialFilterState: FilterState = {
  categories: [],
  difficulties: [],
  sourceTypes: [],
  dateRange: "all",
  bookmarksOnly: false,
  searchQuery: "",
};

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");

  const toggleCategory = useCallback((category: Category) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const toggleDifficulty = useCallback((difficulty: Difficulty) => {
    setFilters((prev) => ({
      ...prev,
      difficulties: prev.difficulties.includes(difficulty)
        ? prev.difficulties.filter((d) => d !== difficulty)
        : [...prev.difficulties, difficulty],
    }));
  }, []);

  const toggleSourceType = useCallback((sourceType: SourceType) => {
    setFilters((prev) => ({
      ...prev,
      sourceTypes: prev.sourceTypes.includes(sourceType)
        ? prev.sourceTypes.filter((s) => s !== sourceType)
        : [...prev.sourceTypes, sourceType],
    }));
  }, []);

  const setDateRange = useCallback((dateRange: DateRange) => {
    setFilters((prev) => ({
      ...prev,
      dateRange,
    }));
  }, []);

  const toggleBookmarksOnly = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      bookmarksOnly: !prev.bookmarksOnly,
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  return {
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
  };
}
