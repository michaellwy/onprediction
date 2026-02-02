"use client";

import { useMemo } from "react";
import { getConceptGraphData } from "@/lib/concepts";
import { ConceptGraph } from "@/components/ConceptGraph";
import { ConceptList } from "@/components/ConceptList";

export default function ConceptsPage() {
  const graphData = useMemo(() => getConceptGraphData(), []);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-background overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">
          Concept Map
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore how concepts connect across the prediction market literature.
          Larger nodes appear more frequently. Lines show co-occurrence in articles.
        </p>
      </div>

      {/* Desktop: Graph visualization */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ConceptGraph graphData={graphData} />
      </div>

      {/* Mobile: List view */}
      <div className="md:hidden flex-1 overflow-y-auto px-4 pb-6">
        <ConceptList graphData={graphData} />
      </div>
    </div>
  );
}
