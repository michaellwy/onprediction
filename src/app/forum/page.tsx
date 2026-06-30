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
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discussions | On Prediction",
    description:
      "Discuss prediction market articles and ideas.",
    images: ["/og-image.png"],
  },
};

export default function ForumPage() {
  return <ForumPageContent />;
}
