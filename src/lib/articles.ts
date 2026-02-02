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
