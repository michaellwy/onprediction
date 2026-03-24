import type { Metadata } from "next";
import { siteConfig } from "@/lib/siteConfig";
import { AskContent } from "@/components/AskContent";

export const metadata: Metadata = {
  title: "Ask the Library",
  description:
    "Ask questions about prediction markets and get answers synthesized from our curated library of 100+ articles, with citations.",
  alternates: {
    canonical: `${siteConfig.url}/ask`,
  },
  openGraph: {
    title: "Ask the Library | On Prediction",
    description:
      "AI-powered Q&A over 100+ curated prediction market articles.",
    url: `${siteConfig.url}/ask`,
  },
  twitter: {
    title: "Ask the Library | On Prediction",
    description:
      "AI-powered Q&A over 100+ curated prediction market articles.",
  },
};

export default function AskPage() {
  return <AskContent />;
}
