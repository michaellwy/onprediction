"use client";

import type { NewsStory, NewsStorySource } from "@/types/news";
import { hostName, sourceDate } from "@/lib/newsTime";

/** Timestamp value for sorting; undated sources sink to the bottom. */
function dateVal(s: NewsStorySource): number {
  const t = Date.parse(s.published_at ?? "");
  return Number.isNaN(t) ? -Infinity : t;
}

export function SourceList({ story }: { story: NewsStory }) {
  // Show the coverage newest-first so a stale outlier or an implausibly wide
  // date span is obvious at a glance. Start from the real source rows (they
  // carry the per-outlet title + date), then add the lead only if it isn't
  // already among them.
  const merged: NewsStorySource[] = [...story.sources];
  if (story.lead_url && !merged.some((s) => s.url === story.lead_url)) {
    merged.push({
      outlet: story.lead_source,
      url: story.lead_url,
      title: null,
      published_at: story.published_at ?? null,
    });
  }
  const sources = merged.sort((a, b) => dateVal(b) - dateVal(a));

  return (
    <section className="mt-5 border-t border-[hsl(var(--nt-hairline))] pt-4 lg:mt-9 lg:pt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--nt-ink-dim))]">
        Coverage
      </h2>
      <ul className="mt-3 space-y-3 lg:mt-4">
        {sources.map((s, i) => {
          const outlet = s.outlet || hostName(s.url);
          const title = s.title || null;
          const dated = s.published_at ? sourceDate(s.published_at) : "";
          return (
            <li key={`${s.url}-${i}`} className="flex items-baseline gap-3">
              <span className="mt-[2px] shrink-0 text-[9px] leading-none text-[hsl(var(--nt-ember))]" aria-hidden>
                ◆
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 flex-1 text-[14.5px] leading-snug"
              >
                <span className="font-semibold text-[hsl(var(--nt-ink))] underline decoration-transparent underline-offset-[3px] transition-colors duration-150 group-hover:text-[hsl(var(--nt-ember))] group-hover:decoration-[hsl(var(--nt-ember)/0.5)]">
                  {outlet}
                </span>
                {title ? (
                  <>
                    <span className="text-[hsl(var(--nt-ink-faint))]">: </span>
                    <span className="text-[hsl(var(--nt-ink)/0.8)] transition-colors duration-150 group-hover:text-[hsl(var(--nt-ember))]">
                      {title}
                    </span>
                  </>
                ) : (
                  <span className="text-[hsl(var(--nt-ink-faint))] transition-colors duration-150 group-hover:text-[hsl(var(--nt-ember)/0.8)]"> · {hostName(s.url)}</span>
                )}
              </a>
              <time
                dateTime={s.published_at || undefined}
                className="shrink-0 text-[11px] tabular-nums text-[hsl(var(--nt-ink-faint))]"
              >
                {dated || "—"}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
