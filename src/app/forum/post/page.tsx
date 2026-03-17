import type { Metadata } from "next";
import { ForumPostContent } from "./ForumPostContent";

export const metadata: Metadata = {
  title: "Post",
  description: "Forum post on On Prediction — a community for prediction market practitioners.",
};

export default function ForumPostPage() {
  return <ForumPostContent />;
}
