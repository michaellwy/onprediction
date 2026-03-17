import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { HomeContent } from "@/components/HomeContent";

const articles = getArticles();

export const metadata: Metadata = {
  title: "On Prediction — Curated Prediction Market Readings",
  description: `${articles.length} curated articles, papers, and podcasts about prediction markets — for builders, investors & researchers.`,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "On Prediction — Curated Prediction Market Readings",
    description: `${articles.length} curated articles, papers, and podcasts about prediction markets.`,
    url: siteConfig.url,
  },
  twitter: {
    title: "On Prediction — Curated Prediction Market Readings",
    description: `${articles.length} curated articles, papers, and podcasts about prediction markets.`,
  },
};

export default function Home() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Prediction Market Reading List",
    description: `${articles.length} curated articles about prediction markets`,
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 50).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Article",
        name: a.title,
        author: { "@type": "Person", name: a.author || "Unknown" },
        datePublished: a.publish_date || undefined,
        url: a.url,
        description: a.editorial_blurb || undefined,
        keywords: a.concepts,
      },
    })),
  };

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      {/* Pre-rendered article index for crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>On Prediction — Prediction Market Reading List</h1>
        <p>
          {articles.length} curated articles, papers, and podcasts about prediction
          markets for builders, investors, and researchers.
        </p>
        <ul>
          {articles.map((a) => (
            <li key={a.id}>
              <a href={a.url || "#"}>
                {a.title} by {a.author || "Unknown"}
              </a>
              {a.editorial_blurb && <p>{a.editorial_blurb}</p>}
              {a.concepts.length > 0 && (
                <span>Concepts: {a.concepts.join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <HomeContent />
    </>
  );
}
