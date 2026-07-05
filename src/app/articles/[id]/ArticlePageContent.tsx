"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquare, LayoutGrid } from "lucide-react";
import { Article, Category, Difficulty } from "@/types/article";
import { conceptNameToSlug } from "@/lib/concepts";
import { ArticleDiscussionPanel } from "@/components/ArticleDiscussionPanel";
import { cn } from "@/lib/utils";

const categoryColors: Record<Category, string> = {
  Fundamentals: "bg-[hsl(var(--cat-fundamentals))]",
  Design: "bg-[hsl(var(--cat-design))]",
  Microstructure: "bg-[hsl(var(--cat-microstructure))]",
  Platforms: "bg-[hsl(var(--cat-platforms))]",
  Applications: "bg-[hsl(var(--cat-applications))]",
  Business: "bg-[hsl(var(--cat-business))]",
  Regulation: "bg-[hsl(var(--cat-regulation))]",
  Commentary: "bg-[hsl(var(--cat-commentary))]",
};

const difficultyDescriptions: Record<Difficulty, string> = {
  None: "No technical background needed",
  Some: "Some technical background helpful",
  Extensive: "Extensive technical background assumed",
};

function formatFullDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticlePageContent({
  article,
  related,
}: {
  article: Article;
  related: Article[];
}) {
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const categoryColor = article.primary_category
    ? categoryColors[article.primary_category]
    : "bg-muted";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="px-4 sm:px-6 py-4 max-w-3xl mx-auto w-full space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-list-item">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Library
          </Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{article.title}</span>
        </div>

        {/* Header */}
        <header className="space-y-4 animate-list-item" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-2 flex-wrap">
            {article.primary_category && (
              <span
                className={cn(
                  "px-2.5 py-0.5 text-xs font-medium rounded-full text-white/90",
                  categoryColor
                )}
              >
                {article.primary_category}
              </span>
            )}
            {article.content_type && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-border/60 text-muted-foreground">
                {article.content_type}
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground leading-snug">
            {article.title}
          </h1>

          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {article.author && (
              article.author_twitter ? (
                <a
                  href={`https://x.com/${article.author_twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {article.author}
                </a>
              ) : (
                <span className="text-foreground">{article.author}</span>
              )
            )}
            {article.author && article.publish_date && <span>·</span>}
            {article.publish_date && <span>{formatFullDate(article.publish_date)}</span>}
            {article.source_type && (
              <>
                <span>·</span>
                <span>{article.source_type}</span>
              </>
            )}
          </div>
        </header>

        {/* Pull quote */}
        {article.share_quote && (
          <blockquote
            className="border-l-2 border-primary pl-4 font-serif italic text-lg sm:text-xl text-foreground/90 animate-list-item"
            style={{ animationDelay: "100ms" }}
          >
            “{article.share_quote}”
          </blockquote>
        )}

        {/* Editorial blurb */}
        {article.editorial_blurb && (
          <section className="space-y-2 animate-list-item" style={{ animationDelay: "150ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Why It&apos;s Worth Reading
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {article.editorial_blurb}
            </p>
            {article.difficulty && (
              <p className="text-sm text-muted-foreground/70">
                {difficultyDescriptions[article.difficulty]}
              </p>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap animate-list-item" style={{ animationDelay: "200ms" }}>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Read the Original
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={() => setDiscussionOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Discuss
          </button>
          <Link
            href={`/?article=${article.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-background hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            View in Library
          </Link>
        </div>

        {/* Concepts */}
        {article.concepts.length > 0 && (
          <section className="space-y-3 animate-list-item" style={{ animationDelay: "250ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Concepts
            </h2>
            <div className="flex flex-wrap gap-2">
              {article.concepts.map((concept) => (
                <Link
                  key={concept}
                  href={`/concepts/${conceptNameToSlug(concept)}`}
                  className={cn(
                    "group px-3 py-1.5 rounded-lg text-sm",
                    "border border-border/50 bg-card",
                    "hover:border-border hover:bg-accent/40 transition-colors"
                  )}
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {concept}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Platforms */}
        {article.platforms_mentioned.length > 0 && (
          <p className="text-sm text-muted-foreground animate-list-item" style={{ animationDelay: "300ms" }}>
            <span className="font-medium text-foreground">Platforms mentioned:</span>{" "}
            {article.platforms_mentioned.join(", ")}
          </p>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <section className="space-y-3 animate-list-item" style={{ animationDelay: "350ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Related Reading
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/articles/${r.id}`}
                  className={cn(
                    "group block p-4 rounded-lg space-y-1.5",
                    "border border-border/50 bg-card",
                    "hover:border-border hover:bg-accent/40 transition-colors"
                  )}
                >
                  <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                    {r.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {[r.author, formatFullDate(r.publish_date)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <div className="pt-4 border-t border-border/50 animate-list-item" style={{ animationDelay: "400ms" }}>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Browse the full prediction market library
          </Link>
        </div>
      </div>

      <ArticleDiscussionPanel
        articleId={article.id}
        articleTitle={article.title || "Untitled"}
        articleUrl={article.url}
        isOpen={discussionOpen}
        onClose={() => setDiscussionOpen(false)}
      />
    </div>
  );
}
