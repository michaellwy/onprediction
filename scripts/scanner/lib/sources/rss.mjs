/**
 * RSS/Atom feed fetcher for the prediction market content scanner.
 * Reads feeds from config.json, normalizes items into ContentItem objects.
 */

import Parser from "rss-parser";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
);

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "OnPrediction-Scanner/1.0",
  },
});

/**
 * Simple string hash for generating stable IDs from URLs.
 * Uses DJB2 algorithm for speed and reasonable distribution.
 * Returns 8-char hex string.
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Check if a date string falls within the lookback window.
 */
function isWithinLookback(dateStr, lookbackHours) {
  if (!dateStr) return false;
  const published = new Date(dateStr).getTime();
  if (isNaN(published)) return false;
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  return published >= cutoff;
}

/**
 * Pick the longest available text representation for keyword matching.
 * The caller is responsible for truncating to a storage-friendly length
 * (e.g. 500 chars) AFTER the PM-keyword filter runs, so we don't drop
 * relevant items whose first mention of "prediction market" appears past
 * char 500 of contentSnippet.
 */
function extractFullText(item) {
  const candidates = [
    item.content,
    item.contentSnippet,
    item.summary,
    item.title,
  ].filter(Boolean);
  if (candidates.length === 0) return "";
  return candidates.reduce((a, b) => (a.length > b.length ? a : b));
}

/**
 * Resolve the best available date for an item.
 * rss-parser provides isoDate for items with valid RSS pubDate or Atom published/updated.
 */
function resolveDate(item) {
  return item.isoDate || item.pubDate || item.published || null;
}

/**
 * Resolve the best available author for an item.
 * Falls back to the feed name from config if unknown.
 */
function resolveAuthor(item, feedName) {
  return item.creator || item.author || feedName;
}

/**
 * Resolve a stable permalink for an item.
 * Prefers link, falls back to guid.
 */
function resolveLink(item) {
  return item.link || item.guid || "";
}

// Keywords that must appear in title or text for RSS items to be relevant.
// This prevents overfitting on feeds that cover broad topics (e.g., Overcoming Bias).
const PM_KEYWORDS = [
  "prediction market", "prediction markets",
  "polymarket", "kalshi", "manifold", "metaculus", "augur",
  "futarchy", "event contract", "information market",
  "forecasting", "scoring rule", "LMSR", "conditional token",
  "market resolution", "oracle", "UMA protocol",
  "betting market", "outcome market", "information aggregation",
  "wisdom of crowds", "price discovery"
];

function isPMRelevant(title, text) {
  const haystack = `${title} ${text}`.toLowerCase();
  return PM_KEYWORDS.some(kw => haystack.includes(kw.toLowerCase()));
}

/**
 * Fetch and normalize items from a single feed.
 * Logs a warning on failure and returns an empty array.
 */
async function fetchFeed(feedConfig, lookbackHours, maxPerFeed) {
  const { url, name } = feedConfig;
  let feed;

  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    console.warn(`[rss] Failed to fetch feed "${name}" (${url}): ${err.message}`);
    return [];
  }

  if (!feed || !feed.items || feed.items.length === 0) {
    console.warn(`[rss] Feed "${name}" returned no items`);
    return [];
  }

  const items = [];

  for (const raw of feed.items) {
    const link = resolveLink(raw);
    if (!link) continue;

    const dateStr = resolveDate(raw);
    if (!isWithinLookback(dateStr, lookbackHours)) continue;

    const title = (raw.title || "").trim();
    const fullText = extractFullText(raw);

    // Skip items that don't mention any PM keyword (match against full text,
    // not a truncated snippet — feeds like LessWrong or Marginal Revolution
    // often mention PM keywords past char 500 of their content).
    if (!isPMRelevant(title, fullText)) continue;

    items.push({
      id: hashString(link),
      title,
      url: link,
      author: resolveAuthor(raw, name),
      text: fullText.slice(0, 500),
      published_at: dateStr,
      source_type: "rss",
      source_name: name,
    });
  }

  // Sort newest first, then cap
  items.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return items.slice(0, maxPerFeed);
}

/**
 * Fetch all configured RSS/Atom feeds and return normalized ContentItem objects.
 * Individual feed failures log a warning and are skipped.
 *
 * @returns {Promise<Array>} Array of ContentItem objects
 */
export async function fetchRSS() {
  const sourceConfig = config.sources && config.sources.rss;
  if (!sourceConfig || !sourceConfig.feeds || sourceConfig.feeds.length === 0) {
    console.warn("[rss] No feeds configured in config.json sources.rss");
    return [];
  }

  const lookbackHours = sourceConfig.lookback_hours || 48;
  const maxPerFeed = sourceConfig.max_per_feed || 3;

  const results = [];

  for (const feedConfig of sourceConfig.feeds) {
    const items = await fetchFeed(feedConfig, lookbackHours, maxPerFeed);
    results.push(...items);
  }

  // Deduplicate by id (same URL may appear in multiple feeds)
  const seen = new Set();
  const deduped = [];
  for (const item of results) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }

  // Sort all items across feeds by published_at descending
  deduped.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return deduped;
}
