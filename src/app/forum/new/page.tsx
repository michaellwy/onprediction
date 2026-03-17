import type { Metadata } from "next";
import { ForumNewPostContent } from "./ForumNewPostContent";

export const metadata: Metadata = {
  title: "New Post",
  robots: { index: false, follow: false },
};

export default function ForumNewPostPage() {
  return <ForumNewPostContent />;
}
