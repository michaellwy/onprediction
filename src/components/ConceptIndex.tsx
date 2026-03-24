"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, X, ArrowUpDown, ExternalLink, ArrowRight } from "lucide-react";
import { ConceptGraphData, ConceptNode } from "@/types/concept";
import { conceptDefinitions, conceptNameToSlug } from "@/lib/concepts";
import { getArticles } from "@/lib/articles";
import { cn } from "@/lib/utils";

interface ConceptIndexProps {
  graphData: ConceptGraphData;
  initialConcept?: string;
}

type SortOption = "frequency" | "alphabetical";

export function ConceptIndex({ graphData, initialConcept }: ConceptIndexProps) {
  const [search, setSearch] = useState(initialConcept ?? "");
  const [sortBy, setSortBy] = useState<SortOption>("frequency");
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);
  const initialConceptApplied = useRef(false);

  const articles = useMemo(() => getArticles(), []);
  const articleMap = useMemo(() => {
    const map = new Map<
      number,
      { title: string; url: string | null; date: string | null }
    >();
    articles.forEach((a) =>
      map.set(a.id, {
        title: a.title || "",
        url: a.url,
        date: a.publish_date,
      })
    );
    return map;
  }, [articles]);

  const filteredAndSortedNodes = useMemo(() => {
    let nodes = [...graphData.nodes];

    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter((n) => n.name.toLowerCase().includes(q));
    }

    if (sortBy === "frequency") {
      nodes.sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));
    } else {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    return nodes;
  }, [graphData.nodes, search, sortBy]);

  // Auto-expand the initial concept from URL param on mount
  useEffect(() => {
    if (!initialConcept || initialConceptApplied.current) return;
    initialConceptApplied.current = true;

    const match = graphData.nodes.find(
      (n) => n.name.toLowerCase() === initialConcept.toLowerCase()
    );
    if (match) {
      setHoveredConcept(match.id);
    }
  }, [initialConcept, graphData.nodes]);

  // Close hover panel on outside tap
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a hover panel or concept row
      if (target.closest("[data-concept-row]") || target.closest("[data-hover-panel]")) return;
      setHoveredConcept(null);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleSort = () => {
    setSortBy((s) => (s === "frequency" ? "alphabetical" : "frequency"));
  };

  return (
    <div className="space-y-4">
      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full h-8 pl-8 pr-8 rounded-md text-base sm:text-[13px]",
              "bg-transparent border border-border/50",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-border focus:ring-1 focus:ring-border/50",
              "transition-colors"
            )}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={toggleSort}
          className={cn(
            "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[13px] shrink-0",
            "border border-border/50 text-muted-foreground",
            "hover:text-foreground hover:border-border transition-colors"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {sortBy === "frequency" ? "By count" : "A–Z"}
          </span>
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filteredAndSortedNodes.length} concept
        {filteredAndSortedNodes.length !== 1 ? "s" : ""}
      </p>

      {/* Concept list */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-8">
        {filteredAndSortedNodes.map((node) => (
          <ConceptRow
            key={node.id}
            node={node}
            articleMap={articleMap}
            isHovered={hoveredConcept === node.id}
            onHoverStart={() => setHoveredConcept(node.id)}
            onHoverEnd={() => {
              // Only clear if this node is still the hovered one
              setHoveredConcept((prev) =>
                prev === node.id ? null : prev
              );
            }}
            onToggle={() => {
              setHoveredConcept((prev) =>
                prev === node.id ? null : node.id
              );
            }}
          />
        ))}
      </div>

      {filteredAndSortedNodes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No concepts match your search.
        </p>
      )}
    </div>
  );
}

