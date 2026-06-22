/**
 * Twitter/X content source that uses Firecrawl v2 API to search and scrape
 * X.com content without a paid API or headless browser.
 *
 * Replaces the old agent-browser approach which blocked the Node event loop
 * with execFileSync and required a saved X login session.
 *
 * Falls back to DuckDuckGo via ddgs Python library when Firecrawl is rate-limited.
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
import { execFileSync } from "child_process";

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
// DuckDuckGo search via ddgs Python library (no API key, works from VPS)
// ---------------------------------------------------------------------------

/**
 * Fallback search using ddgs Python library when Firecrawl is rate-limited.
 * Spawns python3 with the ddgs library and returns parsed JSON results.
 */
async function ddgsSearch(searchQuery, limit) {
  // Escape single-quotes in the query for the shell-heredoc-style inline script
  const safeQuery = searchQuery.replace(/'/g, "'\\''");
  const script = [
    "import sys, json;",
    "from ddgs import DDGS;",
    "try:",
    "  with DDGS() as ddgs:",
    `    results = list(ddgs.text('site:x.com ${safeQuery}', max_results=${limit}));`,
    "    out = [];",
    '    for r in results:',
    "      url = r.get('link', r.get('href', ''));",
    "      if '/status/' in url:",
    "        out.append({'url': url, 'title': r.get('title', ''), 'description': r.get('body', '')});",
    "    print(json.dumps(out));",
    "except Exception as e:",
    "    print(json.dumps({'error': str(e)}));",
    "    sys.exit(1);",
  ].join("\n");

  try {
    const result = execFileSync("python3", ["-c", script], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
    });
    const parsed = JSON.parse(result.trim());
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  } catch (err) {
    throw new Error(`ddgs search failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Twitter Snowflakes encode the creation time in bits 22+.
 * Epoch: 2010-11-04T01:42:54.657Z (1288834974657 ms).
 * Decoding is reliable, requires zero API calls, and works for any tweet.
 */
const TWITTER_EPOCH = 1288834974657;

function snowflakeToDate(tweetId) {
  const id = BigInt(tweetId);
  return new Date(Number(id >> 22n) + TWITTER_EPOCH);
}

/**
 * Derive a tweet's publishedAt from the Snowflake ID when the API/source
 * didn't provide one. Returns ISO string or null if the ID isn't parseable.
 */
function derivePublishedAt(tweetId) {
  try {
    const d = snowflakeToDate(tweetId);
    if (isNaN(d.getTime())) return null;
    // Sanity: tweets older than 2010 or in the future indicate a bad ID
    if (d.getTime() < TWITTER_EPOCH || d.getTime() > Date.now() + 86400000) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

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

  // Timestamp — fall back to Snowflake ID if Firecrawl scrape omitted it
  const tsMatch = md.match(/Posted:\s*([^\n]+)/);
  const publishedAt = tsMatch ? tsMatch[1].trim() : derivePublishedAt(tweetId);

  // Engagement
  const likesMatch = md.match(/Likes:\s*([\d,.]+)/);
  const retweetsMatch = md.match(/Retweets:\s*([\d,.]+)/);
  const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) || 0 : 0;
  const retweets = retweetsMatch ? parseInt(retweetsMatch[1].replace(/,/g, "")) || 0 : 0;

  // Tweet text — everything under "## Post" or "## Post\n\n" block
  const textMatch = md.match(/## Post\n+([\s\S]*)/);
  let text = textMatch ? textMatch[1].trim() : "";

  // Clean up escaped characters from Firecrawl's markdown
  text = text.replace(/\\([#_*\[\]()])/g, "$1");

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

  // Try to extract date from search result metadata, then fall back to
  // snowflake ID decoding (reliable, zero API calls).
  let publishedAt = null;
  if (item.date) {
    publishedAt = item.date;
  } else if (item.description) {
    // X search results often include "Posted: ..." or similar in description
    const dateMatch = item.description.match(/Posted:\s*([^\n]+)/i);
    if (dateMatch) publishedAt = dateMatch[1].trim();
  }
  // Fallback: decode Snowflake ID — works regardless of source
  if (!publishedAt) {
    publishedAt = derivePublishedAt(idMatch[1]);
  }

  return {
    id: idMatch[1],
    author: author,
    text: item.description || "",
    url: url,
    likes: 0,
    retweets: 0,
    publishedAt: publishedAt,
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
 * Fetch tweets from X.com via Firecrawl v2 API with ddgs fallback.
 *
 * For each search query:
 *   1. Search Firecrawl for X.com content
 *   2. On 429 / rate limit, fall back to ddgs (DuckDuckGo via Python)
 *   3. Filter to individual tweet URLs (/status/)
 *   4. Scrape each tweet for full content (Firecrawl only)
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
    let usedFallback = false;
    try {
      results = await firecrawlSearch(query, maxPerQuery * 2);
      console.warn(
        `[twitter-firecrawl] Query "${query}": ${results.length} search results`
      );
    } catch (err) {
      console.warn(`[twitter-firecrawl] Search failed for "${query}": ${err.message}`);
      if (err.message.includes("429") || err.message.includes("rate limit") || err.message.includes("today's limit")) {
        rateLimited = true;
        // Fallback to ddgs (DuckDuckGo via Python library)
        console.warn(`[twitter-firecrawl] Falling back to ddgs for "${query}"`);
        try {
          results = await ddgsSearch(query, maxPerQuery * 2);
          usedFallback = true;
          console.warn(
            `[twitter-firecrawl] ddgs fallback for "${query}": ${results.length} results`
          );
        } catch (ddgsErr) {
          console.warn(`[twitter-firecrawl] ddgs fallback also failed for "${query}": ${ddgsErr.message}`);
          continue;
        }
      } else {
        continue;
      }
    }

    // Filter to individual tweet URLs (/status/)
    const tweetUrls = results
      .map((r) => r.url || "")
      .filter((u) => u.includes("/status/"))
      .slice(0, maxPerQuery);

    console.warn(
      `[twitter-firecrawl] Query "${query}": ${tweetUrls.length} tweet URLs to scrape`
    );

    // Scrape individual tweets for rich data (skip when using ddgs fallback — no Firecrawl credits left)
    const resultsMap = new Map(results.map((r) => [r.url, r]));
    let scrapedTweets;
    if (usedFallback) {
      // ddgs only gives us URL, title, and description snippet — no rich engagement data.
      // Use Snowflake ID decoding to derive the true timestamp instead of stamping "now".
      scrapedTweets = tweetUrls.map((url) => {
        const searchItem = resultsMap.get(url);
        const parsed = searchItem ? parseSearchResult(searchItem) : null;
        if (parsed && !parsed.publishedAt) {
          parsed.publishedAt = derivePublishedAt(parsed.id);
        }
        if (parsed) return parsed;
        // Minimal stub from just the URL
        const idMatch = url.match(/\/status\/(\d+)/);
        const handleMatch = url.match(/x\.com\/(\w+)\/status/);
        if (!idMatch) return null;
        return {
          id: idMatch[1],
          author: handleMatch ? handleMatch[1] : "",
          text: (searchItem && searchItem.title) || "",
          url,
          likes: 0,
          retweets: 0,
          publishedAt: derivePublishedAt(idMatch[1]),
        };
      }).filter(Boolean);
    } else {
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
      scrapedTweets = (await Promise.all(scrapePromises)).filter(Boolean);
    }

    // Build ContentItems with dedup + lookback filter
    for (const tweet of scrapedTweets) {
      if (seenIds.has(tweet.id)) continue;
      if (allItems.length >= maxPerQuery) break;

      // Must have a valid published date within lookback window
      if (!tweet.publishedAt) continue;
      const published = new Date(tweet.publishedAt);
      if (isNaN(published.getTime()) || published < cutoff) continue;

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
