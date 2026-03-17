import type { Metadata } from "next";
import { SavedContent } from "./SavedContent";

export const metadata: Metadata = {
  title: "Bookmarks",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return <SavedContent />;
}
