"use client";

import type { RefObject } from "react";
import type { DayGroup } from "@/lib/newsTime";
import { BoardRow } from "./BoardRow";

interface Props {
  days: DayGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  canLoadMore: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Register a day-divider element (or null on unmount) so the timeline can scroll to it. */
  registerDay: (key: string, el: HTMLElement | null) => void;
  /** Feed has synced at least once — drives the live dot on the Today header. */
  live: boolean;
}

export function Board({
  days, selectedId, onSelect, now, hasMore, isLoading, loadMore, canLoadMore, scrollRef, registerDay, live,
}: Props) {
  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
      {days.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] text-[hsl(var(--nt-ink-dim))]">No stories match.</p>
          <p className="mt-1 text-[13px] text-[hsl(var(--nt-ink-faint))]">Clear a filter to widen the feed.</p>
        </div>
      ) : (
        days.map((group) => (
          <section key={group.key}>
            <div
              ref={(el) => registerDay(group.key, el)}
              data-day={group.key}
              className="sticky top-0 z-10 flex items-baseline gap-2 border-b border-[hsl(var(--nt-hairline))] bg-[hsl(var(--nt-surface-0)/0.9)] px-4 py-1.5 backdrop-blur-sm"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--nt-ink))]">
                {group.label}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-[hsl(var(--nt-ink-faint))]">
                {group.relative || group.weekday}
              </span>
              {live && group.relative === "Today" && (
                <span className="ml-0.5 flex items-center gap-1.5 self-center" title="Live feed">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden>
                    <span className="nt-live-halo absolute inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--nt-live))]" />
                    <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[hsl(var(--nt-live))]" />
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--nt-live))]">
                    Live
                  </span>
                </span>
              )}
            </div>

            <div className="divide-y divide-[hsl(var(--nt-hairline))]">
              {group.stories.map((s) => (
                <BoardRow
                  key={s.id || s.slug}
                  story={s}
                  now={now}
                  selected={selectedId === (s.id || s.slug)}
                  onSelect={() => onSelect(s.id || s.slug)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {canLoadMore && hasMore && days.length > 0 && (
        <div className="border-t border-[hsl(var(--nt-hairline))] p-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="w-full py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--nt-ink-dim))] transition-colors hover:text-[hsl(var(--nt-ink))] disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Load earlier"}
          </button>
        </div>
      )}
    </div>
  );
}
