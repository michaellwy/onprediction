"use client";

import { useRef, useEffect, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayGroup } from "@/lib/newsTime";
import { cn } from "@/lib/utils";

// Vertical scale of the volume spine, in px. Bars read as a histogram of how
// many stories broke each day — the rhythm of the feed at a glance.
const TRACK_H = 34;
const MIN_BAR = 3;
// The editor's "only a few a day matter" line: a faint guide drawn across the
// spine at this story count, shown only when some day actually clears it.
const MATTER_LINE = 6;

interface Props {
  days: DayGroup[];                 // newest-first, as grouped
  activeKey: string | null;
  onJump: (key: string) => void;
}

export function Timeline({ days, activeKey, onJump }: Props) {
  const spineRef = useRef<HTMLDivElement>(null);
  const activeBarRef = useRef<HTMLButtonElement>(null);

  // Chronological (oldest → newest) for the spine; today sits on the right.
  const chrono = [...days].reverse();
  const max = days.reduce((m, d) => Math.max(m, d.count), 1);
  const activeIdx = days.findIndex((d) => d.key === activeKey); // index in newest-first
  const active = activeIdx >= 0 ? days[activeIdx] : days[0];
  const older = activeIdx >= 0 && activeIdx < days.length - 1 ? days[activeIdx + 1] : null;
  const newer = activeIdx > 0 ? days[activeIdx - 1] : null;

  // Keep the active bar in view as the feed scrolls past day boundaries.
  useLayoutEffect(() => {
    activeBarRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  // On first paint, pin the spine to the newest end (today).
  useEffect(() => {
    const el = spineRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  if (days.length === 0) return null;

  const barH = (count: number) => MIN_BAR + (count / max) * (TRACK_H - MIN_BAR);

  return (
    <div className="flex shrink-0 items-stretch gap-3 border-b border-[hsl(var(--nt-hairline))] px-3 py-2">
      {/* Active-day readout — the "where am I in time" anchor. */}
      <div className="flex w-[88px] shrink-0 flex-col justify-center leading-none">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--nt-ember))]">
          {active?.label ?? ""}
        </span>
        <span className="mt-1 text-[10px] tracking-[0.04em] text-[hsl(var(--nt-ink-faint))]">
          {active ? `${active.relative || active.weekday} · ${active.count}` : ""}
        </span>
      </div>

      {/* Step chevrons + the volume spine. */}
      <div className="flex min-w-0 flex-1 items-end gap-1.5">
        <StepButton dir="older" disabled={!older} onClick={() => older && onJump(older.key)} />

        <div
          ref={spineRef}
          className="relative min-w-0 flex-1 touch-pan-x select-none overflow-x-auto overscroll-x-contain scrollbar-none [-webkit-overflow-scrolling:touch]"
          style={{ height: TRACK_H }}
        >
          {/* baseline */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[hsl(var(--nt-hairline))]" />
          {/* "the few that matter" guide line */}
          {max > MATTER_LINE && (
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[hsl(var(--nt-ember)/0.28)]"
              style={{ bottom: barH(MATTER_LINE) }}
              aria-hidden
            />
          )}

          <div className="flex h-full min-w-full items-end justify-end gap-[3px]">
            {chrono.map((d) => {
              const isActive = d.key === active?.key;
              return (
                <button
                  key={d.key}
                  ref={isActive ? activeBarRef : undefined}
                  type="button"
                  onClick={() => onJump(d.key)}
                  title={`${d.label} · ${d.weekday} · ${d.count} ${d.count === 1 ? "story" : "stories"}`}
                  aria-label={`Jump to ${d.label}, ${d.count} stories`}
                  aria-current={isActive}
                  className="group relative flex h-full w-[7px] shrink-0 items-end"
                >
                  <span
                    className={cn(
                      "block w-full rounded-[1.5px] transition-colors",
                      isActive
                        ? "bg-[hsl(var(--nt-ember))]"
                        : "bg-[hsl(var(--nt-ink)/0.16)] group-hover:bg-[hsl(var(--nt-ink)/0.34)]"
                    )}
                    style={{ height: barH(d.count) }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <StepButton dir="newer" disabled={!newer} onClick={() => newer && onJump(newer.key)} />
      </div>
    </div>
  );
}

function StepButton({ dir, disabled, onClick }: { dir: "older" | "newer"; disabled: boolean; onClick: () => void }) {
  const Icon = dir === "older" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "older" ? "Previous day" : "Next day"}
      className={cn(
        "flex h-7 w-6 shrink-0 items-center justify-center self-center rounded transition-colors",
        disabled
          ? "text-[hsl(var(--nt-ink-faint)/0.4)]"
          : "text-[hsl(var(--nt-ink-faint))] hover:bg-[hsl(var(--nt-ink)/0.05)] hover:text-[hsl(var(--nt-ink))]"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
