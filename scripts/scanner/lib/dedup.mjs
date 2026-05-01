import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, "..", "data", "scan-history.json");
const MAX_AGE_DAYS = 90;

function ensureDataDir() {
  const dir = dirname(HISTORY_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Load scan history from disk.
 */
export function loadHistory() {
  ensureDataDir();
  if (!existsSync(HISTORY_PATH)) {
    return { last_scan: null, seen_tweet_ids: {}, seen_urls: {}, recent_results: [] };
  }
  return JSON.parse(readFileSync(HISTORY_PATH, "utf-8"));
}

/**
 * Get set of previously seen tweet IDs.
 */
export function getSeenIds(history) {
  return new Set(Object.keys(history.seen_tweet_ids || {}));
}

/**
 * Get set of previously seen URLs (across all sources).
 */
export function getSeenUrls(history) {
  return new Set(Object.keys(history.seen_urls || {}));
}

/**
 * Update history with newly seen tweets and save to disk.
 */
export function updateHistory(history, tweets, results) {
  const now = new Date().toISOString();

  // Add all seen tweet IDs
  for (const tweet of tweets) {
    history.seen_tweet_ids[tweet.id] = now;
  }

  // Add seen URLs (from text AND from item.url itself)
  for (const item of tweets) {
    // Record the item's own URL (critical for RSS/arXiv items whose text
    // doesn't contain their own URL — prevents same article reappearing
    // on the next scan while still within the lookback window)
    if (item.url) {
      history.seen_urls[item.url] = now;
    }
    // Also record any URLs found in the text (e.g. links shared in tweets)
    if (item.text) {
      const urls = extractUrlsSimple(item.text);
      for (const url of urls) {
        history.seen_urls[url] = now;
      }
    }
  }

  // Store recent results
  if (results.length > 0) {
    history.recent_results.unshift({
      scan_date: now,
      items: results.map(r => ({
        id: r.id,
        author_handle: r.author_handle,
        url: r.url,
        score: r.score || null
      }))
    });
    // Keep last 30 scans
    history.recent_results = history.recent_results.slice(0, 30);
  }

  history.last_scan = now;

  // Prune old entries
  pruneHistory(history);

  // Save
  ensureDataDir();
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function pruneHistory(history) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const [id, timestamp] of Object.entries(history.seen_tweet_ids)) {
    if (new Date(timestamp).getTime() < cutoff) {
      delete history.seen_tweet_ids[id];
    }
  }

  for (const [url, timestamp] of Object.entries(history.seen_urls)) {
    if (new Date(timestamp).getTime() < cutoff) {
      delete history.seen_urls[url];
    }
  }
}

function extractUrlsSimple(text) {
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return (matches || []).filter(u => !u.includes("x.com") && !u.includes("twitter.com"));
}
