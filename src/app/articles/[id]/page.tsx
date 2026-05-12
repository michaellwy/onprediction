import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArticleById, getAllArticleIds } from "@/lib/articles";
import { siteConfig } from "@/lib/siteConfig";
import { ArticleRedirectClient } from "./ArticleRedirectClient";

export function generateStaticParams() {
  return getAllArticleIds().map((id) => ({ id: String(id) }));
}

export const dynamicParams = false;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
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
  const description =
    article.share_quote ||
    article.editorial_blurb?.split(". ")[0] ||
    `${title} — curated reading on prediction markets.`;
  const canonical = `${siteConfig.url}/?article=${id}`;
  const ogImage = `${siteConfig.url}/og/article-${id}.png`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/articles/${id}`,
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

  return <ArticleRedirectClient id={id} />;
}
