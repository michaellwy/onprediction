import { getArticles } from "./articles";
import { ConceptNode, ConceptEdge, ConceptGraphData } from "@/types/concept";
import defs from "../../concept_definitions.json";

export type ConceptCluster =
  | "oracle"
  | "liquidity"
  | "information"
  | "mechanism"
  | "governance"
  | "business";

export const clusterMeta: Record<ConceptCluster, { label: string; color: string }> = {
  oracle: { label: "Oracle & Resolution", color: "hsl(340, 55%, 55%)" },
  liquidity: { label: "Liquidity & Trading", color: "hsl(35, 70%, 50%)" },
  information: { label: "Information Theory", color: "hsl(210, 60%, 50%)" },
  mechanism: { label: "Mechanism Design", color: "hsl(270, 50%, 55%)" },
  governance: { label: "Governance & Decisions", color: "hsl(150, 50%, 40%)" },
  business: { label: "Business & Platforms", color: "hsl(190, 55%, 45%)" },
};

const conceptToCluster: Record<string, ConceptCluster> = {
  // Oracle & Resolution
  "oracle design": "oracle",
  "dispute resolution": "oracle",
  "resolution criteria": "oracle",
  "UMA protocol": "oracle",
  "corruption value multiple": "oracle",
  "self-resolving markets": "oracle",

  // Liquidity & Trading
  "liquidity provision": "liquidity",
  "market making": "liquidity",
  "adverse selection": "liquidity",
  "toxic flow": "liquidity",
  "gap risk": "liquidity",
  "order book": "liquidity",
  "batched auctions": "liquidity",
  "retail flow": "liquidity",
  "arbitrage": "liquidity",
  "cross-platform arbitrage": "liquidity",
  "time arbitrage": "liquidity",
  "temporal arbitrage": "liquidity",
  "orderflow arbitrage": "liquidity",
  "bid-ask spread": "liquidity",
  "continuous double auction": "liquidity",
  "Kelly criterion": "liquidity",
  "portfolio sizing": "liquidity",
  "hedging": "liquidity",
  "covariance markets": "liquidity",

  // Information Theory
  "information aggregation": "information",
  "wisdom of crowds": "information",
  "price discovery": "information",
  "forecasting accuracy": "information",
  "calibration": "information",
  "info finance": "information",
  "superforecasting": "information",
  "information asymmetry": "information",
  "belief volatility": "information",
  "composable beliefs": "information",
  "distribution markets": "information",
  "longshot bias": "information",

  // Mechanism Design
  "proper scoring rules": "mechanism",
  "incentive compatibility": "mechanism",
  "LMSR (logarithmic market scoring rule)": "mechanism",
  "peer prediction": "mechanism",
  "reflexivity": "mechanism",
  "derivatives": "mechanism",
  "market manipulation": "mechanism",
  "LOX (log-odds excess lateness)": "mechanism",

  // Governance & Decisions
  "decision markets": "governance",
  "futarchy": "governance",
  "conditional tokens": "governance",
  "impact markets": "governance",
  "opportunity markets": "governance",
  "hyperstition markets": "governance",
  "no-loss prediction markets": "governance",
  "social coercion": "governance",
  "attention markets": "governance",

  // Business & Platforms
  "network effects": "business",
  "platform competition": "business",
  "election markets": "business",
  "parlays": "business",
  "event contracts": "business",
  "regulatory arbitrage": "business",
  "public goods problem": "business",
  "no-trade theorem": "business",
  "AI agents": "business",
  "go-to-market": "business",
  "sports betting": "business",
};

export function getConceptCluster(concept: string): ConceptCluster {
  return conceptToCluster[concept] || "information"; // default to information
}

export const conceptDefinitions: Record<string, string> = defs;

function normalizeConcept(concept: string): string {
  return concept.replace(/^NEW:\s*/i, "").trim();
}

export function getConceptGraphData(): ConceptGraphData {
  const articles = getArticles();

  // Track concept frequencies and article associations
  const conceptMap = new Map<string, { frequency: number; articles: Set<number> }>();

  // Track co-occurrences
  const coOccurrences = new Map<string, number>();

  articles.forEach((article) => {
    const normalizedConcepts = article.concepts.map(normalizeConcept);

    // Track individual concepts
    normalizedConcepts.forEach((concept) => {
      if (!conceptMap.has(concept)) {
        conceptMap.set(concept, { frequency: 0, articles: new Set() });
      }
      const data = conceptMap.get(concept)!;
      data.frequency++;
      data.articles.add(article.id);
    });

    // Track co-occurrences (pairs within same article)
    for (let i = 0; i < normalizedConcepts.length; i++) {
      for (let j = i + 1; j < normalizedConcepts.length; j++) {
        const [a, b] = [normalizedConcepts[i], normalizedConcepts[j]].sort();
        const key = `${a}|||${b}`;
        coOccurrences.set(key, (coOccurrences.get(key) || 0) + 1);
      }
    }
  });

  // Build nodes
  const nodes: ConceptNode[] = Array.from(conceptMap.entries()).map(
    ([name, data]) => ({
      id: name,
      name,
      frequency: data.frequency,
      articles: Array.from(data.articles),
      cluster: getConceptCluster(name),
    })
  );

  // Build edges (only include edges where both nodes exist)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: ConceptEdge[] = [];

  coOccurrences.forEach((weight, key) => {
    const [source, target] = key.split("|||");
    if (nodeIds.has(source) && nodeIds.has(target)) {
      edges.push({ source, target, weight });
    }
  });

  return { nodes, edges };
}

export function getConnectedConcepts(
  conceptId: string,
  graphData: ConceptGraphData
): { concept: string; weight: number }[] {
  const connected: { concept: string; weight: number }[] = [];

  graphData.edges.forEach((edge) => {
    if (edge.source === conceptId) {
      connected.push({ concept: edge.target, weight: edge.weight });
    } else if (edge.target === conceptId) {
      connected.push({ concept: edge.source, weight: edge.weight });
    }
  });

  return connected.sort((a, b) => b.weight - a.weight);
}
