import type { Metadata } from "next";
import { siteConfig } from "@/lib/siteConfig";
import { AskContent } from "@/components/AskContent";
import { getArticleCountLabel } from "@/lib/articles";

const count = getArticleCountLabel();

export const metadata: Metadata = {
  title: "Ask the Library",
  description:
    `Ask questions about prediction markets and get answers synthesized from our curated library of ${count} articles, with citations.`,
  alternates: {
    canonical: `${siteConfig.url}/ask`,
  },
  openGraph: {
    title: "Ask the Library | On Prediction",
    description:
      `AI-powered Q&A over ${count} curated prediction market articles.`,
    url: `${siteConfig.url}/ask`,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask the Library | On Prediction",
    description:
      `AI-powered Q&A over ${count} curated prediction market articles.`,
    images: ["/og-image.png"],
  },
};

export default function AskPage() {
  return <AskContent />;
}
