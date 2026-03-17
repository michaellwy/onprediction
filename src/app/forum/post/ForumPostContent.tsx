"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ForumPostPageContent } from "@/components/forum/ForumPostPageContent";

function ForumPostContentInner() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");

  return <ForumPostPageContent postId={postId} />;
}

export function ForumPostContent() {
  return (
    <Suspense>
      <ForumPostContentInner />
    </Suspense>
  );
}
