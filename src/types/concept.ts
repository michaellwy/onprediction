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

export interface ConceptPageArticle {
  id: number;
  title: string;
  author: string;
  url: string | null;
  publish_date: string | null;
  editorial_blurb: string | null;
  primary_category: string | null;
  difficulty: string | null;
  source_type: string | null;
}

export interface RelatedConcept {
  name: string;
  slug: string;
  weight: number;
  definition: string;
}

export interface ConceptPageData {
  name: string;
  slug: string;
  definition: string;
  cluster: string;
  clusterLabel: string;
  clusterColor: string;
  relatedConcepts: RelatedConcept[];
  articles: ConceptPageArticle[];
}
