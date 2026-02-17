"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getConceptGraphData } from "@/lib/concepts";
import { ConceptIndex } from "@/components/ConceptIndex";

function ConceptsContent() {
  const graphData = useMemo(() => getConceptGraphData(), []);
  const searchParams = useSearchParams();
  const initialConcept = searchParams.get("c") ?? undefined;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        <ConceptIndex graphData={graphData} initialConcept={initialConcept} />
      </div>
    </div>
  );
}

export default function ConceptsPage() {
  return (
    <Suspense>
      <ConceptsContent />
    </Suspense>
  );
}
