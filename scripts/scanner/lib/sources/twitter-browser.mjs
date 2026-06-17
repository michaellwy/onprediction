/**
 * Twitter/X content source that uses Firecrawl v2 API to search and scrape
 * X.com content without a paid API or headless browser.
 *
 * Replaces the old agent-browser approach which blocked the Node event loop
 * with execFileSync and required a saved X login session.
 *
 * Uses Firecrawl's free tier (no API key needed for v2 endpoints).
 *
 * Reads config from config.json sources.twitter_browser:
 *   - search_queries: array of search queries
 *   - max_tweets_per_query: cap per query (default 20)
 *   - lookback_hours: filter by recency (default 24)
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIRECRAWL_HOST = "api.firecrawl.dev";
const FIRECRAWL_PATH = "/v2";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

let _config = null;

function getConfig() {
  if (!_config) {
    _config = JSON.parse(
      readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
    );
  }
  return _config;
}

function getTwitterConfig() {
  const cfg = getConfig();
  return (cfg.sources && cfg.sources.twitter_browser) || {};
}

// ---------------------------------------------------------------------------
// HTTPS request helper (avoids Node fetch bugs in module context)
// ---------------------------------------------------------------------------

function httpsRequest(method, pathname, bodyData, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = bodyData ? JSON.stringify(bodyData) : null;
    const apiKey = process.env.FIRECRAWL_API_KEY;

    const options = {
      hostname: FIRECRAWL_HOST,
      path: FIRECRAWL_PATH + pathname,
      method,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: timeoutMs || 15000,
    };

    if (apiKey) {
      options.headers["Authorization"] = `Bearer ${apiKey}`;
    }

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Firecrawl API helpers
// ---------------------------------------------------------------------------

/**
 * Search Firecrawl for X.com content matching a query.
 */
async function firecrawlSearch(searchQuery, limit) {
  const { status, body } = await httpsRequest("POST", "/search", {
    query: `site:x.com ${searchQuery}`,
    limit: Math.min(limit, 20),
  });

  if (status !== 200) {
    const msg = typeof body === "object" ? JSON.stringify(body) : String(body);
    throw new Error(`Firecrawl search returned ${status}: ${msg}`);
  }

  return (body.data && body.data.web) || [];
}

/**
 * Scrape an individual X.com tweet URL via Firecrawl to get
 * structured markdown with author, timestamp, likes, retweets.
 */
