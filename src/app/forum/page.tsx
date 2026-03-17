import type { Metadata } from "next";
import { siteConfig } from "@/lib/siteConfig";
import { ForumPageContent } from "@/components/forum/ForumPageContent";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Community forum for prediction market practitioners — discuss strategies, platforms, and market design.",
  alternates: {
    canonical: `${siteConfig.url}/forum`,
  },
  openGraph: {
    title: "Forum | On Prediction",
    description:
      "Community forum for prediction market practitioners.",
    url: `${siteConfig.url}/forum`,
  },
  twitter: {
    title: "Forum | On Prediction",
    description:
      "Community forum for prediction market practitioners.",
  },
};

export default function ForumPage() {
  return <ForumPageContent />;
}
