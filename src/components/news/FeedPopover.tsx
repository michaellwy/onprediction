"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rss, Check, Copy } from "lucide-react";
import { siteConfig } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

const FEEDS = [
  { label: "RSS", url: `${siteConfig.url}/news/feed.xml`, hint: "Works with any feed reader or aggregator" },
  { label: "JSON", url: `${siteConfig.url}/api/news-feed?format=json`, hint: "Raw story data, CORS enabled" },
];

function CopyRow({ label, url, hint }: { label: string; url: string; hint: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — leave the URL selectable
    }
  };

  return (
    <div className="px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground/70">{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 select-all truncate rounded border border-border bg-accent/30 px-2 py-1.5 text-[12px] text-foreground">
          {url}
        </code>
        <button
          onClick={copy}
          aria-label={`Copy ${label} feed URL`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/** RSS button + popover explaining how to syndicate the news feed. */
export function FeedPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Feed & API access"
        aria-expanded={isOpen}
        title="Feed & API access"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
          isOpen
            ? "border-border bg-accent/50 text-foreground"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <Rss className="h-4 w-4" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full z-50 mt-1 w-[calc(100vw-2rem)] max-w-[340px] origin-top-right rounded-lg border border-border bg-card py-2 shadow-lg"
          >
            <div className="px-3 pb-1.5">
              <p className="text-[13px] font-semibold text-foreground">Follow this feed anywhere</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                The newswire is open to syndicate — live from the database, refreshed every 15 minutes.
              </p>
            </div>
            {FEEDS.map((f) => (
              <CopyRow key={f.label} {...f} />
            ))}
            <p className="px-3 pt-1 text-[11px] leading-snug text-muted-foreground/70">
              Filter with <code className="text-muted-foreground">?category=</code>,{" "}
              <code className="text-muted-foreground">?platform=</code> or{" "}
              <code className="text-muted-foreground">?limit=</code> (max 200). If you republish, please link back
              to onprediction.xyz.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
