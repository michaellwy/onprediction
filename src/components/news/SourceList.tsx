"use client";

import type { NewsStory } from "@/types/news";
import { relativeTime, hostName } from "@/lib/newsTime";
import { rankedSourcesFor } from "./terminalData";

export function SourceList({ story, now }: { story: NewsStory; now: number }) {
  const sources = rankedSourcesFor(story);
  const when = now > 0 ? relativeTime(story.published_at, now) : "";

  // Per-source headline, when the feed carries it (keyed by url).
  const titleFor = new Map(story.sources.map((s) => [s.url, s.title || null]));

  return (
    <section className="mt-9 border-t border-[hsl(var(--nt-hairline))] pt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--nt-ink-dim))]">
        Coverage
      </h2>
      <ul className="mt-4 space-y-3">
        {sources.map((s, i) => {
          const outlet = s.outlet || hostName(s.url);
          const title = titleFor.get(s.url) || null;
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
              <time className="nt-num shrink-0 text-[12px] text-[hsl(var(--nt-ink-faint))]">{when}</time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
