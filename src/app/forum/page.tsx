import type { Metadata } from "next";
import { siteConfig } from "@/lib/siteConfig";
import { ForumPageContent } from "@/components/forum/ForumPageContent";

export const metadata: Metadata = {
  title: "Discussions",
  description:
    "Discuss prediction market articles and ideas — article discussions, strategies, platforms, and market design.",
  alternates: {
    canonical: `${siteConfig.url}/forum`,
  },
  openGraph: {
    title: "Discussions | On Prediction",
    description:
      "Discuss prediction market articles and ideas.",
    url: `${siteConfig.url}/forum`,
  },
  twitter: {
    title: "Discussions | On Prediction",
    description:
      "Discuss prediction market articles and ideas.",
  },
};

export default function ForumPage() {
  return <ForumPageContent />;
}
