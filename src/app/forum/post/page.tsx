"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ForumPostPageContent } from "@/components/forum/ForumPostPageContent";

function ForumPostPageInner() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");

  return <ForumPostPageContent postId={postId} />;
}

export default function ForumPostPage() {
  return (
    <Suspense>
      <ForumPostPageInner />
    </Suspense>
  );
}
