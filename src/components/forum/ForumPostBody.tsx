"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";

interface ForumPostBodyProps {
  content: string;
}

export function ForumPostBody({ content }: ForumPostBodyProps) {
  return (
    <div className="max-w-none">
      <MarkdownRenderer content={content} />
    </div>
  );
}
