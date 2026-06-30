import { Article } from "@/types/article";
import articlesData from "../../articles_database.json";

export function getArticles(): Article[] {
  return (articlesData as Article[]).filter(
    (article) =>
      article.title !== null &&
      article.url !== null &&
      article.fetch_status !== "unpublished"
  );
}

// Article count rounded down to the nearest 10, e.g. "230+".
// Used in copy that advertises the library size.
export function getArticleCountLabel(): string {
  const count = getArticles().length;
  return `${Math.floor(count / 10) * 10}+`;
}

export function getUniqueCategories(): string[] {
  const articles = getArticles();
  const categories = new Set<string>();
  articles.forEach((article) => {
    if (article.primary_category) {
      categories.add(article.primary_category);
    }
  });
  return Array.from(categories).sort();
}

export function getUniqueSourceTypes(): string[] {
  const articles = getArticles();
  const sourceTypes = new Set<string>();
  articles.forEach((article) => {
    if (article.source_type) {
      sourceTypes.add(article.source_type);
    }
  });
  return Array.from(sourceTypes).sort();
}

export function getUniqueDifficulties(): string[] {
  return ["None", "Some", "Extensive"];
}

export function getArticleById(id: number): Article | undefined {
  return getArticles().find((a) => a.id === id);
}

export function getAllArticleIds(): number[] {
  return getArticles().map((a) => a.id);
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  const all = getArticles().filter((a) => a.id !== article.id);
  const conceptSet = new Set((article.concepts || []).map((c) => c.toLowerCase()));
  if (conceptSet.size === 0) return [];

  const scored = all
    .map((a) => {
      const shared = (a.concepts || []).filter((c) => conceptSet.has(c.toLowerCase())).length;
      return { article: a, shared };
    })
    .filter((x) => x.shared > 0)
    .sort((a, b) => {
      if (b.shared !== a.shared) return b.shared - a.shared;
      const ad = a.article.publish_date || "";
      const bd = b.article.publish_date || "";
      return bd.localeCompare(ad);
    });

  return scored.slice(0, limit).map((x) => x.article);
}
