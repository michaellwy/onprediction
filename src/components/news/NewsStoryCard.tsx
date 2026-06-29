"use client";

import type { NewsStory } from "@/types/news";
import { rankSources } from "@/lib/sourceReputation";
import { cn } from "@/lib/utils";

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Time-of-day only — the calendar day lives in the section header above.
function timeOfDay(dateString: string): string {
  return new Date(dateString)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s?([AP])M$/i, (_m, p: string) => p.toLowerCase() + "m");
}

// importance is ~7.4–9.4 for most stories, with a thin tail to ~15.
// Three tiers drive the headline scale: lead (the day's marquee story),
// notable, and standard (the dense majority).
function tierOf(importance: number): "lead" | "notable" | "standard" {
  if (importance >= 11) return "lead";
  if (importance >= 9) return "notable";
  return "standard";
}

export function NewsStoryCard({ story, index = 0 }: { story: NewsStory; index?: number }) {
  const tier = tierOf(story.importance);
  const summary = (story.summary || "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s*[—–]\s*/g, ", ")
    .trim();

  // Sources are the hero. Rank the reputable ones; if none clear the
  // allowlist, fall back to the lead source so no story is ever sourceless.
  let ranked = rankSources([{ outlet: story.lead_source, url: story.lead_url }, ...story.sources]);
  if (ranked.length === 0) {
    ranked = [{ outlet: story.lead_source ?? hostName(story.lead_url), url: story.lead_url, rank: 99 }];
  }
  const primaryUrl = ranked[0]?.url ?? story.lead_url;

  const lead = ranked[0];
  const secondaries = ranked.slice(1, 4);
  // outlet_count is the full cluster size; show "+N" for what we don't list.
  const shown = 1 + secondaries.length;
  const extra = Math.max(0, story.outlet_count - shown);

  return (
    <article
      className="news-card group/story border-b border-border/40 py-5 first:pt-1 sm:py-6"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* time gutter */}
        <time
          dateTime={story.published_at}
          title={new Date(story.published_at).toLocaleString()}
          className="w-12 shrink-0 pt-0.5 text-right text-[12px] tabular-nums leading-snug text-muted-foreground/55 sm:w-14 sm:text-[12.5px]"
        >
          {timeOfDay(story.published_at)}
        </time>

        <div className="min-w-0 flex-1">
          {/* headline — importance-scaled */}
          <h2
            className={cn(
              "tracking-[-0.01em] text-foreground",
              tier === "lead"
                ? "font-display text-[23px] font-semibold leading-[1.15] sm:text-[27px]"
                : tier === "notable"
                  ? "font-sans text-[19px] font-semibold leading-snug sm:text-[20px]"
                  : "font-sans text-[16px] font-semibold leading-snug sm:text-[17px]"
            )}
          >
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-primary/40 underline-offset-[3px] transition-colors hover:text-primary hover:underline"
            >
              {story.headline}
            </a>
          </h2>

          {/* summary — clamped by tier for rhythm */}
          {summary && (
            <p
              className={cn(
                "mt-1.5 text-foreground/65",
                tier === "lead"
                  ? "text-[15px] leading-relaxed"
                  : tier === "notable"
                    ? "line-clamp-2 text-[14.5px] leading-relaxed"
                    : "line-clamp-1 text-[14px] leading-relaxed text-foreground/55"
              )}
            >
              {summary}
            </p>
          )}

          {/* source cluster — the hero element */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold uppercase tracking-[0.03em] text-foreground/85 underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              {lead.outlet || hostName(lead.url)}
            </a>
            {secondaries.map((s, i) => (
              <span key={`${s.url}-${i}`} className="flex items-center gap-2">
                <span className="text-muted-foreground/30">·</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/55 underline-offset-2 transition-colors hover:text-primary hover:underline"
                >
                  {s.outlet || hostName(s.url)}
                </a>
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-muted-foreground/80">
                +{extra} {extra === 1 ? "outlet" : "outlets"}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
