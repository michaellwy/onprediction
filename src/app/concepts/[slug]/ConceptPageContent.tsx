"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ConceptPageData } from "@/types/concept";
import { cn } from "@/lib/utils";

const difficultyLabels: Record<string, string> = {
  None: "I",
  Some: "II",
  Extensive: "III",
};

export function ConceptPageContent({ data }: { data: ConceptPageData }) {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-list-item">
          <Link
            href="/concepts"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Concepts
          </Link>
          <span>/</span>
          <span className="text-foreground">{data.name}</span>
        </div>

        {/* Header */}
        <div className="space-y-3 animate-list-item" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
              {data.name}
            </h1>
            <span
              className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white/90"
              style={{ backgroundColor: data.clusterColor }}
            >
              {data.clusterLabel}
            </span>
          </div>
          {data.definition && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {data.definition}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Referenced in {data.articles.length} article
            {data.articles.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Related Concepts */}
        {data.relatedConcepts.length > 0 && (
          <div className="space-y-3 animate-list-item" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Related Concepts
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.relatedConcepts.map((rc) => (
                <Link
                  key={rc.slug}
                  href={`/concepts/${rc.slug}`}
                  className={cn(
                    "group px-3 py-1.5 rounded-lg text-sm",
                    "border border-border/50 bg-card",
                    "hover:border-border hover:bg-accent/40 transition-colors"
                  )}
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {rc.name}
                  </span>
                  <span className="ml-1.5 text-muted-foreground/60 text-xs">
                    {rc.weight}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Articles */}
        {data.articles.length > 0 && (
          <div className="space-y-3 animate-list-item" style={{ animationDelay: "150ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Articles
            </h2>
            <div className="space-y-1">
              {data.articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-start gap-3 px-3 py-3 -mx-3 rounded-lg",
                    "hover:bg-accent/40 transition-colors"
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-[15px] text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {article.title}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{article.author}</span>
                      {article.publish_date && (
                        <>
                          <span className="text-border">·</span>
                          <span>
                            {new Date(article.publish_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        </>
                      )}
                      {article.difficulty && difficultyLabels[article.difficulty] && (
                        <>
                          <span className="text-border">·</span>
                          <span>{difficultyLabels[article.difficulty]}</span>
                        </>
                      )}
                      {article.primary_category && (
                        <>
                          <span className="text-border">·</span>
                          <span>{article.primary_category}</span>
                        </>
                      )}
                    </div>
                    {article.editorial_blurb && (
                      <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {article.editorial_blurb}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
