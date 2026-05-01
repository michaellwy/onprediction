/**
 * Twitter/X content source using OpenCLI's built-in Twitter adapter.
 * Intercepts Twitter's GraphQL API responses through the user's logged-in
 * Chrome session — no API keys, no scraping, no rate limits.
 *
 * Priority: X Articles > tweets linking to external content > text-only tweets (skip)
 *
 * Requires: OpenCLI installed + Chrome extension connected.
 * Falls back gracefully when unavailable.
 */

import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NODE22 = "/Users/michaelli/.nvm/versions/node/v22.22.1/bin/node";
const OPENCLI = "/Users/michaelli/.nvm/versions/node/v22.22.1/bin/opencli";

function runOpenCLI(args) {
  let stdout;
  try {
    stdout = execFileSync(NODE22, [OPENCLI, ...args], {
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    }).toString();
  } catch (err) {
    const stderr = err.stderr?.toString() || "";
    if (stderr && !stderr.includes("no results") && !stderr.includes("0 tweets")) {
      console.warn(`[opencli] ${args.join(" ")}: ${stderr.slice(0, 120)}`);
    }
    return [];
  }
  if (!stdout.trim()) return [];
  try {
    const parsed = yaml.load(stdout);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && parsed.ok === false) return [];
    return parsed ? [parsed] : [];
  } catch {
    return [];
  }
}

/**
 * Extract external URLs from tweet text (not x.com/t.co links).
 */
function extractExternalUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return matches.filter(u =>
    !u.includes("x.com") &&
    !u.includes("twitter.com") &&
    !u.includes("t.co")
  );
}

/**
 * Check if a tweet appears to be an X Article / long-form note.
 */
function isXArticle(tweet) {
  // X Articles have very long text (OpenCLI already extracts note_tweet full text)
  return (tweet.text || "").length > 500;
}

/**
 * Fetch full X Article content.
 */
function fetchArticle(tweetId) {
  const result = runOpenCLI(["twitter", "article", tweetId]);
  if (result.length > 0) {
    return {
      title: result[0].title || "",
      content: result[0].content || "",
      author: result[0].author || ""
    };
  }
  return null;
}

function buildContentItem(tweet, article) {
  const author = tweet.author || article?.author || "unknown";
  const isArticle = !!article;

  return {
    id: String(tweet.id || ""),
    title: article?.title || (tweet.text || "").split("\n")[0].slice(0, 120),
    url: tweet.url || `https://x.com/${author}/status/${tweet.id}`,
    author,
    text: article?.content || tweet.text || "",
    published_at: tweet.created_at || "",
    source_type: "twitter",
    source_name: isArticle ? "X Article" : "Twitter",
    account_priority: null,
    engagement: {
      likes: tweet.likes || 0,
      shares: tweet.retweets || 0,
      comments: tweet.replies || 0
    }
  };
}

/**
 * Fetch tweets from a specific account's timeline.
 */
function fetchAccountTimeline(handle, maxTweets = 10) {
  const raw = runOpenCLI(["twitter", "tweets", handle, "--limit", String(maxTweets)]);
  return raw.filter(t => t.id && t.text);
}

export async function fetchTwitterOpenCLI() {
  try {
    execFileSync(NODE22, [OPENCLI, "doctor"], {
      timeout: 10_000,
      stdio: "ignore"
    });
  } catch {
    console.warn("[twitter-opencli] OpenCLI unavailable — skipping Twitter search.");
    return [];
  }

  const config = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
  );
  const sourceConfig = config.sources?.twitter_browser;
  if (!sourceConfig?.search_queries) {
    console.warn("[twitter-opencli] No search_queries configured");
    return [];
  }

  const seen = new Set();
  const xArticles = [];
  const linkTweets = [];

  // ── Search queries ──────────────────────────────────────────────
  const queries = sourceConfig.search_queries;
  for (const query of queries) {
    const raw = searchTwitter(query, sourceConfig.max_tweets_per_query || 20);
    for (const tweet of raw) {
      if (seen.has(tweet.id)) continue;
      seen.add(tweet.id);

      if (isXArticle(tweet)) {
        console.log(`  [opencli] X Article: ${tweet.id} by @${tweet.author} (${(tweet.text||"").length} chars)`);
        const article = fetchArticle(tweet.id);
        xArticles.push(buildContentItem(tweet, article));
        continue;
      }

      const urls = extractExternalUrls(tweet.text || "");
      if (urls.length > 0) {
        linkTweets.push(buildContentItem(tweet, null));
      }
    }
  }

  // ── Account timelines (high + medium priority) ──────────────────
  const accounts = (config.accounts || []).filter(a => a.priority === "high" || a.priority === "medium");
  let accountCount = 0;
  for (const account of accounts) {
    const tweets = fetchAccountTimeline(account.handle, 10);
    for (const tweet of tweets) {
      if (seen.has(tweet.id)) continue;
      seen.add(tweet.id);

      if (isXArticle(tweet)) {
        console.log(`  [opencli] Account X Article: ${tweet.id} by @${tweet.author} (${(tweet.text||"").length} chars)`);
        const article = fetchArticle(tweet.id);
        const item = buildContentItem(tweet, article);
        item.account_priority = account.priority;
        xArticles.push(item);
        continue;
      }

      const urls = extractExternalUrls(tweet.text || "");
      if (urls.length > 0) {
        const item = buildContentItem(tweet, null);
        item.account_priority = account.priority;
        linkTweets.push(item);
      }
    }
    accountCount++;
  }
  if (accountCount > 0) {
    console.log(`  twitter-opencli: scraped ${accountCount} accounts`);
  }

  // Cap: max 10 X Articles, max 10 link tweets
  const result = [...xArticles.slice(0, 10), ...linkTweets.slice(0, 10)];

  console.log(`  twitter-opencli: ${xArticles.length} X Articles + ${linkTweets.length} link tweets → ${result.length} kept`);
  return result;
}

function searchTwitter(query, limit) {
  const raw = runOpenCLI(["twitter", "search", query, "--filter", "live", "--limit", String(limit)]);
  return raw.filter(t => t.id && t.text);
}
