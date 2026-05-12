import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft, MessageSquare } from "lucide-react";

import { getArticleById, getAllArticleIds, getRelatedArticles } from "@/lib/articles";
import { conceptNameToSlug } from "@/lib/concepts";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return getAllArticleIds().map((id) => ({ id: String(id) }));
}

export const dynamicParams = false;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function sourceLabel(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return dateString;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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
  const canonical = `${siteConfig.url}/articles/${id}`;
  const ogImage = `${siteConfig.url}/og/article-${id}.png`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: canonical,
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

  const title = article.title || "Untitled";
  const source = sourceLabel(article.url);
  const related = getRelatedArticles(article, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: article.share_quote || article.editorial_blurb || "",
    author: article.author ? { "@type": "Person", name: article.author } : undefined,
    datePublished: article.publish_date || undefined,
    url: `${siteConfig.url}/articles/${id}`,
    image: `${siteConfig.url}/og/article-${id}.png`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            back to the library
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            {article.primary_category && (
              <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-primary px-2.5 py-1 rounded-full border border-primary/30">
                {article.primary_category}
              </span>
            )}
            {article.content_type && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {article.content_type}
              </span>
            )}
            {article.publish_date && (
              <span className="text-[11px] text-muted-foreground">· {formatDate(article.publish_date)}</span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-foreground mb-5">
            {title}
          </h1>

          <p className="text-base text-muted-foreground mb-8">
            {article.author && <span className="text-foreground/80 font-medium">{article.author}</span>}
            {article.author && source && <span className="mx-2 text-muted-foreground/50">·</span>}
            {source && <span>{source}</span>}
          </p>

          {article.share_quote && (
            <blockquote className="border-l-[3px] border-primary pl-5 italic font-serif text-xl sm:text-2xl text-foreground/85 leading-snug mb-8">
              “{article.share_quote}”
            </blockquote>
          )}

          {article.editorial_blurb && (
            <div className="prose prose-invert max-w-none mb-10">
              <p className="text-[17px] leading-relaxed text-foreground/80">{article.editorial_blurb}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 mb-10">
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Read the original
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Link
              href={`/?id=${id}`}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border bg-background/80 hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              View in library
            </Link>
          </div>

          {article.concepts && article.concepts.length > 0 && (
            <div className="mb-12">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                concepts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {article.concepts.map((concept) => (
                  <Link
                    key={concept}
                    href={`/concepts/${conceptNameToSlug(concept)}`}
                    className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {concept}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/50">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
                related reading
              </div>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/articles/${r.id}`}
                    className="block group"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-foreground/90 group-hover:text-primary transition-colors font-medium">
                        {r.title}
                      </span>
                      {r.author && (
                        <span className="text-xs text-muted-foreground shrink-0">{r.author}</span>
                      )}
                    </div>
                    {r.share_quote && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{r.share_quote}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
