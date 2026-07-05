import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArticleById, getAllArticleIds, getRelatedArticles } from "@/lib/articles";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { ArticlePageContent } from "./ArticlePageContent";

export function generateStaticParams() {
  return getAllArticleIds().map((id) => ({ id: String(id) }));
}

export const dynamicParams = false;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function buildDescription(article: {
  editorial_blurb: string | null;
  share_quote?: string | null;
  title: string | null;
}): string {
  if (article.editorial_blurb) return truncate(article.editorial_blurb);
  if (article.share_quote) return article.share_quote;
  return `${article.title || "Untitled"} — curated reading on prediction markets.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) return { title: "Article not found" };
  const article = getArticleById(id);
  if (!article) return { title: "Article not found" };

  const title = article.title || "Untitled";
  const description = buildDescription(article);
  const pageUrl = `${siteConfig.url}/articles/${id}`;
  const ogImage = `${siteConfig.url}/og/article-${id}.png`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: pageUrl,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      authors: article.author ? [article.author] : undefined,
      publishedTime: article.publish_date || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) notFound();
  const article = getArticleById(id);
  if (!article) notFound();

  const related = getRelatedArticles(article, 4);
  const pageUrl = `${siteConfig.url}/articles/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: pageUrl,
    name: article.title || "Untitled",
    description: buildDescription(article),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntity: {
      "@type": "Article",
      headline: article.title || "Untitled",
      url: article.url || pageUrl,
      description: article.editorial_blurb || undefined,
      datePublished: article.publish_date || undefined,
      image: `${siteConfig.url}/og/article-${id}.png`,
      author: article.author
        ? { "@type": "Person", name: article.author }
        : undefined,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticlePageContent article={article} related={related} />
    </>
  );
}
