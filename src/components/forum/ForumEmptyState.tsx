"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";

export function ForumEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <PenLine className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-sans text-base font-bold text-foreground mb-2">
        No posts yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Be the first to share your analysis, observations, or questions about prediction markets.
      </p>
      <Link
        href="/forum/new"
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
      >
        <PenLine className="h-4 w-4" />
        Write a post
      </Link>
    </div>
  );
}
