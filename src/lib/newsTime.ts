// Time + host helpers for the news terminal. Relative time is derived against a
// live `now` (re-ticked on an interval) so the board visibly ages while open.

import type { NewsStory } from "@/types/news";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar-day key (YYYY-MM-DD) for a story timestamp. */
export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A day's worth of stories, plus the labels the timeline + dividers render. */
export interface DayGroup {
  key: string;        // YYYY-MM-DD (local)
  ts: number;         // ms epoch at local midnight — for ordering / "today" tests
  label: string;      // "Jun 28" (adds year only when not the current year)
  weekday: string;    // "Mon"
  relative: string;   // "Today" | "Yesterday" | "" (filled by groupStoriesByDay)
  count: number;
  stories: NewsStory[];
}

function midnightTs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Bucket stories into local calendar days, preserving the feed's newest-first
 * order both across days and within each day. `now` (0 before hydration) drives
 * the Today/Yesterday relative labels; pass the terminal's shared clock.
 */
export function groupStoriesByDay(stories: NewsStory[], now: number): DayGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, NewsStory[]>();
  for (const s of stories) {
    const key = dayKeyOf(s.published_at);
    if (!byKey.has(key)) { byKey.set(key, []); order.push(key); }
    byKey.get(key)!.push(s);
  }
  const curYear = new Date(now || Date.now()).getFullYear();
  const todayKey = now ? dayKeyOf(new Date(now).toISOString()) : "";
  const yesterdayKey = now ? dayKeyOf(new Date(now - 864e5).toISOString()) : "";
  return order.map((key) => {
    const ts = midnightTs(key);
    const d = new Date(ts);
    return {
      key,
      ts,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(d.getFullYear() !== curYear ? { year: "numeric" } : {}),
      }),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      relative: key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : "",
      count: byKey.get(key)!.length,
      stories: byKey.get(key)!,
    };
  });
}

/** Bare hostname, no leading www. Falls back to the raw string on parse failure. */
export function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Compact relative age keyed off a caller-supplied `now` (ms epoch).
 * Buckets: <60s "now", <60m "{m}m", <24h "{h}h", <7d "{d}d", else short date.
 * Kept terse (no "ago") so it sits tight in the tape's time gutter.
 */
export function relativeTime(iso: string, now: number): string {
  // now === 0 means the client clock hasn't been set yet (pre-hydration). Render
  // nothing so the server HTML and first client render agree, then fill on mount.
  if (!now) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 6e4);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Absolute, human timestamp for tooltips. */
export function absoluteTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString();
}