async function firecrawlScrape(tweetUrl) {
  try {
    const { status, body } = await httpsRequest("POST", "/scrape", {
      url: tweetUrl,
    }, 20000);

    if (status !== 200) return null;
    return body.data || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse Firecrawl scrape markdown into a structured tweet object.
 * Expected format from v2/scrape:
 *
 *   # Post by @author
 *   Author: display-name @handle
 *   Posted: 2026-06-17T12:06:53.000Z
 *   URL: https://x.com/user/status/123
 *   Likes: 266 | Retweets: 11
 *
 *   ## Post
 *   tweet text here
 */
function parseTweetScrape(scrapeData) {
  if (!scrapeData || !scrapeData.markdown) return null;

  const md = scrapeData.markdown;

  // Extract tweet ID from URL
  const urlMatch = md.match(/URL:\s*(https?:\/\/[^\s]+)/);
  const url = urlMatch ? urlMatch[1].replace(/\\/g, "") : "";

  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) return null;
  const tweetId = idMatch[1];

  // Author handle
  const authorMatch = md.match(/@(\w+)/);
  const handle = authorMatch ? authorMatch[1] : "";

  // Timestamp
  const tsMatch = md.match(/Posted:\s*([^\n]+)/);
  const publishedAt = tsMatch ? tsMatch[1].trim() : null;

  // Engagement
  const likesMatch = md.match(/Likes:\s*([\d,.]+)/);
  const retweetsMatch = md.match(/Retweets:\s*([\d,.]+)/);
  const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) || 0 : 0;
  const retweets = retweetsMatch ? parseInt(retweetsMatch[1].replace(/,/g, "")) || 0 : 0;

  // Tweet text — everything under "## Post" or "## Post\n\n" block
  const textMatch = md.match(/## Post\n+([\s\S]*)/);
  let text = textMatch ? textMatch[1].trim() : "";

  // Clean up escaped characters from Firecrawl's markdown
  text = text.replace(/\\([#_*[\]()])/g, "$1");

  // Remove trailing junk (suggested follows, sign-up prompts)
  const junkIdx = text.search(/\n\nSee new posts|Sign up|Get the app/i);
  if (junkIdx > 0) text = text.slice(0, junkIdx).trim();

  return {
    id: tweetId,
    author: handle,
    text: text,
    url: url,
    likes: likes,
    retweets: retweets,
    publishedAt: publishedAt,
  };
}

/**
 * Parse tweet data from a Firecrawl search result as fallback.
 */
function parseSearchResult(item) {
  const url = item.url || "";
  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) return null;

  const handleMatch = url.match(/x\.com\/(\w+)\/status/);
  const author = handleMatch ? handleMatch[1] : "";

  return {
    id: idMatch[1],
    author: author,
    text: item.description || "",
    url: url,
    likes: 0,
    retweets: 0,
    publishedAt: null,
  };
}

// ---------------------------------------------------------------------------
// ContentItem builder (matches existing scanner interface)
// ---------------------------------------------------------------------------

function buildContentItem(tweet) {
  let title = tweet.text ? tweet.text.split("\n")[0].slice(0, 120).trim() : "";
  let text = (tweet.text || "").slice(0, 500);

  return {
    id: tweet.id,
    title: title,
    url: tweet.url,
    author: tweet.author
      ? tweet.author.indexOf("@") === 0
        ? tweet.author
        : "@" + tweet.author
      : "",
    text: text,
    published_at: tweet.publishedAt,
    source_type: "twitter",
    source_name: "Twitter",
    engagement: {
      likes: tweet.likes || 0,
      shares: tweet.retweets || 0,
      comments: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetch tweets from X.com via Firecrawl v2 API.
 *
 * For each search query:
 *   1. Search Firecrawl for X.com content
 *   2. Filter to individual tweet URLs (/status/)
 *   3. Scrape each tweet for full content
 *   4. Fall back to search result data if scraping fails
 *   5. Filter by lookback_hours and cap at max_tweets_per_query
 *
 * Never throws. Returns an array of ContentItem objects (possibly empty).
 *
 * @returns {Promise<Array>} Array of ContentItem objects
 */
export async function fetchTwitterBrowser() {
  const cfg = getTwitterConfig();
  const queries = cfg.search_queries || [];
  const maxPerQuery = cfg.max_tweets_per_query ?? 20;
  const lookbackHours = cfg.lookback_hours ?? 24;

  if (!queries.length) {
    console.warn(
      "[twitter-firecrawl] No search_queries configured in config.json sources.twitter_browser"
    );
    return [];
  }

  const cutoff = new Date(Date.now() - lookbackHours * 3600000);
  const allItems = [];
  const seenIds = new Set();
  let rateLimited = false;

  for (const query of queries) {
    if (allItems.length >= maxPerQuery) break;

    let results;
    try {
      results = await firecrawlSearch(query, maxPerQuery * 2);
      console.warn(
        `[twitter-firecrawl] Query "${query}": ${results.length} search results`
      );
    } catch (err) {
      console.warn(`[twitter-firecrawl] Search failed for "${query}": ${err.message}`);
      if (err.message.includes("429") || err.message.includes("rate limit") || err.message.includes("today's limit")) {
        rateLimited = true;
      }
      continue;
    }

    // Filter to individual tweet URLs (/status/)
    const tweetUrls = results
      .map((r) => r.url || "")
      .filter((u) => u.includes("/status/"))
      .slice(0, maxPerQuery);

    console.warn(
      `[twitter-firecrawl] Query "${query}": ${tweetUrls.length} tweet URLs to scrape`
    );

    // Scrape individual tweets for rich data
    const resultsMap = new Map(results.map((r) => [r.url, r]));
    const scrapePromises = tweetUrls.map(async (url) => {
      try {
        const scrapeData = await firecrawlScrape(url);
        const parsed = parseTweetScrape(scrapeData);
        if (parsed) return parsed;

        // Fallback to search result data
        const searchItem = resultsMap.get(url);
        return searchItem ? parseSearchResult(searchItem) : null;
      } catch {
        const searchItem = resultsMap.get(url);
        return searchItem ? parseSearchResult(searchItem) : null;
      }
    });

    const scrapedTweets = (await Promise.all(scrapePromises)).filter(Boolean);

    // Build ContentItems with dedup + lookback filter
    for (const tweet of scrapedTweets) {
      if (seenIds.has(tweet.id)) continue;
      if (allItems.length >= maxPerQuery) break;

      if (tweet.publishedAt) {
        const published = new Date(tweet.publishedAt);
        if (!isNaN(published.getTime()) && published < cutoff) continue;
      }

      seenIds.add(tweet.id);
      allItems.push(buildContentItem(tweet));
    }
  }

  if (rateLimited) {
    console.warn(
      `[twitter-firecrawl] Firecrawl free tier rate limit reached. ` +
      `Set FIRECRAWL_API_KEY in .env.local for 1000 free credits/month with higher rate limits. ` +
      `Get one at https://firecrawl.dev`
    );
  }

  console.warn(`[twitter-firecrawl] Total: ${allItems.length} items`);
  return allItems;
}