function ConceptRow({
  node,
  articleMap,
  isHovered,
  onHoverStart,
  onHoverEnd,
  onToggle,
}: {
  node: ConceptNode;
  articleMap: Map<
    number,
    { title: string; url: string | null; date: string | null }
  >;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onToggle: () => void;
}) {
  const [panelPos, setPanelPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const definition = conceptDefinitions[node.name];
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Sort articles by recency (most recent first)
  const sortedArticles = useMemo(() => {
    return [...node.articles].sort((a, b) => {
      const dateA = articleMap.get(a)?.date;
      const dateB = articleMap.get(b)?.date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [node.articles, articleMap]);

  // Position the panel, flipping above the row when there isn't enough space below
  const updatePanelPos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const panelWidth = Math.min(320, window.innerWidth - 24);
      const clampedLeft = Math.min(rect.left, Math.max(12, window.innerWidth - panelWidth - 12));
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
        setPanelPos({
          top: rect.bottom + 4,
          left: clampedLeft,
          maxHeight: Math.max(80, spaceBelow),
        });
      } else {
        setPanelPos({
          bottom: window.innerHeight - rect.top + 4,
          left: clampedLeft,
          maxHeight: Math.max(80, spaceAbove),
        });
      }
    }
  }, []);

  useEffect(() => {
    if (isHovered) {
      updatePanelPos();
    } else {
      setPanelPos(null);
    }
  }, [isHovered, updatePanelPos]);

  // Reposition on scroll while hovered
  useEffect(() => {
    if (!isHovered) return;
    const handleScroll = () => updatePanelPos();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isHovered, updatePanelPos]);

  return (
    <div
      ref={ref}
      className="break-inside-avoid"
      data-concept-row
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onToggle}
    >
      <div
        className={cn(
          "flex items-baseline gap-2 py-1.5 text-left group cursor-default",
          isHovered && "relative z-10"
        )}
      >
        <span className="shrink-0 w-5 text-right text-[13px] tabular-nums text-muted-foreground">
          {node.frequency}
        </span>
        <Link
          href={`/concepts/${conceptNameToSlug(node.name)}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "font-serif text-[15px] transition-colors duration-150 hover:underline",
            isHovered
              ? "text-primary"
              : "text-foreground group-hover:text-primary"
          )}
        >
          {node.name}
        </Link>
      </div>

      {/* Hover panel — definition + article list */}
      {mounted && (
        <AnimatePresence>
          {isHovered && panelPos && (
            <HoverPanel
              node={node}
              definition={definition}
              sortedArticles={sortedArticles}
              articleMap={articleMap}
              panelPos={panelPos}
              onMouseEnter={onHoverStart}
              onMouseLeave={onHoverEnd}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function HoverPanel({
  node,
  definition,
  sortedArticles,
  articleMap,
  panelPos,
  onMouseEnter,
  onMouseLeave,
}: {
  node: ConceptNode;
  definition: string | undefined;
  sortedArticles: number[];
  articleMap: Map<
    number,
    { title: string; url: string | null; date: string | null }
  >;
  panelPos: { top?: number; bottom?: number; left: number; maxHeight: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-hover-panel
      className="fixed z-[9998] w-[min(320px,calc(100vw-24px))] bg-card border border-border/60 rounded-xl shadow-xl flex flex-col overflow-hidden"
      style={{
        top: panelPos.top,
        bottom: panelPos.bottom,
        left: panelPos.left,
        maxHeight: panelPos.maxHeight,
      }}
    >
      {definition && (
        <div className="px-4 pt-3 pb-2 border-b border-border/30 shrink-0">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-serif font-semibold">{node.name}</span>
            {" — "}
            {definition}
          </p>
        </div>
      )}
      <div className="px-4 py-2.5 overflow-y-auto">
        <ul className="space-y-1">
          {sortedArticles.map((articleId) => {
            const article = articleMap.get(articleId);
            if (!article) return null;
            return (
              <li key={articleId}>
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 transition-colors py-0.5"
                  >
                    <span className="line-clamp-1">{article.title}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-40" />
                  </a>
                ) : (
                  <span className="text-[13px] text-foreground/60 line-clamp-1 py-0.5">
                    {article.title}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="px-4 py-2 border-t border-border/30 shrink-0">
        <Link
          href={`/concepts/${conceptNameToSlug(node.name)}`}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
        >
          View full page
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>,
    document.body
  );
}
