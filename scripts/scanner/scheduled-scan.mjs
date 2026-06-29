#!/usr/bin/env node

/**
 * Scheduled scan — runs ALL sources in parallel, filters, AI-ranks, and sends
 * results to Telegram. Designed for GitHub Actions (RSS/HN/arXiv) and launchd
 * (Twitter browser) execution.
 *
 * Sources without a browser (CI) skip twitter-browser gracefully.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { filterTweets } from "./lib/heuristic-filter.mjs";
import { loadHistory, getSeenIds, getSeenUrls, updateHistory } from "./lib/dedup.mjs";
import { rankCandidates } from "./lib/ai-ranker.mjs";
import { saveMarkdown } from "./lib/output.mjs";
import { sendDigest } from "./lib/telegram.mjs";
import { fetchRSS } from "./lib/sources/rss.mjs";
import { fetchArxiv } from "./lib/sources/arxiv.mjs";
import { fetchHackerNews } from "./lib/sources/hackernews.mjs";
import { fetchTwitterBrowser } from "./lib/sources/twitter-browser.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Load .env.local ---
const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));
const lookbackHours = 48;
const recencyCutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

async function main() {
  const startTime = Date.now();
  console.log(`OnPrediction scheduled scan starting (${new Date().toISOString()})...`);

  const history = loadHistory();
  const seenIds = getSeenIds(history);
  const historySeenUrls = getSeenUrls(history);

  // ── Run ALL sources in parallel ──────────────────────────────────
  const sourceResults = await Promise.allSettled([
    // RSS feeds (Substack, blogs, company blogs)
    (async () => {
      const items = await fetchRSS();
      const filtered = items.filter(item => !historySeenUrls.has(item.url));
      const skipped = items.length - filtered.length;
      console.log(`  rss: ${items.length} items → ${filtered.length} after history dedup${skipped ? ` (${skipped} already seen)` : ""}`);
      return { source: "rss", items: filtered };
    })(),

    // arXiv
    (async () => {
      const items = await fetchArxiv();
      const filtered = items.filter(item => !historySeenUrls.has(item.url));
      const skipped = items.length - filtered.length;
      console.log(`  arxiv: ${items.length} items → ${filtered.length} after history dedup${skipped ? ` (${skipped} already seen)` : ""}`);
      return { source: "arxiv", items: filtered };
    })(),

    // Hacker News
    (async () => {
      const items = await fetchHackerNews();
      const filtered = items.filter(item => !historySeenUrls.has(item.url));
      const skipped = items.length - filtered.length;
      console.log(`  hackernews: ${items.length} items → ${filtered.length} after history dedup${skipped ? ` (${skipped} already seen)` : ""}`);
      return { source: "hackernews", items: filtered };
    })(),

    // Twitter via browser (reduced timeouts + limited queries for reliability)
    (async () => {
      const items = await fetchTwitterBrowser();
      // X Articles are long-form — skip heuristic filter, let AI judge them.
      const xArticles = items.filter(t => t.source_name === "X Article");
      const regular = items.filter(t => t.source_name !== "X Article");
      const filteredRegular = filterTweets(regular, config.heuristic_filters, seenIds);
      const allTwitter = [...xArticles, ...filteredRegular];
      console.log(`  twitter-browser: ${items.length} items → ${allTwitter.length} after filters (${xArticles.length} X Articles, ${filteredRegular.length} regular)`);
      return { source: "twitter_browser", items: allTwitter };
    })()
  ]);

  // ── Collect results, track source stats ──────────────────────────
  const sourceStats = {};
  let allCandidates = [];

  for (const result of sourceResults) {
    if (result.status === "rejected") {
      console.error(`Source failed: ${result.reason.message}`);
      continue;
    }
    const { source, items } = result.value;
    sourceStats[source] = { raw: items.length, filtered: items.length };
    allCandidates.push(...items);
  }

  // Deduplicate across sources (by URL) and enforce recency
  const seenUrls = new Set();
  const deduped = [];
  for (const item of allCandidates) {
    if (!item.url || seenUrls.has(item.url)) continue;
    // Secondary recency check — skip items without a valid date or older than lookback
    if (item.published_at) {
      const d = new Date(item.published_at);
      if (isNaN(d.getTime()) || d < recencyCutoff) continue;
    } else {
      continue; // No date at all — can't verify recency
    }
    seenUrls.add(item.url);
    deduped.push(item);
  }

  const totalRaw = allCandidates.length;
  const totalFiltered = deduped.length;
  console.log(`Total: ${totalRaw} candidates, ${totalFiltered} after cross-source dedup`);

  // ── AI ranking ──────────────────────────────────────────────────
  const { topPicks, nearMisses, all } = await rankCandidates(deduped, config.ai_ranking);
  console.log(`AI-ranked: ${topPicks.length} above threshold, ${nearMisses.length} near-misses`);

  // ── Stats ───────────────────────────────────────────────────────
  const stats = {
    sources: sourceStats,
    total_raw: totalRaw,
    total_filtered: totalFiltered,
    results: topPicks.length,
    near_misses: nearMisses.map(m => ({
      title: m.title || m.text?.slice(0, 80) || "Untitled",
      url: m.url,
      score: m.score,
      skip_reason: m.skip_reason
    })),
    lookbackHours,
    duration_sec: ((Date.now() - startTime) / 1000).toFixed(1)
  };

  // ── Save markdown report ────────────────────────────────────────
  const mdPath = saveMarkdown(topPicks, stats, false);
  console.log(`Saved to: ${mdPath}`);

  // ── Send Telegram digest ────────────────────────────────────────
  console.log(`Sending to Telegram...`);
  await sendDigest(topPicks, stats);
  console.log(`Telegram digest sent!`);

  // ── Update history ──────────────────────────────────────────────
  updateHistory(history, allCandidates, topPicks);
  console.log(`Done in ${stats.duration_sec}s.`);
}

main().catch(async (err) => {
  console.error("Scheduled scan failed:", err);

  // Notify via Telegram even on failure
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `OnPrediction scan failed: ${err.message}`
        })
      });
    }
  } catch (_) {}

  process.exit(1);
});
