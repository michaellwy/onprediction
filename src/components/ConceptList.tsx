"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ArrowUpDown } from "lucide-react";
import { ConceptGraphData } from "@/types/concept";
import { getConnectedConcepts } from "@/lib/concepts";
import { getArticles } from "@/lib/articles";
import { cn } from "@/lib/utils";

interface ConceptListProps {
  graphData: ConceptGraphData;
}

type SortOption = "frequency" | "alphabetical";

export function ConceptList({ graphData }: ConceptListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("frequency");
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

  const articles = useMemo(() => getArticles(), []);
  const articleMap = useMemo(() => {
    const map = new Map<number, { title: string; url: string | null }>();
    articles.forEach((a) => map.set(a.id, { title: a.title || "", url: a.url }));
    return map;
  }, [articles]);

  const filteredAndSortedNodes = useMemo(() => {
    let nodes = [...graphData.nodes];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter((n) => n.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === "frequency") {
      nodes.sort((a, b) => b.frequency - a.frequency);
    } else {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    return nodes;
  }, [graphData.nodes, search, sortBy]);

  const toggleSort = () => {
    setSortBy((s) => (s === "frequency" ? "alphabetical" : "frequency"));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full h-9 pl-9 pr-4 rounded-md text-sm",
              "bg-transparent border border-border/50",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-border focus:ring-1 focus:ring-border/50",
              "transition-colors"
            )}
          />
        </div>

        {/* Sort toggle */}
        <button
          onClick={toggleSort}
          className={cn(
            "flex items-center gap-1.5 px-3 h-9 rounded-md text-sm",
            "border border-border/50 text-muted-foreground",
            "hover:text-foreground hover:border-border transition-colors"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {sortBy === "frequency" ? "By count" : "A-Z"}
          </span>
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filteredAndSortedNodes.length} concept{filteredAndSortedNodes.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      <div className="space-y-1">
        {filteredAndSortedNodes.map((node, index) => {
          const isExpanded = expandedConcept === node.id;
          const connections = isExpanded
            ? getConnectedConcepts(node.id, graphData)
            : [];

          return (
            <div
              key={node.id}
              className="animate-list-item"
              style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
            >
              <button
                onClick={() => setExpandedConcept(isExpanded ? null : node.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left",
                  "hover:bg-accent/30 transition-colors",
                  isExpanded && "bg-accent/20"
                )}
              >
                {/* Frequency badge */}
                <span
                  className={cn(
                    "shrink-0 w-7 h-5 flex items-center justify-center rounded text-[11px] font-medium tabular-nums",
                    "bg-primary/10 text-primary"
                  )}
                >
                  {node.frequency}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-foreground">
                  {node.name}
                </span>

                {/* Expand indicator */}
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground/40 transition-transform duration-150",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pl-14 pr-3 pb-3 space-y-3">
                      {/* Connected concepts */}
                      {connections.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Connected concepts
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {connections.slice(0, 8).map((conn) => (
                              <button
                                key={conn.concept}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedConcept(conn.concept);
                                }}
                                className={cn(
                                  "px-2 py-0.5 text-[12px] font-medium rounded",
                                  "bg-foreground/[0.06] text-foreground/70",
                                  "hover:bg-foreground/[0.1] transition-colors"
                                )}
                              >
                                {conn.concept}
                                <span className="ml-1 text-muted-foreground">
                                  ({conn.weight})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Articles */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Articles ({node.articles.length})
                        </p>
                        <ul className="space-y-1">
                          {node.articles.slice(0, 5).map((articleId) => {
                            const article = articleMap.get(articleId);
                            if (!article) return null;
                            return (
                              <li key={articleId}>
                                {article.url ? (
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm text-primary hover:text-primary/80 transition-colors line-clamp-1"
                                  >
                                    {article.title}
                                  </a>
                                ) : (
                                  <span className="text-sm text-foreground/70 line-clamp-1">
                                    {article.title}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                          {node.articles.length > 5 && (
                            <li className="text-xs text-muted-foreground">
                              +{node.articles.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
