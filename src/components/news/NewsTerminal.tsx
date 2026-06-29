"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNews } from "@/hooks/useNews";
import type { NewsStory, NewsCategory } from "@/types/news";
import { groupStoriesByDay } from "@/lib/newsTime";
import { BoardControls } from "./BoardControls";
import { Timeline } from "./Timeline";
import { Board } from "./Board";
import { Stage } from "./Stage";

const storyKey = (s: NewsStory) => s.id || s.slug;

// Parse the filter box into category prefixes (":token") + free text.
function parseCommand(raw: string): { cats: string[]; text: string } {
  const cats: string[] = [];
  const words: string[] = [];
  for (const tok of raw.trim().toLowerCase().split(/\s+/)) {
    if (!tok) continue;
    if (tok.startsWith(":")) {
      const t = tok.slice(1);
      if (t) cats.push(t);
    } else {
      words.push(tok);
    }
  }
  return { cats, text: words.join(" ") };
}

export function NewsTerminal() {
  const { items, isLoading, hasMore, loadMore, fetchedAt } = useNews(null, null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null); // mobile accordion (null = all folded)
  const [commandText, setCommandText] = useState("");
  const [activeLens, setActiveLens] = useState<NewsCategory | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(true); // date histogram shown by default (toggleable)
  const [now, setNow] = useState(0); // 0 until mounted — keeps SSR/hydration aligned

  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dayEls = useRef<Map<string, HTMLElement>>(new Map());

  // Live clock — re-derives relative ages while the feed is open.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  // Compose filters: lens → command (category prefix + free text). The timeline
  // is navigation, not a filter — the feed stays a continuous chronological run.
  const displayed = useMemo(() => {
    const { cats, text } = parseCommand(commandText);
    return items.filter((s) => {
      if (activeLens && s.primary_category !== activeLens) return false;
      if (cats.length) {
        const c = (s.primary_category || "").toLowerCase();
        if (!cats.some((t) => c.startsWith(t))) return false;
      }
      if (text) {
        const hay = [
          s.headline,
          s.summary,
          s.why_it_matters || "",
          s.lead_source || "",
          ...s.sources.map((src) => src.outlet || ""),
        ].join(" ").toLowerCase();
        if (!hay.includes(text)) return false;
      }
      return true;
    });
  }, [items, commandText, activeLens]);

  const days = useMemo(() => groupStoriesByDay(displayed, now), [displayed, now]);

  // Keep a valid selection: default to the MOST RECENT visible story (the feed is
  // newest-first, so displayed[0]), and re-default when filters exclude the
  // current pick. Never touches the mobile view flag (auto-selection must not
  // yank a phone user into the stage).
  useEffect(() => {
    if (displayed.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const stillVisible = selectedId && displayed.some((s) => storyKey(s) === selectedId);
    if (!stillVisible) {
      setSelectedId(storyKey(displayed[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed]);

  const registerDay = useCallback((key: string, el: HTMLElement | null) => {
    if (el) dayEls.current.set(key, el);
    else dayEls.current.delete(key);
  }, []);

  const scrollToDay = useCallback((key: string) => {
    const el = dayEls.current.get(key);
    const c = scrollRef.current;
    if (el && c) c.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    setActiveDay(key); // optimistic — scroll-spy confirms once the smooth scroll settles
  }, []);

  // Scroll-spy: the active day is the divider currently pinned at the top of the
  // feed. Recomputed on scroll (rAF-throttled) and whenever the day set changes.
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const top = c.scrollTop + 8;
      let current: string | null = days[0]?.key ?? null;
      let bestTop = -Infinity;
      for (const d of days) {
        const el = dayEls.current.get(d.key);
        if (el && el.offsetTop <= top && el.offsetTop > bestTop) {
          bestTop = el.offsetTop;
          current = d.key;
        }
      }
      setActiveDay((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    c.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => { c.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [days]);

  const selectedStory = useMemo(
    () => displayed.find((s) => storyKey(s) === selectedId),
    [displayed, selectedId]
  );

  // Desktop keyboard nav: ↑/↓ move the Stage selection to the prev/next story and
  // keep that row in view. Ignored while typing or while focus is in the Stage
  // (so reading-pane scroll still works there).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (stageRef.current && el && stageRef.current.contains(el)) return;
      if (!displayed.length) return;
      e.preventDefault();
      const idx = displayed.findIndex((s) => storyKey(s) === selectedId);
      const cur = idx < 0 ? 0 : idx;
      const next = e.key === "ArrowDown" ? Math.min(displayed.length - 1, cur + 1) : Math.max(0, cur - 1);
      const id = storyKey(displayed[next]);
      setSelectedId(id);
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-story-id="${id}"]`);
      row?.scrollIntoView({ block: "nearest" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayed, selectedId]);

  const onSelect = useCallback((id: string) => {
    setSelectedId(id); // drives the desktop Stage
    setExpandedId((prev) => (prev === id ? null : id)); // mobile accordion: tap again to fold
  }, []);

  return (
    <div className="news-terminal h-[calc(100vh-64px)] overflow-hidden" data-news-theme="light">
      <div className="mx-auto flex h-full max-w-6xl bg-[hsl(var(--nt-surface-0))]">
        {/* Board column — controls + timeline live here. Always visible: on
            mobile stories fold open inline (accordion); the Stage is desktop-only. */}
        <div className="flex min-h-0 w-full flex-col lg:w-[516px] lg:flex-none">
          <BoardControls
            commandText={commandText}
            onCommandText={setCommandText}
            activeLens={activeLens}
            onLens={setActiveLens}
            timelineOpen={showTimeline}
            onToggleTimeline={() => setShowTimeline((v) => !v)}
          />
          <AnimatePresence initial={false}>
            {showTimeline && (
              <motion.div
                key="timeline"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <Timeline days={days} activeKey={activeDay} onJump={scrollToDay} />
              </motion.div>
            )}
          </AnimatePresence>
          <Board
            days={days}
            selectedId={selectedId}
            expandedId={expandedId}
            onSelect={onSelect}
            now={now}
            hasMore={hasMore}
            isLoading={isLoading}
            loadMore={loadMore}
            canLoadMore
            scrollRef={scrollRef}
            registerDay={registerDay}
            live={fetchedAt > 0}
          />
        </div>

        {/* Stage — desktop only (mobile reads the folded-open accordion in the board) */}
        <div ref={stageRef} className="hidden min-h-0 flex-1 overflow-y-auto bg-[hsl(var(--nt-surface-0))] scrollbar-subtle lg:block">
          <Stage story={selectedStory} now={now} />
        </div>
      </div>
    </div>
  );
}
