#!/usr/bin/env node

/**
 * OnPrediction Twitter Scanner
 *
 * Usage:
 *   node scripts/scanner/scan.mjs                   # Keywords only (default), last 12h
 *   node scripts/scanner/scan.mjs --with-accounts   # Also scan watched accounts
 *   node scripts/scanner/scan.mjs --dry-run         # Skip AI, show candidates by engagement
 *   node scripts/scanner/scan.mjs --since 24h       # Look back 24 hours
 *   node scripts/scanner/scan.mjs --since 7d        # Look back 7 days
 *   node scripts/scanner/scan.mjs --accounts-only   # Only check watched accounts (no keywords)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { getAccountTweets, searchTweets, closeClient } from "./lib/twitter-client.mjs";
import { filterTweets, deduplicateByUrl } from "./lib/heuristic-filter.mjs";
import { loadHistory, getSeenIds, updateHistory } from "./lib/dedup.mjs";
import { rankCandidates } from "./lib/ai-ranker.mjs";
import { printResults, saveMarkdown } from "./lib/output.mjs";

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

// --- Parse CLI args ---
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const withAccounts = args.includes("--with-accounts");
const accountsOnly = args.includes("--accounts-only");
// Default: keywords only. Use --with-accounts to add account scanning.
const scanAccounts = withAccounts || accountsOnly;
const scanKeywords = !accountsOnly;

let lookbackHours = null;
const sinceIdx = args.indexOf("--since");
if (sinceIdx !== -1 && args[sinceIdx + 1]) {
  lookbackHours = parseDuration(args[sinceIdx + 1]);
}

// --- Load config ---
const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));
if (!lookbackHours) lookbackHours = config.scan.default_lookback_hours || 12;

const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
  .toISOString().slice(0, 10);

// --- Main ---
async function main() {
  console.log(`OnPrediction Scanner starting...`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no AI)" : "FULL SCAN"}`);
  console.log(`Lookback: ${lookbackHours}h (since ${sinceDate})`);
  console.log("");

  const history = loadHistory();
  const seenIds = getSeenIds(history);
  let allTweets = [];

  // 1. Fetch from watched accounts (batched, 10 concurrent) — opt-in
  if (scanAccounts) {
    console.log(`Fetching from ${config.accounts.length} watched accounts...`);
    const accountResults = await batchAsync(config.accounts, 10, async (account) => {
      try {
        const tweets = await getAccountTweets(account.handle, sinceDate);
        for (const t of tweets) t.account_priority = account.priority;
        if (tweets.length > 0) {
          process.stdout.write(`  @${account.handle}: ${tweets.length} tweets\n`);
        }
        return tweets;
      } catch (err) {
        console.error(`  @${account.handle}: ERROR - ${err.message}`);
        return [];
      }
    });
    allTweets.push(...accountResults.flat());
    console.log("");
  }

  // 2. Search keywords (batched, 5 concurrent) — default
  if (scanKeywords) {
    console.log(`Searching ${config.search_keywords.length} keywords...`);
    const keywordResults = await batchAsync(config.search_keywords, 5, async (keyword) => {
      try {
        const tweets = await searchTweets(keyword, sinceDate);
        if (tweets.length > 0) {
          process.stdout.write(`  "${keyword}": ${tweets.length} tweets\n`);
        }
        return tweets;
      } catch (err) {
        console.error(`  "${keyword}": ERROR - ${err.message}`);
        return [];
      }
    });
    allTweets.push(...keywordResults.flat());
    console.log("");
  }

  // 3. Deduplicate by tweet ID
  const uniqueMap = new Map();
  for (const tweet of allTweets) {
    if (!uniqueMap.has(tweet.id)) {
      uniqueMap.set(tweet.id, tweet);
    }
  }
  const uniqueTweets = [...uniqueMap.values()];
  const rawCount = uniqueTweets.length;
  console.log(`Total unique tweets: ${rawCount}`);

  // 4. Heuristic filtering
  let candidates = filterTweets(uniqueTweets, config.heuristic_filters, seenIds);
  candidates = deduplicateByUrl(candidates);
  console.log(`After heuristic filtering: ${candidates.length} candidates`);

  // 5. AI ranking or dry-run sort
  let results;
  if (dryRun) {
    // In dry-run mode, sort by engagement and take top N
    results = candidates
      .sort((a, b) => (b.metrics.likes + b.metrics.retweets) - (a.metrics.likes + a.metrics.retweets))
      .slice(0, config.ai_ranking.top_n_results || 5);
  } else {
    console.log(`Sending ${candidates.length} candidates to Claude for ranking...`);
    results = await rankCandidates(candidates, config.ai_ranking);
  }

  // 6. Output
  const stats = {
    accounts: scanAccounts ? config.accounts.length : 0,
    keywords: scanKeywords ? config.search_keywords.length : 0,
    raw: rawCount,
    filtered: candidates.length,
    lookbackHours
  };

  printResults(results, stats, dryRun);
  const mdPath = saveMarkdown(results, stats, dryRun);
  console.log(`Scan saved to: ${mdPath}`);

  // 7. Update history
  updateHistory(history, uniqueTweets, results);
  console.log(`History updated (${Object.keys(history.seen_tweet_ids).length} total seen tweets)`);

  // Cleanup
  await closeClient();
}

main().catch(err => {
  console.error("Scanner failed:", err);
  closeClient().catch(() => {});
  process.exit(1);
});

// --- Helpers ---

function parseDuration(str) {
  const match = str.match(/^(\d+)(h|d)$/);
  if (!match) {
    console.error(`Invalid duration: ${str} (use e.g. 12h, 24h, 7d)`);
    process.exit(1);
  }
  const num = parseInt(match[1]);
  return match[2] === "d" ? num * 24 : num;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process items in concurrent batches.
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max concurrent tasks
 * @param {Function} fn - Async function to apply to each item
 * @returns {Array} Results in original order
 */
async function batchAsync(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
