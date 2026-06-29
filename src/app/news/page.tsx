import type { Metadata } from "next";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { getNewsSeed } from "@/lib/news";
import { NewsContent } from "@/components/news/NewsContent";

export const metadata: Metadata = {
  title: "News",
  description:
    "Curated prediction-market news, updated daily — regulation, platform launches, funding and major market events. AI-analyzed, tagged and searchable.",
  alternates: {
    canonical: `${siteConfig.url}/news`,
  },
  openGraph: {
    title: "Prediction Market News | On Prediction",
    description: "Curated, analyzed prediction-market news, updated daily.",
    url: `${siteConfig.url}/news`,
  },
  twitter: {
    title: "Prediction Market News | On Prediction",
    description: "Curated, analyzed prediction-market news, updated daily.",
  },
};

export default function NewsPage() {
  const stories = getNewsSeed();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Prediction Market News",
    description: "Curated prediction-market news, updated daily.",
    itemListElement: stories.slice(0, 30).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: s.lead_url,
      name: s.headline,
    })),
  };

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      {/* Pre-rendered headlines for crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>Prediction Market News</h1>
        <p>Curated, AI-analyzed prediction-market news, updated daily.</p>
        <ul>
          {stories.map((s) => (
            <li key={s.slug}>
              <a href={s.lead_url}>{s.headline}</a>
              {s.summary ? ` — ${s.summary}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <NewsContent />
    </>
  );
}
