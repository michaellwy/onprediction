export interface ConceptNode {
  id: string;
  name: string;
  frequency: number;
  articles: number[]; // Article IDs
  cluster: string;
}

export interface ConceptEdge {
  source: string;
  target: string;
  weight: number; // Co-occurrence count
}

export interface ConceptGraphData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}
