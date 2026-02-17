"use client";

import { useMemo } from "react";
import { getConceptGraphData } from "@/lib/concepts";
import { ConceptIndex } from "@/components/ConceptIndex";

export default function ConceptsPage() {
  const graphData = useMemo(() => getConceptGraphData(), []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">
          Concepts
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mb-8">
          Browse unique ideas across the prediction market literature. Filter by
          cluster, search by name, or expand a card to see related concepts and
          articles.
        </p>

        <ConceptIndex graphData={graphData} />
      </div>
    </div>
  );
}
