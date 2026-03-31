export interface Article {
  id: number;
  url: string | null;
  title: string | null;
  author: string | null;
  author_twitter: string | null;
  source_type: SourceType | null;
  publish_date: string | null;
  primary_category: Category | null;
  content_type: ContentType | null;
  difficulty: Difficulty | null;
  concepts: string[];
  platforms_mentioned: string[];
  editorial_blurb: string | null;
  fetch_status: string;
}

export type Category =
  | "Fundamentals"
  | "Design"
  | "Microstructure"
  | "Platforms"
  | "Applications"
  | "Business"
  | "Regulation"
  | "Commentary";

export type Difficulty = "None" | "Some" | "Extensive";

export type SourceType =
  | "Blog"
  | "Substack"
  | "Academic Paper"
  | "News"
  | "Podcast"
  | "Twitter"
  | "Forum Post"
  | "Company Blog";

export type ContentType =
  | "Opinion"
  | "Research Paper"
  | "Explainer"
  | "Analysis"
  | "Case Study"
  | "Podcast";

export type SortOption = "date-desc" | "date-asc" | "upvotes-desc" | "views-desc" | "title-asc" | "title-desc";

export type DateRange = "all" | "year" | "6months" | "month";

export interface FilterState {
  categories: Category[];
  difficulties: Difficulty[];
  sourceTypes: SourceType[];
  dateRange: DateRange;
  bookmarksOnly: boolean;
  searchQuery: string;
}
