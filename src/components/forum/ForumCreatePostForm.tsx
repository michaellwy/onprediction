"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ForumCreatePostFormProps {
  onSubmit: (title: string, body: string) => Promise<boolean>;
}

export function ForumCreatePostForm({ onSubmit }: ForumCreatePostFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const titleValid = title.trim().length >= 5;
  const bodyValid = body.trim().length > 0;
  const canSubmit = titleValid && bodyValid && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const success = await onSubmit(title, body);
    if (!success) {
      setError("Failed to publish post. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Title input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={150}
          className={cn(
            "w-full font-sans text-xl font-bold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-b pb-2 outline-none focus:outline-none transition-colors",
            attempted && !titleValid ? "border-red-400/60" : "border-border/40 focus:border-primary/40"
          )}
        />
        {attempted && !titleValid && (
          <p className="text-xs text-red-400/80 mt-1">
            {title.trim().length === 0 ? "Title is required" : `${5 - title.trim().length} more characters needed`}
          </p>
        )}
      </div>

      {/* Body textarea */}
      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's your take today? Markdown is supported."
          rows={6}
          maxLength={20000}
          className={cn(
            "w-full rounded-lg border bg-background px-4 py-3 font-sans text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-y",
            attempted && !bodyValid ? "border-red-400/60" : "border-border focus:border-primary/50"
          )}
        />
        {attempted && !bodyValid && (
          <p className="text-xs text-red-400/80 mt-1">Post body is required</p>
        )}
      </div>

      {/* Live preview */}
      {body.trim() && (
        <div>
          <span className="text-xs text-muted-foreground/60 mb-2 block">Preview</span>
          <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
            <MarkdownRenderer content={body} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/forum"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish"
          )}
        </button>
      </div>
    </form>
  );
}
